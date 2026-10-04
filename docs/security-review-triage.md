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
The unimplemented rate limits remain a separate follow-up.

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

| Finding                                           | Priority now                                                               | Reason and useful next step                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L2: browser-managed R2 deletion                   | Highest follow-up; do before relying on deletion as a retention guarantee. | Both delete and replacement cleanup are currently best-effort browser calls. Replacement does attempt cleanup, contrary to the report's blanket orphaning claim, but closing the tab or losing a request leaves an object behind. Add a durable deletion queue in the same Convex transaction as the card change, then process it with bounded retries and a recovery sweep. Account for keys still referenced by another card and objects uploaded without a successful card save. Existing orphaned objects require separate reconciliation. |
| L3: numeric-array upload payloads                 | Address with the storage work, or sooner if large uploads are common.      | The 25 MiB compressed limit is real, but JSON arrays amplify network and heap use, and schema validation happens after body parsing. Prefer binary transport with an early request-size limit, or direct R2 uploads with a verified server-enforced byte limit, upload finalization, and cleanup of abandoned uploads. A client-side size check or ordinary presigned PUT alone is insufficient.                                                                                                                                               |
| M2: public share action abuse                     | Before a larger public launch, or when usage shows abuse.                  | Well-formed nonexistent tokens incur a query but return before signing. Rate limiting can reduce abuse but does not remove the cost of invoking the public function. Per-token throttles are bypassed by random tokens, and a Convex query cannot write limiter state. Use a trusted HTTP boundary for IP throttling or a verified challenge, with bounded limiter storage; ensure the original public function cannot bypass the gate. Consider authenticated upload/card quotas in the same work.                                            |
| M3: CSP inline scripts / reporting                | Separate rendering and observability work.                                 | Do not remove `unsafe-inline` without checking streamed hydration, static prerenders, and Clerk. The installed TanStack server handler already accepts a nonce; static HTML/header coordination remains the issue. A report endpoint must actually receive and monitor reports and avoid retaining capability URLs. Narrowing image hosts must allow Clerk avatars as well as local images.                                                                                                                                                    |
| L4: unused secrets / production keys              | Deployment housekeeping, not an automatic rotation task.                   | Local development keys do not establish that production uses test keys. Verify production settings in the owning dashboards, remove unused JWT/worker variables where confirmed, and rotate credentials when exposure or policy requires it. No evidence of leakage was established by this pass, and no credentials or dashboard settings were changed.                                                                                                                                                                                       |
| L5: unbounded card/tag queries                    | Defer until library size warrants pagination.                              | Queries are scoped to the signed-in user. Pagination needs coordinated UI, filtering, sorting, and tag aggregation changes. Adding `.take(N)` alone would silently hide cards or produce incomplete tag counts.                                                                                                                                                                                                                                                                                                                                |
| L7: additional headers, quotas, beta dependencies | Quotas belong with abuse controls; extra headers are low priority.         | Existing framing and content-type protections cover the main browser risks. CORP needs compatibility testing, and a legacy cross-domain-policy header adds little here. Audit actual dependencies rather than equating a beta version with a known vulnerability.                                                                                                                                                                                                                                                                              |

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
104 tests across 12 files, a production build with placeholder credentials, and
Actionlint validation of the workflow. `pnpm audit --audit-level=high` now reports
no known vulnerabilities. The GitHub-hosted workflow itself has not run yet.

Regression tests cover the stronger token format, continued acceptance of legacy
tokens, and rejection of malformed tokens. The application and Convex changes
must both be deployed for the new token format to work end to end; deploy the
updated client validator before enabling the updated backend generator if
deploying them separately. No deployment was performed in this pass.
