# Minimal game-interest editor patch

Branch `codex/minimal-profile-games` starts at published profile main `271a01a` (PR #4). It is independent of the broader unmerged PR #2 and the earlier `profile-signup` branch.

Only the game selector/save payload and its styling change in `app.js` and `profile-preview-app.js`. Both use the existing backend `games.slug` catalog, recognize stored string/object game values, and require at least one selection. Alias, city, social links, visibility, original dashboard and additive journey remain present. No new account/page/data model, notification behavior, redirect or signup activation is included. The existing Wix save already accepts game slugs, so this UI patch does not require PR #2 or the new restricted-edit backend method.

Local browser checks pass for both original `#/preview-profile` and the published additive `journey-preview.html`: unchanged original fields, game selection with keyboard, empty-selection feedback, save/re-edit, 390px layout, and no console errors or network writes. Existing accessibility regression passes. Test fixtures are local; no live member/profile save was performed.

Run `PLAYWRIGHT_MODULE=<installed-playwright-path> node tests/profile-games.cjs` and `node tests/accessibility.cjs` with Chrome/Edge available. Screenshots are in task-4/minimal-original-editor.png and minimal-additive-editor.png. The original repository journey test also runs with its organizer fixture path pointed read-only to the existing isolated organizer checkout; no worker files are changed.

This patch is ready for independent code review, not published. The current live onboarding save's non-atomic persistence is addressed separately by the local API proposal. City remains its existing text field; compact signup and durable email preferences remain pending.
