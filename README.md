# Hopper Clip

Save, find, copy, and share Grasshopper snippets. DuckerWeb displays and compares
Grasshopper graphs in the browser without Rhino.

[Hosted app](https://www.hopperclip.com/) · [Security and deployment](docs/security.md)

## Stack

- Vite, React, TanStack Start/Router, Tailwind CSS, and shadcn/ui
- Clerk authentication, Convex database/functions, Cloudflare R2 files
- Vercel production hosting and PostHog analytics

## Local development

Use Node.js 24 and the pnpm version pinned in `package.json`.

```bash
git clone https://github.com/tsoumdoa/hopperclip.git
cd hopperclip
pnpm install --frozen-lockfile
cp env.example .env
```

Fill in `.env` with your development credentials. Configure Clerk, Convex, R2,
and the shared server secret as described in [environment setup](docs/security.md#environment-setup).
Use development services, separate from production.

Run Convex and the web app in separate terminals:

```bash
pnpm exec convex dev
pnpm run dev
```

Convex manages the development deployment and generates the API bindings. The web
app runs at <http://localhost:3000>. Set `VITE_CONVEX_URL` to that development
backend; legacy `NEXT_PUBLIC_*` names remain supported for existing deployments.

## Checks

```bash
pnpm run check
pnpm exec vitest run
pnpm run build
```

`check` runs ESLint and both application and Convex TypeScript configurations.
The build also needs the variables in `env.example`. GitHub CI runs these checks
and a dependency audit with placeholder credentials; Vercel deploys separately.

Keep tests for behavior that is costly to verify by inspection: file conversion,
graph matching, authorization boundaries, concurrent quotas, and durable cleanup.
Prefer a few realistic scenarios over wrapper tests, DOM mocks, and assertions
that repeat the implementation. A past bug alone is not a reason to retain a
test; its ongoing protection must justify its maintenance cost. There is no
coverage-percentage target.

## Code layout

- `src/routes/`: pages and server entry points
- `src/app/`: library UI, sharing, and DuckerWeb
- `src/server/`: authenticated uploads, downloads, and share gateway
- `convex/`: data model, permissions, quotas, and storage cleanup jobs
- `parser/src/`: shared Grasshopper XML parser
- `parser/sand/`: optional Bun sandbox and sample definitions; see [parser notes](parser/README.md)

## Deployment

`vercel.json` runs `convex deploy --cmd "pnpm run build"`: the web build finishes
before the backend is updated, then Vercel promotes the site. Keep the web app
and backend compatible throughout that transition. Use the matching secrets and
permissions in the [deployment guide](docs/security.md); a Vercel preview must
use its own configured backend and credentials.
