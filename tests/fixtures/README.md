# Pinned Wix contract fixtures

Read-only source snapshots for deterministic contract characterization. They are not runtime code for this embed and contain no production credentials or account data. Tests strip imports and inject synthetic member, secret, and network stubs; no real API call is made.

- wix-main-playerOnboarding.js: irisalukiferriswheel/jpdbwebsite-wix at 7f83a72, src/backend/playerOnboarding.web.js.
- wix-checkpoint-playerProfileEdits.js: same repository at 2168b796857eed6c7d4d84deff29d3f35da2712a, src/backend/playerProfileEdits.web.js.

A passing characterization test that documents omitted socials proves the omission, not that the feature works. Neither snapshot establishes the currently published Wix version.

## Essential SQL round-trip fixtures (2026-11-03)

- api-main-player-onboarding.ts: jouer-pour-de-bon-api at
  0538724009585fb19b3d732afaa745f075f76e4e, src/routes/player-onboarding.ts.
- wix-main-profile-page.js: jpdbwebsite-wix at
  7f83a721910b478b52e7f398c6ee43018e29cfc7, src/pages/Mon profil de joueur.m529q.js.
- profile-reduced-schema.sql: API candidate 3c1a7205c03c663fe13a93cb0740dc98b125a109,
  tests/local/schema-fixture.sql. Inferred synthetic schema, NOT deployed schema.

The database-roundtrip test executes the pinned sources and actual app.js against
PGlite. Only SQL runs against a database; Wix auth, DOM, HTTP and PostgREST are
substitutes. No credentials, remote writes or production schema changes are used.
The current-main partial-save characterization intentionally documents a defect.
See ESSENTIAL-PERSISTENCE-QUALIFICATION.md for remaining production gates.

- api-atomic-player-onboarding.ts and player-onboarding-atomic.sql: narrow API
  candidate dcbf365fc2b0909b28203c8089c5e498ac8b4172 on
  fix/essential-profile-atomic-save, src/routes/player-onboarding.ts and
  docs/proposals/player-onboarding-atomic.sql respectively. These fixtures test
  an unapplied candidate, not current main. The SQL is installed only inside
  the synthetic PGlite test database.
