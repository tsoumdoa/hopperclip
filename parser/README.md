# Parser Layout

- `src/` is the shared parser package used by the app and production builds.
- `sand/` is a Bun-only sandbox for local parser development, fixtures, and generated sample output.

App code should import from `parser/src/*`. Sandbox scripts may import the shared parser from `../src/*`, but Vercel should not need anything under `parser/sand`.
