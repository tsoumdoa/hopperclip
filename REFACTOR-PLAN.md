# Refactor plan — dissolving `src/app/`

Companion to `STRUCTURE-REPORT.html`. That file explains *why*; this one is the *what*, in
execution order.

**Root cause:** this is a Next.js App Router tree migrated to TanStack Start where the old tree
was never dissolved. `src/routes/` is the real router; `src/app/` is a fossil holding every
component, hook, and util, still organized by Next.js conventions.

**Target:** routes are thin, features are self-contained, and `shared` means *literally used by
2+ features*.

```
src/
├── routes/            # the ONLY place a page is defined
├── features/
│   ├── gh-flow/       # the graph renderer — promoted out of duckerweb
│   ├── gh-cards/      # the snippet library
│   ├── duckerweb/     # the local viewer (now just one gh-flow consumer)
│   ├── share/
│   └── landing/
├── components/
│   ├── ui/            # shadcn, untouched
│   └── header.tsx footer.tsx drop-overlay.tsx
├── lib/               # ONE utils home
├── server/
├── types.ts
└── styles/
```

---

## Ground rules

These are what make the PR split work. Violating them is how the refactor turns into an
unreviewable mess.

1. **Never mix a rename with a content edit in the same commit.** Git only detects a rename at
   high similarity. Move a file and rewrite its imports together and `git log --follow` loses the
   thread, and the diff reads as 200 added lines instead of `renamed:`. Within a PR: commit the
   moves, *then* commit the import rewrites.
2. **No behavior changes in PRs 1–4.** Those are moves and deletions only. All real logic
   changes are quarantined in PR 5, so if something breaks at runtime you know where to look.
3. **`lib/` and `components/` may never import from `features/`.** The shared layer is a leaf.
   This is the rule that stops the current mess from re-forming — it is exactly what
   `components/gh-flow-view.tsx` violates today.
4. **Typecheck passing ≠ working.** TanStack file-routing regenerates `routeTree.gen.ts` and
   Convex has its own codegen. After each PR: `pnpm check` *and* click through
   `/`, `/ghcards`, `/share?token=…`, `/duckerweb`.
5. **Verify against the import graph, not memory.** Before declaring a file "shared", check who
   actually reaches it.

---

## PR 1 — Delete the migration fossils

**Risk:** none. Pure deletion. **Behavior change:** none.

- [ ] Strip `"use client"` from all 25 files. It is a Next.js directive and a **no-op** in
      TanStack Start — it currently reads as meaningful ("this is a client component") and isn't.
      ```
      app/components/{add-gh-card,gh-card-normal-buttons,gh-card,gh-page-file-drop-layer,metrics-dialog}.tsx
      app/duckerweb/components/{GHFlowCanvas,GHJsonView}.tsx
      app/duckerweb/page.tsx
      app/ghcards/components/{filter,gh-card-display,shortcut-hint,sort-drop-down,user-tag-display,user-tags}.tsx
      app/ghcards/contexts/gh-cards-page-context.tsx
      app/share/components/{share-card,share-view}.tsx
      components/ui/{alert-dialog,dialog,dropdown-menu,sonner,tabs,toggle,tooltip}.tsx
      routes/_authed/ghcards.tsx
      ```
- [ ] Delete `app/duckerweb/components/PasteButton.tsx` — zero importers, unreachable from any
      route.
- [ ] Delete the `.next/` directory (left over from the old framework).
- [ ] Untrack + gitignore `tsconfig.tsbuildinfo` (1.1 MB) and `.DS_Store` (18 KB).
- [ ] **Collapse the 5 route shims.** Each is a 2–9 line file that imports a `page.tsx` from
      `src/app/` and re-exports it. Move the page body into the route file:

      | Delete | Move body into |
      |---|---|
      | `app/privacy/page.tsx` | `routes/_static/privacy.tsx` |
      | `app/terms-of-service/page.tsx` | `routes/_static/terms-of-service.tsx` |
      | `app/duckerweb/page.tsx` | `routes/_static/duckerweb.tsx` |
      | `app/dev/flow-gallery.tsx` | `routes/dev/flow-gallery.tsx` |

- [ ] Consider deleting `routes/_static.tsx` — it is a pass-through `<Outlet/>` that adds no
      behavior. Keeping it is fine if you like the grouping; note that
      `lib/static-pages.ts` already duplicates what the folder encodes (`/` is in that list but
      is *not* under `_static`, so the two can silently drift).
- [ ] Rename `src/env.js` → `src/env.ts`. It is the only `.js` file in a strict-TS codebase.

---

## PR 2 — One `lib/`

**Risk:** none. Path-only. **Behavior change:** none.

Today there are **four** places a utility can live, separated by no rule at all. Collapse to one.

| From | To |
|---|---|
| `src/app/utils/gh-xml.ts` | `src/lib/gh/xml.ts` |
| `src/app/utils/gh-file.ts` | `src/lib/gh/file.ts` |
| `src/app/utils/gh-binary.ts` | `src/lib/gh/binary.ts` |
| `src/app/hooks/use-native-gh-xml-paste.ts` | `src/lib/gh/use-native-gh-xml-paste.ts` |
| `src/app/utils/gzip.ts` | `src/lib/gzip.ts` |
| `src/app/utils/date-format.ts` | `src/lib/date-format.ts` |
| `src/app/utils/file-drag.ts` | `src/lib/file-drag.ts` |
| `src/app/hooks/use-modifier-key-label.ts` | `src/lib/use-modifier-key-label.ts` |
| `src/utils/generage-shareable-link-uid.ts` | `src/lib/share-link-uid.ts` *(also fixes the typo — "generage")* |
| `src/utils/utils.ts` (`bucketUrl`) | `src/server/bucket-url.ts` |
| `src/app/utils/gh-card-edit-state.ts` | → `features/gh-cards/` in PR 4 |

Also in this PR:

- [ ] **`bucketUrl` deserves attention.** It is 4 lines in a file named `utils/utils`, reads
      `process.env.R2_URL!` directly while everything else uses the validated `@/env`, is
      **server-only**, and is imported by *both* `src/server/r2-storage.ts` and
      `convex/ghInternalQuery.ts` — i.e. Convex reaching up into `src/`. Move it to
      `src/server/bucket-url.ts` and switch it to `@/env`. Decide whether Convex should keep its
      own local copy rather than importing across the workspace boundary (recommended — it's 4
      lines, and the cross-boundary import is worse than the duplication).
- [ ] Delete the now-empty `src/utils/`.
- [ ] `src/types/gh-card.ts` is *prop types for four specific components*, which is why those
      components' props live three directories away. Leave it for PR 4, where the props move
      next to their components.

---

## PR 3 — Promote `features/gh-flow/`

**Risk:** medium. Renames + import rewrites. **Behavior change:** none.

**This is the finding the report undersold.** The flow renderer is not a duckerweb feature — it
is a shared capability parked inside one. Four routes reach into duckerweb's internals today,
13 imports in total:

```
components/gh-flow-view.tsx   → duckerweb/components/GHFlowCanvas, types/type
components/metrics-dialog.tsx → duckerweb/types/type
components/add-gh-dialog.tsx  → duckerweb/gh-flow-generator (createFlowPreview)
hooks/use-script-metrics.ts   → duckerweb/gh-flow-generator, types/type
share/ (4 files)              → duckerweb/gh-flow-generator, types/type
dev/flow-gallery*             → duckerweb/GHFlowCanvas, types/type
```

Doing this **before** PR 4 matters: gh-cards imports the renderer, so promoting it first means
PR 4's files land already pointing at their final home instead of being rewritten twice.

### Moves into `features/gh-flow/`

- **`components/`** — `GHFlowCanvas`, all 11 `GH*Node` files, `GHEdge`, `Handle`,
  `HandlePosition`, `PortOptions`, `constants.ts`
- **`lib/`** — `node-generator`, `edge-generator`, `component-handler`, `group-handler`,
  `node-classifier`, `node-positions`, `value-extractor`, `grasshopper-color`, `runtime-palette`
- **`flow-generator.ts`** — from `duckerweb/gh-flow-generator.ts` (`generateFlowData`,
  `createFlowPreview`)
- **`gh-flow-view.tsx`** — from `components/gh-flow-view.tsx`. It moves *here*, not to
  `components/`, because it depends on the canvas — which resolves the ground-rule-3 violation.

### Stays in `features/duckerweb/`

`page`/route body, `DuckerwebMainZone`, `XmlPasteArea`, `ViewControls`, `GHJsonView`,
`GHDiffView`, `ComponentList`, `ComponentCard`, `use-duckerweb-state`, `use-markdown-export`,
`gh-diff.ts`, `lib/gh-diff/*`.

### The fiddly part: splitting `types/type.ts`

That one 336-line file mixes two concerns. Split it:

| → `features/gh-flow/types.ts` | → `features/duckerweb/types.ts` |
|---|---|
| `GHNodeType`, `GHNodeData`, `GHNode`, `Port`, `Bounds`, `ParsedComponent` | `DuckerwebState`, `DuckerwebImportResult`, `DuckerwebMainZoneProps`, `XmlPasteAreaProps` |
| `GHFlowCanvasProps`, `GHFlowCanvasFocus`, all `GH*NodeProps`, `GHEdgeProps` | `GHDiffStatus`, `GHDiffMatchMode`, `GHComponentDiff`, `GHDiffResult` |
| `GHHandleProps`, `GHHandlePositionProps`, `HandleVariant`, `HandleSide`, `HandlePortType` | `ViewControlsProps`, `ViewTab` |
| `ScriptData`, `GHScribbleData`, `GHValueListItem` | |

**Decision needed on `ViewMode`.** It is `"list" | "flow" | "diff" | "json"`, but `share/` only
ever uses `"list" | "flow"` — share's tabs are currently typed with duckerweb's superset, which
means share appears to support a diff view it has no code for. Recommendation: let each feature
declare its own union rather than sharing the wide one. It's two short type aliases and it makes
the narrower surface honest.

### Also here

- [ ] Rename duckerweb's + gh-flow's PascalCase files to kebab-case (`GHComponentNode.tsx` →
      `gh-component-node.tsx`). Every other folder in the project is kebab-case; this is the lone
      island. Doing it now rather than as its own PR keeps all the noisy renames in one place —
      but commit it *separately from* the import rewrites (ground rule 1).
- [ ] `types/type.ts` (singular) → `types.ts` (plural), matching the rest of the project.

---

## PR 4 — Extract `features/gh-cards/`

**Risk:** medium. Renames + import rewrites. **Behavior change:** none.

**The main event.** `src/app/components/` and `src/app/hooks/` read as "shared" but the import
graph says **26 of their 29 files are used by `/ghcards` and nothing else.** The feature is split
across two directories with the larger half in the folder named *shared* — which is why you
can't tell where anything lives.

It also cycles: `ghcards/components/gh-card-display` → `components/gh-card` → back into
`ghcards/contexts/gh-cards-page-context`. Extracting the feature dissolves the cycle.

### Move into `features/gh-cards/`

- **`components/`** — `add-gh-card`, `add-gh-dialog`, `add-gh-tag-display`, `gh-card`,
  `gh-card-body`, `gh-card-date-display`, `gh-card-dialog`, `gh-card-edit-buttons`,
  `gh-card-normal-buttons`, `gh-card-tag-display`, `gh-card-tags`, `gh-card-xml-paste`,
  `gh-page-file-drop-layer`, `metrics-dialog`, plus everything already in
  `app/ghcards/components/` (`filter`, `gh-card-display`, `gh-card-skeleton`, `loading-spinner`,
  `shortcut-hint`, `sort-drop-down`, `user-tag-display`, `user-tags`)
- **`hooks/`** — `use-gh-card-control`, `use-validate-name-and-description`, `use-fetch-gh-xml`,
  `use-script-metrics`, `use-drop-zone`, `use-filter`, `use-tag-filters`
- **`gh-cards-context.tsx`** — from `ghcards/contexts/gh-cards-page-context.tsx`
- **`gh-card-edit-state.ts`** — deferred from PR 2
- [ ] Dissolve `src/types/gh-card.ts` — move each prop type next to the component it describes
      (`AddGhDialogProps` → `add-gh-dialog.tsx`, etc.).

### Stays genuinely shared

Only these had 2+ consumers. After PR 4 they are the *entire* shared surface:

| Consumers | File | Home |
|---|---|---|
| 6 routes | `header.tsx` | `components/header.tsx` |
| `/` only | `footer.tsx`, `auth-loading-screen.tsx`, `landing/reveal.tsx` | `features/landing/` |
| `/ghcards` only | `drop-overlay.tsx` | goes with gh-cards |
| — | `providers/PostHogProvider.tsx` | `components/` or keep as `providers/` |

- [ ] Delete `src/app/` once empty. This is the moment the refactor pays off.

---

## PR 5 — Deduplicate

**Risk:** the only PR with real logic changes. **Test this one properly.**

### 5a. The fetch → decompress → parse → flow pipeline is written three times

| Hook | URL source | Duplicated body |
|---|---|---|
| `use-fetch-gh-xml.ts` | R2 presigned (server fn) | fetch + size check + decompress + decode |
| `use-share-flow-state.ts` | Convex action | ↑ **verbatim** + parse + generateFlowData |
| `use-script-metrics.ts` | via `use-fetch-gh-xml` | parse + generateFlowData + metrics |

`use-share-flow-state` re-implements `use-fetch-gh-xml`'s entire body rather than calling it —
including the `Content-Encoding: gzip` headers, the `MAX_COMPRESSED_GH_XML_BYTES` guard, and the
`TextDecoder`. The **only** real difference is where the presigned URL comes from.

- [ ] Extract `lib/gh/fetch-gh-xml.ts` → `fetchAndParseGhXml(getUrl: () => Promise<string>)`,
      a plain async function taking the URL source as a parameter.
- [ ] Rewrite all three hooks as thin state wrappers over it.
- [ ] Drop `use-fetch-gh-xml`'s `decodedRef` — it is returned but never written to.

### 5b. Three hand-rolled drag-depth counters

`hooks/use-drop-zone.ts`, `duckerweb/components/DuckerwebMainZone.tsx`, and
`components/gh-page-file-drop-layer.tsx` each implement the same `dragDepth` ref pattern.
`use-drop-zone`'s own doc comment says it *"mirrors the drag-depth-counter pattern used by
DuckerWeb's `DuckerwebMainZone`"* — a copy, documented as if it were reuse.

- [ ] Collapse to one hook. Note `gh-page-file-drop-layer` is window-level while the other two
      are element-level, so the hook needs a target option — but the depth logic is identical.

### 5c. Smaller

- [ ] `SORT_ORDERS` and `SortOrderZenum` in `types.ts` declare the same six values twice. The
      file's own comment admits it: *"this is not good idea...duplicating typing with zod"*.
      Derive the enum from the const array.
- [ ] `Fuse.js` is constructed on **every render** in both `use-filter.ts` and
      `use-validate-name-and-description.ts` (no `useMemo`), each with its own near-identical
      `fuseOptions` differing only in `threshold`. Memoize; share the options.
- [ ] `convex/ghCard.ts` is 484 lines — split by concern (posts / sharing / tags).
- [ ] `routes/index.tsx` is 300 lines, ~250 of which are inline sub-components (`CaseCard`,
      `DuckerWebCard`, `Pill`, `BottomFade`). Move them to `features/landing/`.

---

## Sequencing

```
PR 1  delete fossils        ░ none      pure deletion
PR 2  one lib/              ░ none      path-only
PR 3  promote gh-flow       ▓ medium    renames + imports    ← must precede PR 4
PR 4  extract gh-cards      ▓ medium    renames + imports    ← src/app/ dies here
PR 5  deduplicate           █ real      logic — test it
```

**Why not one PR:** ~140 files with heavy renames. Unreviewable as a single diff, and
un-bisectable when something breaks at runtime.

**If you want fewer:** PRs 1 and 2 can merge safely — both are pure moves. PRs 3, 4, and 5 should
stay separate; those are the ones you'd actually want to revert independently.

**Where the payoff lands:** PRs 1–4 are what make the codebase navigable. PR 5 is quality, not
navigability — it can slip without blocking anything.

### After each PR

```bash
pnpm check          # eslint + tsc --noEmit
pnpm test
pnpm dev            # then click: / → /ghcards → /share?token=… → /duckerweb
```

`pnpm check` alone is not sufficient — TanStack regenerates `routeTree.gen.ts` and Convex has its
own codegen, so route-level breakage can typecheck clean.
