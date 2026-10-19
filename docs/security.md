# Security and deployment

## Environment setup

Keep separate development, preview, and production credentials. Configure these
for each web/backend pair:

| Variable                                             | Where               | Purpose                                 |
| ---------------------------------------------------- | ------------------- | --------------------------------------- |
| `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`     | Web host            | Clerk authentication                    |
| `CLERK_JWT_ISSUER_DOMAIN`                            | Convex              | Validate Clerk JWTs                     |
| `VITE_CONVEX_URL`                                    | Web build           | Select the matching Convex deployment   |
| `CONVEX_DEPLOY_KEY`                                  | Hosting build       | Authorize automated Convex deployment   |
| `SERVER_GATEWAY_SECRET`                              | Web host and Convex | Authenticate server gateway calls       |
| `R2_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Web host and Convex | Access the same bucket and object paths |
| `VITE_HOSTING_DOMAIN`                                | Web build           | Exact browser origin allowed to upload  |
| `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`              | Web build           | Analytics                               |

Generate `SERVER_GATEWAY_SECRET` with `openssl rand -hex 32`; install the same
value on the web host and its Convex backend. Store it as sensitive on Vercel.
Never commit it or prefix it with `VITE_` or `NEXT_PUBLIC_`. Missing or mismatched
secrets prevent uploads and sharing.

Clerk's `convex` JWT template must include `aud: "convex"` and
`id: "{{user.id}}"`. The JWT owner must match the web session's Clerk user ID.
The web R2 credentials need upload/read access; Convex needs object read/delete
access. Browser downloads also require bucket CORS for the application's origin.

Vercel automatically supplies the trusted IP header when `VERCEL=1`. Other
production hosts require `TRUSTED_CLIENT_IP_HEADER`, an overwriting reverse
proxy, and an origin that cannot be reached directly. Without this setup,
public sharing fails closed. Local loopback development uses a shared quota.

## Uploads and cleanup

Uploads pass through `/api/uploads`: authentication and quota checks precede
reading the binary body. Convex reserves the storage key and verifies the R2
object with HEAD before a card can reference it. Upload keys are single-use.

Deleting or replacing a card records cleanup in the same Convex transaction.
The backend deletes the unreferenced R2 object asynchronously and retries
failures. Referenced files are preserved; new unattached uploads expire after
24 hours. Files orphaned before the ledger existed need separate reconciliation.

| Control           | Default                                              |
| ----------------- | ---------------------------------------------------- |
| Uploads           | Burst of 20 per user; refills at 20/minute           |
| Upload body       | At most 25 MiB compressed; 2-minute request deadline |
| Abandoned uploads | Eligible for cleanup after 24 hours                  |
| Recovery sweep    | Every 5 minutes; up to 50 due deletions per sweep    |
| Failed deletion   | Retry delay grows from 1 minute to 1 day             |
| Crashed deletion  | Recoverable after a 5-minute lease                   |

Check `storageObjects` rows in `state=deleting` for rising `attempts`, overdue
`nextAttemptAt`, and `lastFailureAt`. Restore credentials or connectivity when
needed. Backlogs delay removal; there is no guaranteed physical deletion time.
Keep deleted ledger rows: their tombstones prevent unsafe key reuse during retries.

The application byte cap does not override the hosting platform's request limit.
Vercel may reject smaller uploads; see its [function payload limits](https://vercel.com/docs/functions/limitations#request-body-size).

## Sharing

`/api/share` combines metadata lookup and download signing. Its Convex action
requires the server secret; direct public metadata queries are disabled.

- New tokens contain 15 lowercase alphanumeric characters, approximately 78 bits.
  Existing 10- and 25-character tokens remain accepted until they expire or are revoked.
- Shares default to 7 days and have a maximum lifetime of 30 days.
- IP quotas allow a burst of 30, refilling at 30/minute; each valid share allows
  120, refilling at 120/minute. Limit responses include `Retry-After`.
- Convex stores HMAC IP identifiers, grouping IPv6 addresses by /64. Idle limiter
  rows expire after an hour and are pruned every 10 minutes.
- Download URLs last at most 300 seconds, capped to the share's remaining lifetime.
  An already issued URL can still work until it expires after a share is revoked.

## Release checks

### Local snippet cache

Signed-in library previews and Copy share a disposable IndexedDB cache. Every
read first resolves the currently owned file through `resolveOwnedGhDownload`
and `ghCard.getOwnedFile`; cached content is never an authorization fallback.
Entries are scoped to the Convex deployment, Clerk user, card and immutable
storage key. The cache has a 25 MiB accounting budget (payload, metadata and a
1 KiB per-entry allowance), least-recently-used eviction and seven-day absolute
expiry. There is no file-count limit. Browser storage overhead can differ from
the accounting budget. Cleanup runs when the app is used, not on a background
schedule. A checksum detects corrupted local payloads before decoding.

Replacement and deletion invalidate cached versions after the server commits;
renaming keeps the same file. Sign-out/account changes clear the previous cache.
Transactions fence late writes, and cross-tab messages cancel pending reads.
Storage failures fall back to the verified online download. Public share reads,
uploads and server mutations do not use this cache. Users can clear it from the
account menu. These local copies are disposable browser data, not a backup or
encrypted vault; a closed/offline browser cannot immediately observe remote changes.

The cache is enabled automatically, without rollout flags or an account allowlist.
To undo this release, roll the Vercel website back to the recorded last working
deployment and leave the additive Convex query deployed. The original download
endpoint and database schema remain compatible with that website. Refresh tabs
still running the newer client; a deployment rollback does not replace JavaScript
already loaded in a browser or erase its IndexedDB data. The old app does not use
that database; browser site-data cleanup can remove it after rollback. For a
longer-term rollback, revert the cache changes and deploy normally, retaining the
additive Convex query while newer tabs may still call it. No server data migration
or restoration is needed.

### Before merging

Run the checks in the [README](../README.md#checks) before merging. Configure both
platforms before deployment, then verify a signed-in upload → share → delete cycle
and the resulting cleanup. Open tabs using an older API may need refreshing.
Do not roll back only the backend when the web app depends on its new interfaces.

Dependency audit results are one signal; hosting security gates may identify
advisories sooner. Update vulnerable packages rather than bypassing those gates.
CSP changes need separate hydration/prerender testing. Pagination, additional
headers, and historical orphan reconciliation remain separate work.
