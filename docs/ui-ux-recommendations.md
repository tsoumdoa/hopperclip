# UI/UX recommendations: next level

Follow-ups to the UI overhaul (dark design system, library redesign, share page,
DuckerWeb empty state). Ordered by expected impact. None of these are built yet.

## 1. Make the command palette run actions

**Why:** the landing page promises "find them in seconds". Today `⌘K` only
filters the grid; the user still has to find the card and click Copy.

**What:** turn the search overlay into a real palette. Arrow keys move through
matching cards; `Enter` copies the highlighted card's GhXml straight to the
clipboard; secondary actions via `⌘Enter` (open graph) and `⌘S` (share).
Show recently copied cards when the query is empty.

**Where:** `src/app/ghcards/components/filter.tsx`,
`src/app/ghcards/hooks/use-filter.ts`, copy logic in
`src/app/components/gh-card-normal-buttons.tsx` (extract to a hook).

## 2. Version history with visual diffs

**Why:** a unique feature no Grasshopper tool offers, and most of the work is
already done — DuckerWeb has a working graph diff.

**What:** when a user replaces a card's GhXml, keep the previous blob as a
version instead of deleting it. Add a "History" tab to the card dialog listing
versions; selecting one renders `GHDiffView` between it and the current version.
Allow restoring an older version.

**Where:** new `versions` table in `convex/schema.ts`; update
`convex/ghCard.ts#updatePost` and the R2 cleanup in `use-gh-card-control.ts`;
reuse `src/app/duckerweb/components/GHDiffView.tsx`.

## 3. Graph thumbnails on cards

**Why:** Grasshopper scripts are visual. People recognise a definition by its
shape faster than by its name.

**What:** generate a small static preview (SVG or PNG) of the flow at upload
time and show it at the top of each card. Fall back to the current text-only
card when a thumbnail is missing.

**Where:** reuse `createFlowPreview` from
`src/app/duckerweb/gh-flow-generator.ts`; store the thumbnail next to the GhXml
in R2; render in `src/app/components/gh-card.tsx`.

## 4. Rich link previews for share links

**Why:** share links are mostly pasted into Slack, Teams, or email. An unfurl
showing the graph and card name makes them far more clickable and is the main
viral loop for team adoption.

**What:** add Open Graph / Twitter meta tags to `/share` and a server-rendered
OG image endpoint that draws the card name, tags, and graph thumbnail.

**Where:** `src/routes/share.tsx` (currently `ssr: false`, so the meta needs a
server-side loader), plus a new image route.

## 5. Edit cards in a side panel

**Why:** inline editing grows the card, which stretches every card in the same
grid row and pushes content around.

**What:** open edit mode in a right-hand sheet (or the existing card dialog)
with the same fields. The grid stays stable and there's room for a larger
description field and a graph preview of replacement GhXml.

**Where:** `src/app/components/gh-card.tsx`, `gh-card-body.tsx`.

## 6. Fix nested interactive elements on cards

**Why:** each card is `role="button"` and contains other buttons (Copy, Share,
Edit, tags). Screen readers and keyboard users get confusing behaviour.

**What:** make the card a plain container and use a stretched, visually hidden
"Open" button/link as the primary target, with the action buttons layered above
it (`relative z-10`).

**Where:** `src/app/components/gh-card.tsx`.

## 7. Smaller wins

- **First-run sample card:** seed new accounts with one example definition so
  the library isn't empty and every feature (copy, share, graph) is
  discoverable immediately.
- **Share expiry options:** let users pick 1 day / 7 days / 30 days / never in
  the share dialog (currently fixed at 7 days).
- **Pinned cards:** pin frequently used snippets to the top of the library.
- **Sort by last copied:** track copy events and offer it as a sort order.
- **Light theme:** colours are now driven by CSS variables in
  `src/styles/app.css`, so a light theme is mostly a second token set plus a
  toggle.
- **Grasshopper plugin:** a companion GH component that pushes/pulls cards
  directly would remove the copy/paste step entirely.
