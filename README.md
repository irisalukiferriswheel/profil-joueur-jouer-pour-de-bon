# Jouer pour de bon — Profil joueur

This GitHub Pages site serves two routes:

- `#/preview-profile` is a public visual preview with fictional data.
- `#/my-profile` is the private embed used by the Wix members page. It receives a signed-in member's data through the Wix HTML Component message bridge.

## Wix source URL

After GitHub Pages is enabled, set the HTML component source to:

`https://irisalukiferriswheel.github.io/profil-joueur-jouer-pour-de-bon/#/my-profile`

Set its Wix element ID to `playerDashboardEmbed`.

The page-code bridge uses `getMyPlayerDashboard` / `getPublicPlayerDashboard` and the SiteMember methods in `backend/playerDashboard.web`, plus `savePlayerOnboarding` for existing profile edits.

## Invitation responses

Pending invitations show separate Accept and Decline buttons. The iframe emits `JPDB_PLAYER_INVITATION_RESPONSE` with `{requestId,payload:{invitationId,response:'accepted'|'declined'}}`. Wix derives the current member identity and calls `POST /v1/wix/invitations/:id/respond`, then replies with `JPDB_PLAYER_ACTION_RESULT` and the matching request ID. Success only refreshes dashboard data; it never registers, creates checkout, or charges the player.

The dashboard returns `invitationStatus` and `canRegister` for each invitation. Accepted invitations show the separate registration link only when `canRegister === true` and the server-provided `registrationUrl` is on `https://www.jouerpourdebon.ca/competitions?jpdbEvent=<event UUID>`. The event UUID must come from the API; a competition ID is not an event ID. The registration page rechecks invitation/access rules. Declined/revoked invitations are omitted by the API and have no actions if present in an old response.

No legacy `JPDB_PLAYER_REGISTER` message is emitted by this frontend. Deploy the matching API and Wix bridge before releasing the frontend. Preview mode changes fictional invitation state only and cannot create a real invitation, registration or payment.

Run focused verification with `node --test dashboard-view.test.mjs`.

After a successful profile save, Wix may send `JPDB_PROFILE_EDITOR_SAVED` with `canContinueToEvent: true` when validated event context remains in the URL or session. The private dashboard then offers an explicit Continue button that sends `JPDB_PROFILE_CONTINUE_EVENT` with a request ID. The profile page requires a successful save in this page session before calling the API owner's `returnToEventAfterProfileSave` helper. Saving alone never navigates, registers or pays. This depends on the coordinated `public/eventRegistrationBridge.js` and `public/eventRegistrationPage.js` modules from the registration owner.
