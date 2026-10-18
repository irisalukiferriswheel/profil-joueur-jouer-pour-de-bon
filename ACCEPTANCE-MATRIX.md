# Overnight cross-feature acceptance — local review only

Read-only reference: notification worker `task/wix-notifications`, `codex/invitation-notifications`, commit `9e281655835c90141ef8c854a48334c143aea330`. Its worktree remained clean and unchanged. Organizer reference: `task/organizer-eligibility/preview-assets/eligibility.js`; published profile base: main `271a01a`. No publication, production data/security changes, email delivery or live account creation occurred.

| Behavior | Evidence class | Result / remaining limit |
| --- | --- | --- |
| Current profile and notification contracts | Real-read | Actual repository heads, source and PR contracts inspected. No private member data or production schema read in this review. |
| Existing editor games | Fixture-only validation | Independent `profile-minimal` patch preserves original and additive preview fields/journey. Browser save/re-edit, keyboard and mobile checks pass using fixtures. Live Wix save not exercised. |
| Signup email consent | Fixture-only | `invitationEmails` is true only for explicit boolean true, defaults false; independent of `isPublic`. Actual notification delivery module tested with mocked repository/provider: opt-out or missing delivery permission suppresses sending. Private-but-opted-in recipient can receive an existing invitation; directory visibility is not reused as email permission. No preference persisted. |
| City/game agreement | Real-read + fixture-only round trip | Save uses city strings and `games.slug`; public API returns `{slug,nameFr,nameEn}` objects consumed by organizer picker. Actual picker function accepts matching city/game, preserves accent significance, rejects missing/mismatched data. Public city suggestions are not exhaustive canonical locations. |
| Stable identifiers | Real-read + local database test | Wix `_id` maps to `players.wix_member_id`; public `playerId` is `players.id`; invitation `invited_user_id`/proposed `recipient_user_id` is `players.supabase_user_id`, NOT the public player ID. Atomic upsert preserves existing player ID and Supabase mapping, ignoring forged replacements. Notification service uses a server-derived Wix member ID and owner-filtered repository. |
| Session expiry/account switch | Disabled-code + mocked tests | Signup controller now clears form on expiry/logout, invalidates in-flight reads/saves, and discards old responses after a new account loads. Prepared profile bridge clears private DOM/state on session-required/unconfirmed errors and ignores delayed replies. A transient save exception is conservatively treated as unconfirmed and clears the draft; ordinary validation failures retain it. |
| Notification ownership | Disabled-code + mocked tests | Actual worker service resolves member on every call, rejects another member's row and performs no repository read when logged out. Notification URL handler is not mounted; eventual UI must apply equivalent generation/cancellation guards to delayed detail responses. |
| Atomic profile/interests save | Disabled-code + embedded PostgreSQL | Rollback after every write stage, orphan prevention, lost-response retries, existing identity mapping preservation and browser-role denial pass on a contract schema fixture. RPC route defaults off and has no non-atomic fallback. SQL remains outside migrations. |
| Full signup activation | Production-blocked | Basic-vs-eligibility policy, canonical location strategy, durable private preference storage, verified schema/constraints, multi-connection transaction tests, and authorized staging Wix verification remain pending. Required eligibility/payment rules unchanged. |
| New-account invitations and idle logout | Production-blocked | Onboarding upsert does not itself establish `players.supabase_user_id`; reuse/verify the existing server identity resolver before exposing invitations. Do not accept that mapping from the client. No verified idle-logout/account-switch host event wiring exists for the disabled signup flow; lifecycle hook must call reset/clear before new reads. No unsupported Wix logout API was introduced. |

## Separately reviewable patches

1. `profile-minimal`, `codex/minimal-profile-games`, `c941318`: smallest editor gap correction based on published main; independent of PR #2, signup, notifications and database proposal.
2. `api-onboarding`, `codex/atomic-player-onboarding`: transaction-backed full-onboarding proposal and tests. Review SQL/schema prerequisites separately; do not deploy the disabled route alone because it returns 503 for saves until enabled.
3. `wix-signup` + `profile-signup`, `codex/signup-profile-completion`: coordinated optional edit-boundary/session-state fixes and disabled signup prototype. These are based on broader unmerged PR #34/#2 respectively; do not substitute them for patch 1 or cherry-pick blindly into published main.
4. Notification worker `9e28165`: separate unchanged review, disabled repository/provider handlers. Durable preference adapter and host lifecycle composition remain integration prerequisites, not implemented functionality.

## Exact verification

`node --test profile-signup/*.test.mjs wix-signup/tests/*.test.mjs wix-signup/tests/*.test.js`: **77/77 pass**, saved in task-4/consistency-tests.log. Cross-feature tests read the actual reference modules; `JPDB_REFERENCE_TASK` can point to equivalent checked-out reference repositories.

Embedded PostgreSQL tests: **9/9 pass**, task-4/atomic-db-tests.log, including preserved `supabase_user_id`. API typecheck and **220/220** API tests passed in the preceding review; no API runtime changes followed. `node browser-check.cjs` passes FR desktop/EN mobile/signup re-edit and existing editor game save. Minimal profile browser, accessibility and organizer journey regressions previously pass; minimal code is unchanged in this review.

All session/notification behavior above is mock or local-code evidence, not a claim that live Wix logout, email delivery, durable consent or new-account identity mapping has been verified. Production activation is pending review; no activation action was attempted or denied.
