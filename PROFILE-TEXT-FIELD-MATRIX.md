# Player profile text-field test matrix

Scope: six inputs in profil-joueur-jouer-pour-de-bon/app.js. This is not the legacy completion form or organizer form. No user's fields were changed. Forty deterministic tests pass, including characterization of known broken contracts. A passing test that reproduces a defect does not make that feature PASS.

## Field-by-field result

| Field | Client collection/escaping | Inspected Wix → API mapping | Intended database mapping | Durable end-to-end result |
|---|---|---|---|---|
| Alias public | PASS for tested trim, Unicode, 100-code-unit cap, output escaping | PASS in pinned main and checkpoint synthetic contracts | Onboarding API passes alias in p_profile; intended players.alias | BLOCKED: live failed save reported; current published handler/DB commit not verified |
| Ville | PASS for tested trim, Unicode, 150-code-unit cap, output escaping | PASS in pinned main and checkpoint synthetic contracts | Onboarding API passes city in p_profile; intended players.city | BLOCKED: no authorized live field write/readback test |
| Site Web | PASS for tested HTTPS collection/escaping; validation gaps below | FAIL: payload.socials is omitted before API in both pinned Wix paths | No mapping for this field in inspected onboarding route; no live schema claim | FAIL in inspected source; live durability untested |
| Instagram | PASS for tested HTTPS collection/escaping; validation gaps below | FAIL: payload.socials is omitted before API in both pinned Wix paths | No mapping for this field in inspected onboarding route; no live schema claim | FAIL in inspected source; live durability untested |
| TikTok | PASS for tested HTTPS collection/escaping; validation gaps below | FAIL: payload.socials is omitted before API in both pinned Wix paths | No mapping for this field in inspected onboarding route; no live schema claim | FAIL in inspected source; live durability untested |
| YouTube | PASS for tested HTTPS collection/escaping; validation gaps below | FAIL: payload.socials is omitted before API in both pinned Wix paths | No mapping for this field in inspected onboarding route; no live schema claim | FAIL in inspected source; live durability untested |

## Exact existing rules and gaps

- Alias: HTML required; handler trims and silently truncates to 100 UTF-16 code units. Empty/whitespace becomes empty and is rejected by the inspected backend. No client maxlength attribute or explicit length message. Unicode is retained in tested examples, but truncation is code-unit-based, not grapheme-aware.
- City: HTML does not require it, but both inspected backend paths require a nonempty city. Handler trims and silently truncates to 150 code units. This required/optional mismatch is not changed by the candidate.
- Four URL inputs: native type=url exists. JavaScript trims, truncates to 500 code units, then keeps only lowercase https:// prefixes. Empty, whitespace, HTTP, javascript:, and arbitrary text are silently omitted by the handler. No platform-domain restriction exists; none was invented by testing.
- Handler-level URL validation is only a prefix test: https:// passes when native browser validation is bypassed. The VM tests exercise handler behavior, not native browser validity. Malformed URL browser UI and real mobile/desktop validation remain BLOCKED pending browser QA. Uppercase HTTPS and silent truncation can also cause surprising loss/change; this candidate does not redesign those rules.
- Alias/city/social URLs are HTML-escaped when inserted into editor attributes. Tested quote/tag payloads do not form raw image markup. This is focused escaping coverage, not a security audit.
- Existing main backend reconstructs its request from an allowlist without socials; checkpoint edit wrapper updates alias/city/games/isPublic, also omitting socials. Onboarding normalization omits them on read. Merely adding a client social field therefore cannot produce a durable round-trip through these source paths.

## Save-state tests

Candidate preserves the same form DOM after a host error, keeps typed values in that DOM, uses a fixed non-sensitive error message, and restores Save/Back controls. Repeated submit while pending emits one save message. Late load data does not replace an active editor. After host save acknowledgment, the client requests fresh host data rather than showing an optimistic local saved profile.

Limits: preserving inputs lasts only in that open page; reload/navigation can discard unsaved edits. Duplicate-click protection is not server idempotency across tabs/reloads/retries. A lost reply leaves the operation pending; do not retry an uncertain outcome without checking the authoritative state. No client claim proves a database commit.

## Source evidence

- Embed baseline: https://github.com/irisalukiferriswheel/profil-joueur-jouer-pour-de-bon/blob/271a01a4325a8850f333f1b4edef8f6c8c00703b/app.js
- Main Wix backend: https://github.com/irisalukiferriswheel/jpdbwebsite-wix/blob/7f83a72/src/backend/playerOnboarding.web.js
- Checkpoint edit backend: https://github.com/irisalukiferriswheel/jpdbwebsite-wix/blob/2168b796857eed6c7d4d84deff29d3f35da2712a/src/backend/playerProfileEdits.web.js
- Pinned copies of those Wix backend files are in tests/fixtures and executed with synthetic identity/network stubs.
- Additional API mapping inspection used the recovery snapshot of jouer-pour-de-bon-api/src/routes/player-onboarding.ts: alias/city enter p_profile for save_player_onboarding_atomic; socials is absent. That snapshot's atomic-save enable gate and RPC installation are not assumed live. No migration or deployed schema was changed or verified.

## Remaining work before claiming all fields work

Resolve the intended social storage/read contract with server-side validation and authorized persistence, then test against an isolated database and the actual authorized path. Do not silently invent columns or use direct database writes. Decide whether city should be required in the UI and whether invalid/overlong URLs should be visibly rejected rather than dropped; these are product decisions, not new rules introduced here.

For live tests, first agree exact temporary values and restore values with the user. Test one bounded edit, observe application success, then use the authorized local custom MCP for read-only verification of the same existing row and unchanged row count. Fresh authorized application readback must show the same value. Alias-only count is insufficient to prove identity or absence of duplicate rows. See PROFILE-RELEASE.md. No live write test is authorized by this report itself.
