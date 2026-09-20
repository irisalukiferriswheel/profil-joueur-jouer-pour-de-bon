# Jouer pour de bon — Profil joueur

This GitHub Pages site serves two routes:

- `#/preview-profile` is a public visual preview with fictional data.
- `#/my-profile` is the private embed used by the Wix members page. It receives a signed-in member's data through the Wix HTML Component message bridge.

## Wix source URL

After GitHub Pages is enabled, set the HTML component source to:

`https://irisalukiferriswheel.github.io/profil-joueur-jouer-pour-de-bon/#/my-profile`

Set its Wix element ID to `playerDashboardEmbed`.

The page-code bridge must use the same message types and call `getMyPlayerOnboardingForm` / `savePlayerOnboarding` from `backend/playerOnboarding.web`.

