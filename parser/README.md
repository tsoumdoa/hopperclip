# Grasshopper parser

`src/` is the shared parser used by the app. Import `buildGhJson` from
`parser/src/parser`; `{ includeVisuals: true }` retains bounds, pivots, groups,
and display metadata needed by DuckerWeb.

The result contains `components`, `wires`, and document metadata. Components
have a `typeGuid` identifying their Grasshopper type and an `instanceGuid`
identifying the placed instance. Ports also have instance IDs. See
[src/types.ts](src/types.ts) for the current schema; avoid maintaining a second
copy of it in documentation.

`sand/` contains sample XML, generated JSON, and optional Bun scripts. It is
excluded from Vercel deployments and application typechecking. Some essential
tests read its XML samples; keep those fixtures available when running tests.
See the [sandbox commands](sand/README.md) for manual parser inspection.
