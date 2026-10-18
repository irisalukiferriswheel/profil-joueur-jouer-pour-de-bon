# Existing profile: additive fictional journey review

Verified live mapping on 2026-10-18: the iframe on
`https://www.jouerpourdebon.ca/mon-profil-de-joueur` has source
`https://irisalukiferriswheel.github.io/profil-joueur-jouer-pour-de-bon/#/my-profile`.
This repository is therefore the existing player profile, not the separate organizer test screen.

Baseline: main `d3b697a85895314e6efdf959e89287763eb0cef2`. The open PR #2
dashboard redesign was inspected but is not incorporated. `index.html`, `app.js`,
`styles.css`, workflows and the Wix embed are unchanged.

The proposed additive publication target is `/journey-preview.html` in this repo.
It reuses the original profile styles and a copy of its renderer, always forced
to fictional preview mode. Identity, statistics, causes, games, participation,
social links and all original editor fields remain. Local preview edits remain
in memory. The appended section contains fictional invitations, accept/decline,
joined events and a provisional bracket. It never requests or saves private Wix
profile data and introduces no backend or real invitation operation.

New files: journey-preview.html, profile-preview-app.js, journey-adapter.js,
profile-events.css, tests/journey.cjs and this review document.

## Review journey after additive publication

1. Open the organizer `/preview.html`, choose fictional people, set capacity 2,
   and simulate publication. The organizer's currently published links still
   point to its working player-space-preview.html, not this unpublished target.
2. In the SAME TAB navigate to this repository's `/journey-preview.html`.
   Accept as Atlas; switch to Camille and decline.
3. Follow the test calendar link; select Nova, open the event and join.
   A second join is rejected; Robin is rejected because capacity is full.
4. In the same tab return to this preview, select Atlas and view the provisional
   bracket. Reset removes the fictional session snapshot.

All three GitHub Pages paths share the same origin and can share the synthetic
sessionStorage key `jpdb-fictional-journey-v1`. It contains only capacity, open,
numeric fixture invitation statuses and registered numeric fixture IDs. No real
title, public player identifier, name, token or private profile is stored.
This does not imply that the Wix top-level origin shares this state. Embedded
storage may be partitioned or blocked. Links target `_top` for deliberate
standalone navigation. Use the standalone same-tab harness for this review.

## Validation

Run `node tests/journey.cjs` with Playwright installed (or PLAYWRIGHT_MODULE set
to its absolute module path) and Microsoft Edge available. Optional
SCREENSHOT_DIR captures desktop and mobile screenshots. The test intercepts
both repo URLs with local files, using sibling organizer-eligibility as the
organizer fixture. No production mutations are made.

Passed: original sections and editor field parity, local edit, actual organizer
simulation carried into the profile, accept/decline, calendar join, duplicate
and full rejection, joined-event bracket, FR/EN new UI, reload/reset, mobile
overflow, embedded no private bridge requests/saves, zero write requests.
The inherited existing profile is French; only the added test controls offer
FR/EN. Test behavior does not prove backend concurrency or production enrollment.

## Publication scope and remaining work

Await review of this exact additive scope before pushing or publishing it.
Use a normal PR and Pages workflow. Verify the new URL first, then update
organizer and calendar test links in a separate narrow change. Do not replace
the live profile index or Wix embed as part of this preview. Real invitations,
registration, ownership/capacity enforcement and durable brackets remain
separate backend activation work and are not claimed complete here.
