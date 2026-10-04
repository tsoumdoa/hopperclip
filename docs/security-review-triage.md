# Security review triage

Rechecked against the repository on October 4, 2026. The original
`security-review.html` is a useful starting point, but some claims and proposed
fixes need qualification. This is a focused code review, not a penetration test
or an audit of the deployed Clerk, Convex, hosting, and R2 settings.

## Changes in this pass

| Finding                             | Decision                                                        | Change                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1: short share tokens              | Fix now: small change to a credential protecting private files. | New tokens use 15 base36 characters (~78 bits), matching the requested shorter links. The shared validator accepts exactly 10, 15, or 25 lowercase alphanumeric characters, so previously issued links still load and can be revoked. Existing links keep their original expiry; they are not silently rotated.                                                                                                           |
| L1: missing dependency audit and CI | Fix now: prevents regressions and catches real advisories.      | The audit found six entries affecting two pinned `brace-expansion` versions: four high and two moderate, all through ESLint/TypeScript ESLint tooling. Updated overrides from 1.1.18 to 1.1.21 and 5.0.9 to 5.0.12. Added CI for frozen installation, high-severity audit, lint, typecheck, tests, and build on PRs, main pushes, and a weekly schedule. Actions are pinned to commit SHAs; builds use dummy credentials. |
| L6: unused worker alias             | Remove the dead code now.                                       | Removed the `NEXT_PUBLIC_CF_WORKER` → `VITE_CF_WORKER` alias. Remaining environment aliases may still support current deployments; removing all of them needs a deployment migration. No private environment files were edited.                                                                                                                                                                                           |

Fifteen characters trade some guessing resistance for shorter URLs: ~78 bits is
stronger than the original ~52 bits, but below the report's 96–128-bit target.
The IP and valid-share limits described below provide a separate layer of abuse control.

The existing share expiry limit is 30 days. After all backends generating old
tokens have been replaced, legacy links age out within that period; their
validator compatibility can then be removed separately.

The `brace-expansion` advisories are dependency findings, not evidence of a
remotely exploitable route in this app. Nevertheless, the patch updates are
low-cost and worth applying. See the upstream advisories for
[nested brace recursion](https://github.com/advisories/GHSA-qhr7-859c-m2p7),
[comma recursion](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p), and
[quadratic expansion](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr).

## Follow-up priorities

| Finding                                           | Priority now                                                       | Reason and useful next step                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L2: browser-managed R2 deletion                   | Implemented in the follow-up worktree.                             | Card deletion/replacement now records cleanup atomically in Convex. A durable storage ledger retries R2 deletion, recovers crashed jobs, preserves referenced files, and reclaims new abandoned uploads after 24 hours. Historical orphans still need separate reconciliation.                                                                                                              |
| L3: numeric-array upload payloads                 | Implemented in the follow-up worktree.                             | Raw binary uploads replace JSON number arrays. Authentication, trusted origin checks, and an upload reservation precede body reads. Actual bytes are bounded at 25 MiB, with cancellation and request deadlines. Small requests allocate small buffers. R2 HEAD verifies completion before the key can attach to a card.                                                                    |
| M2: public share action abuse                     | Implemented in the follow-up worktree.                             | Share metadata and signing use one server gateway. Convex requires a server-only secret, consumes atomic IP and valid-share quotas, and returns retry delays. The old public metadata query is internal-only. Limits persist across server instances; guessed tokens never create token-specific limiter rows.                                                                              |
| M3: CSP inline scripts / reporting                | Separate rendering and observability work.                         | Do not remove `unsafe-inline` without checking streamed hydration, static prerenders, and Clerk. The installed TanStack server handler already accepts a nonce; static HTML/header coordination remains the issue. A report endpoint must actually receive and monitor reports and avoid retaining capability URLs. Narrowing image hosts must allow Clerk avatars as well as local images. |
| L4: unused secrets / production keys              | Deployment housekeeping, not an automatic rotation task.           | Local development keys do not establish that production uses test keys. Verify production settings in the owning dashboards, remove unused JWT/worker variables where confirmed, and rotate credentials when exposure or policy requires it. No evidence of leakage was established by this pass, and no credentials or dashboard settings were changed.                                    |
| L5: unbounded card/tag queries                    | Defer until library size warrants pagination.                      | Queries are scoped to the signed-in user. Pagination needs coordinated UI, filtering, sorting, and tag aggregation changes. Adding `.take(N)` alone would silently hide cards or produce incomplete tag counts.                                                                                                                                                                             |
| L7: additional headers, quotas, beta dependencies | Quotas belong with abuse controls; extra headers are low priority. | Existing framing and content-type protections cover the main browser risks. CORP needs compatibility testing, and a legacy cross-domain-policy header adds little here. Audit actual dependencies rather than equating a beta version with a known vulnerability.                                                                                                                           |

Convex explicitly documents that scheduled actions are **not automatically
retried**, which is why a single scheduled R2 DELETE is not a complete L2 fix.
See [scheduled function guarantees](https://docs.convex.dev/scheduling/scheduled-functions).
R2 documents presigned URLs as reusable until expiry and requires browser CORS
configuration; see [presigned URL behavior](https://developers.cloudflare.com/r2/api/s3/presigned-urls/).

## Corrections to the review

- 16 base36 characters provide ~83 bits, not 128. Twenty provide ~103 bits;
  25 provide ~129 bits. Guessing risk also depends on active share count and
  request throughput; the report does not establish practical brute-force abuse.
- Invalid or expired shares do not reach the signing operation in
  `convex/ghPublicAction.ts`. Signing itself is local computation, not an R2 API
  request.
- Moving a token from the query string into the path does not hide it from access
  logs. It would also bypass the current analytics scrubber's removal of URL
  queries and fragments. Keep the existing URL shape in this pass.
- The XML parsers do process entities by default. The installed
  `fast-xml-parser` has entity limits; the report's claim that DTD handling is
  absent is inaccurate. This review did not establish an exploitable expansion
  attack, and disabling all entities would corrupt legitimate escaped script
  text. Reassess parser limits independently if changing XML handling.
- Searching all of `.output/` for secret **names** is not a leakage test: server
  bundles legitimately reference server environment variables. Check emitted
  public/client assets for actual secret values without logging those values.
- CI has no production credentials and performs no deployments. Hosting-side
  secret rotation, dashboard settings, update-bot enablement, and branch
  protection are separate operational work.

## Validation

Local verification passed: frozen-lockfile installation, `pnpm run check`, all
229 tests across 23 files, production and Vercel-preset builds with placeholder credentials,
changed-file formatting checks, and Actionlint validation of the workflow.
`pnpm audit --audit-level=high` reports no known vulnerabilities. The initial
hardening commit also passed the GitHub-hosted CI workflow on main.

Regression coverage includes share-token compatibility, concurrent quotas,
gateway bypass attempts, request size/deadline enforcement, upload completion,
failed saves, deletion retries, and crash recovery. Integration tests exercise
the actual Convex functions through `convex-test` with simulated R2 responses.
Production-server HTTP checks verified upload origin/authentication rejection,
share request validation, and fail-closed behavior without a trusted client IP.
The emitted public assets contain neither server-secret placeholder value.

The independent merge review also found and fixed a separate Convex typecheck
failure and inconsistent build/runtime Convex URL precedence in sharing. Both
TypeScript configurations now run in `check` and `build`; tests remain covered by
the root configuration. Sharing uses the same selected backend as uploads and
the browser.

The earlier main commit passed GitHub CI but Vercel blocked deployment because
TanStack Start 1.168.58 was affected by critical reflected XSS
[CVE-2026-102989](https://github.com/TanStack/router/security/advisories/GHSA-qx66-fv34-fjm8).
Updated React Start to 1.168.60 and its matching React Router to 1.170.41; the
lockfile resolves the patched Start server core 1.169.39. No security bypass
environment variable was enabled.

Production preparation verified Convex's deployment dry run, matching web/backend
R2 targets without trailing slashes, the canonical upload origin, and Clerk's
Convex JWT `id` and `aud` claims. A temporary object verified web PUT and backend
HEAD/GET/DELETE permissions and was removed. A matching random server gateway
secret was installed in both production environments, sensitive on Vercel.
An authenticated browser upload still needs an end-to-end production smoke check.
The application and Convex changes require the coordinated rollout below.

## Storage and rate-limit deployment

The follow-up branch requires a coordinated web/Convex rollout. Configure the
following before deploying either side:

- Set the same cryptographically random `SERVER_GATEWAY_SECRET` (at least 32
  characters) on the web host and in Convex. Generate it locally, for example
  with `openssl rand -hex 32`. Never give it a `VITE_` prefix, commit it, or send
  it to a browser. Uploads and public sharing fail closed if it is missing or
  mismatched. CI uses a non-production placeholder.
- Convex needs `R2_URL`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY`, with object
  read and delete permissions. The web host keeps permission to upload.
- Set `VITE_HOSTING_DOMAIN` to the actual browser origin for each environment.
  Uploads require that exact Origin and reject cross-site requests. Local
  development additionally accepts matching loopback origins.
- Vercel uses its overwritten `x-vercel-forwarded-for` header automatically when
  `VERCEL=1`. On another production host, configure `TRUSTED_CLIENT_IP_HEADER`
  only behind a proxy that overwrites that header and prevents direct access to
  the origin. Otherwise public sharing fails closed. Development on loopback
  uses a shared local quota and ignores forwarded headers. Raw IP addresses are
  HMACed before reaching Convex; IPv6 addresses share a /64 quota.
- Keep the existing Clerk Convex JWT template's `id` claim equal to the signed-in
  Clerk user ID. Missing IDs are rejected; ownerless historical records are not
  automatically assigned to a user.

The backend schema adds a storage ledger, an owner/key index, a limiter table,
and recovery crons. Existing card rows need no data rewrite. New card inserts
and file replacements require a completed, owner-matched upload reservation;
keys cannot be reused after attachment/deletion. Previously opened app tabs using
the old upload/share APIs must reload after rollout. The old unbounded upload and
browser deletion endpoints are removed. Do not roll back only the backend: that
would restore routes that bypass the gateway and storage lifecycle.

| Control                  | Default                                                               |
| ------------------------ | --------------------------------------------------------------------- |
| Share requests           | Burst of 30 per IP identity; refills at 30/minute                     |
| Valid share requests     | Burst of 120 per share; refills at 120/minute                         |
| Upload reservations      | Burst of 20 per signed-in user; refills at 20/minute                  |
| Limiter state            | Expires after 1 hour idle; cleanup every 10 minutes in batches of 200 |
| Upload request           | Actual compressed bytes capped at 25 MiB; 2-minute deadline           |
| Unattached uploads       | Eligible for cleanup after 24 hours                                   |
| Storage recovery         | Every 5 minutes; up to 50 due deletions per sweep                     |
| Failed deletion          | Exponential retry delay from 1 minute to 1 day; jobs remain recorded  |
| Crashed deletion         | A 5-minute lease allows a later sweep to recover the job              |
| Presigned share download | At most 300 seconds, capped to remaining share lifetime               |

Deletion is asynchronous: the card and its shares disappear immediately; R2
removal completes afterward. Failed jobs remain in `storageObjects` with
`state=deleting`, `attempts`, `nextAttemptAt`, and `lastFailureAt`. Monitor rows
whose attempts keep rising or whose due time remains overdue, and restore R2
credentials/connectivity when necessary. Deleted ledger rows remain as tombstones
to prevent stale upload/key reuse. A batch backlog or storage outage delays
physical deletion; there is no fixed deletion deadline.

Files that were already orphaned before this ledger existed cannot be attributed
to a deletion job automatically. Reconcile those separately against an R2
inventory and live database references; this implementation does not purge the
bucket or delete unknown objects.

The byte cap bounds application memory, not every hosting platform's body size.
Vercel can reject requests below the application's 25 MiB ceiling; see its
[function payload limits](https://vercel.com/docs/functions/limitations#request-body-size).
Binary transport removes JSON expansion but does not bypass the host's request
limit. Supporting larger uploads there requires another transport, such as
verified direct-to-R2 uploads. Rate limiting bounds accepted work per identity;
platform-level DDoS protection and billing monitoring still apply to raw traffic
and distributed attackers.

The trusted Vercel header behavior is documented in
[Vercel request headers](https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for).
