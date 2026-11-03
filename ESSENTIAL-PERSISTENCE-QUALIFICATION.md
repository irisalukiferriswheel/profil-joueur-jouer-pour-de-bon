# Essential profile persistence qualification

Reviewed 2026-11-03. Social links are explicitly deferred. No live profile values,
database configuration, schema, messages, invitations or deployment were changed.

## Source of truth and smallest fix

PR #7 at b167f9d0c6ed45eae713b871faaea4ad1d5504ac already contains the narrow
game-object-to-slug fix from PR #6. Do not merge both independently. The unchanged
runtime app in this follow-up is that existing release candidate; this follow-up
adds qualification, not a competing fix.

Remote branches inspected before testing:

- Profile main: 271a01a4325a8850f333f1b4edef8f6c8c00703b.
- Wix main: 7f83a721910b478b52e7f398c6ee43018e29cfc7.
- API main: 0538724009585fb19b3d732afaa745f075f76e4e.
- Existing recovery proposals: Wix PR #35 and API PR #75; do not substitute those
  disabled candidates for current main when diagnosing the published site.

The current Wix load emits game objects. Current Wix save accepts slug strings,
derives member identity in its backend, validates the complete profile, and sends
POST /v1/players/onboarding. Current API main validates active game slugs, upserts
players by wix_member_id, deletes/reinserts player_games, and returns success.
The page emits SAVED only on success, clears its load cache, and the embed requests
fresh data. The alias and city then come from GET /v1/players/onboarding.

## Local SQL qualification

Run `npm ci --ignore-scripts` and `npm test` with Node 24. The new test executes
the real embed and pinned Wix page/backend plus the pinned API handler. A narrow
query adapter executes parameterized SQL in PGlite using synthetic profiles.
It checks alias, city, public visibility, preserved hidden fields, game links,
stable player ID/count, rejection without writes, and fresh API/Wix readback.

This is stronger than returning a mocked save success, but **not deployed E2E**:
DOM, member authentication, webMethod permissions, HTTP and PostgREST transports
are substitutes. The schema is a reduced inferred fixture, not a production
snapshot. No managed Supabase Auth/RLS or independent-session concurrency claim
is made. The test deliberately uses current API main rather than the uninstalled
atomic-onboarding proposal. The pinned files must be reviewed when upstream moves.

The failure characterization documents an unresolved current-main defect: failure
inserting replacement games happens after the player upsert and deletion of old
game links. A save error can therefore coexist with a changed alias and no game
links. A passing characterization is **not** atomicity approval. Review the
existing atomic-save proposal and its schema prerequisites in an approved staging
target; do not silently deploy the disabled recovery branch or apply old migrations.

A narrow backend repair is now prepared locally at API commit
`dcbf365fc2b0909b28203c8089c5e498ac8b4172`, branch
`fix/essential-profile-atomic-save`. It extracts only the atomic mutation path
onto current main, preserving the current read contract. The two added atomic
form-path tests use exact copies of that route and SQL proposal: successful
save/readback and a SQL-triggered insertion failure that leaves the original
profile and game links intact. The proposal remains unapplied and the API flag
remains off. Deploying that API alone would block saves.

All **46 profile tests** pass locally, including six SQL-backed path tests.
The narrow API candidate passes **220 API tests**, **9 SQL tests**, typecheck
and build. PGlite is an actual local SQL engine with synthetic rows; transport,
managed authentication and reduced schema limitations above still apply.
Remote publication was rejected by automatic approval review pending explicit
parent verification of the destination. These new commits have no remote CI yet.

## Actual database evidence and remaining gates

The local conversation `01a15c27-f0f8-7432-8b24-6f59ea068839` completed its October
read-only inspection; it is no longer waiting on approval. It reported successful
metadata reads through supabase-jpdb-rw for xbyjbgmxgoyzjqlnxmgi, 20 public tables
with RLS, and missing atomic-onboarding RPC proposals. It also found eight missing
event/invitation migrations. Those event findings must not be presented as proof
that the *current-main* profile upsert is blocked by the same RPCs.

That inspection is historical evidence, not a fresh November schema check. This
task's tool catalog still exposes only the separately denied hosted Supabase
connector, not supabase-jpdb-rw; no denied operation was retried or bypassed.

Before calling the user's failure fixed:

1. Confirm the deployed profile asset and published Wix handler revisions, and
   record the failing request's stage/status without secrets or private payloads.
2. Approve deployment of the reviewed profile PR #7 separately. Merging profile
   main triggers GitHub Pages automatically. No production deployment is authorized
   by this qualification. Keep backend recovery activation separately gated.
3. Choose an approved staging target and complete test identity, or explicitly
   agree the existing user's exact temporary alias/city and restore values. No
   test value has been written to the user's account.
4. Use the normal authenticated non-preview form. Verify the same player ID's
   values, unchanged row count and game links through the authorized local DB
   connection, then reload in a fresh authenticated page. An alias count alone
   is insufficient. On uncertain response, inspect before retrying.
5. Exercise rejection and partial-failure recovery in staging before broader
   essential-form rollout. Do not manually insert rows to imitate a successful save.

After profile qualification, prioritize full eligibility/completion and organizer
draft persistence using the all-pages ledger at Wix c1594f5. The ledger remains
25 page IDs / 26 routes, five gated pages, and zero proven all-page live persistence
coverage. Native contact/newsletter, invitations and payments need their separate
authorization; local calculators do not require Supabase storage.

References consulted: [Wix current member](https://dev.wix.com/docs/velo/apis/wix-members-backend/current-member/get-member),
[Supabase update/readback](https://supabase.com/docs/reference/javascript/update),
[Data API grant change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically).
No auth API replacement or access expansion is part of this change.
