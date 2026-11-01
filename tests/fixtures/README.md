# Pinned Wix contract fixtures

Read-only source snapshots for deterministic contract characterization. They are not runtime code for this embed and contain no production credentials or account data. Tests strip imports and inject synthetic member, secret, and network stubs; no real API call is made.

- wix-main-playerOnboarding.js: irisalukiferriswheel/jpdbwebsite-wix at 7f83a72, src/backend/playerOnboarding.web.js.
- wix-checkpoint-playerProfileEdits.js: same repository at 2168b796857eed6c7d4d84deff29d3f35da2712a, src/backend/playerProfileEdits.web.js.

A passing characterization test that documents omitted socials proves the omission, not that the feature works. Neither snapshot establishes the currently published Wix version.
