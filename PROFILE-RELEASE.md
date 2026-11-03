# Profile embed release candidate

## Scope and evidence

Combines the timeout/error correction from PR #5, the game-slug save correction from PR #6, and focused pending-save/error-state protection. No Wix backend, database, authentication, mandatory field, or deployment configuration changes. Preserve typed fields in the same open form after a host error; prevent repeated submits and Back while a save is pending; ignore late load data during edits. The browser guard is not a replacement for server idempotency or transactional persistence.

Forty deterministic local tests cover these behaviors. They use synthetic data and a minimal DOM model; they are not browser visual QA or live end-to-end proof. A save acknowledgment still comes from the host, followed by a new host data request. This client cannot independently prove that a database transaction committed. It does not show optimistic saved data.

The existing Pages workflow deploys on any push to main or manual dispatch. Do not merge this candidate, PR #5, or PR #6 without release approval. Use this combined candidate instead of merging the two individual changes separately.

Last observed successful main Pages workflow: https://github.com/irisalukiferriswheel/profil-joueur-jouer-pour-de-bon/actions/runs/39093058860 for commit 271a01a4325a8850f333f1b4edef8f6c8c00703b. This identifies the last observed successful workflow, not the bytes in every browser cache or the published Wix version. Direct deployment metadata was unavailable through the connector.

## Approval and release

1. Confirm the exact candidate SHA, clean diff, passing Profile regression tests, and current main SHA. Re-run against any new main changes before release.
2. Obtain approval to merge this specific candidate into this repository's main, explicitly explaining that this automatically publishes the player-profile embed on GitHub Pages and affects the embedded form on the public Wix site. This does not authorize publishing Wix backend changes or database migrations.
3. After approval only, merge once. Observe the resulting main SHA's Pages workflow to successful completion. Do not dispatch a second workflow while the first outcome is unknown.
4. Verify served app.js matches the approved artifact and use a fresh profile tab without the yellow fictional-preview banner. Confirm the actual Wix handler/version before claiming backend compatibility is established.

## Bounded form-to-database verification

Use the user's authorized local custom MCP for read-only database checks. Do not use direct database writes to repair or seed a profile.

1. Before a save, identify the existing authenticated user's profile through the authorized application read. With the local custom MCP, verify the matching existing row and record only metadata needed for the test: stable identity match, alias match, and matching-row count. Keep identifiers and personal data private; do not paste full rows or credentials into chat.
2. Obtain explicit approval for one specific alias edit on the user's existing profile. Keep all other fields unchanged. Save once in a fresh non-preview tab. If it errors, do not automatically retry; check outcome first.
3. Observe the host method, HTTP status, and sanitized success/code/message only. A 200 transport status alone is not application success. Do not share cookies, headers, tokens, member IDs, or full form payloads.
4. Require successful host acknowledgment, a fresh authenticated application read that returns the new alias, and a read-only database check showing the same existing row has changed with no duplicate row created. An alias-only count is supporting evidence, not sufficient proof of ownership or update-versus-insert.
5. Open another fresh profile tab and confirm the same value without a fictional-preview banner. Confirm normal authorized downstream profile reads use that same row. If the user wants the original alias restored, obtain or use explicit approval for that separate restore, perform it once, and repeat the readback.
6. On failure, preserve form inputs and capture only sanitized diagnostics. Do not bypass required fields, relax authorization, create a replacement player, or change atomic-save gates. Investigate the actual Wix/backend version before further production changes.

## Rollback

A frontend rollback does not undo profile data already saved. Do not roll back database contents.

With explicit rollback approval, revert only the released candidate changes in a new GitHub commit/PR, preserving unrelated main changes. Merge the revert to main and observe the automatic Pages deployment for that exact revert SHA. Verify the previous app behavior/bytes in a fresh tab. Do not force-reset main or dispatch arbitrary old branches; both can affect unrelated work. If the release never deployed, do not claim rollback is needed or complete.

## Remaining limits

Profile field validation remains authoritative in the backend. Missing eligibility/contact fields, unavailable APIs, or atomic-save gates can still reject a save. Preview/private hash-transition consistency is a separate known source issue and is not changed here. No production save, merge, deployment, migration, or live authenticated browser QA has been performed in preparing this candidate.
