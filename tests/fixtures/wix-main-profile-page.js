import {
  getMyPlayerOnboardingForm,
  savePlayerOnboarding
} from 'backend/playerOnboarding.web';

$w.onReady(() => {
  const embed = $w('#playerDashboardEmbed');

  let saving = false;
  let loading;

  const send = (message) => embed.postMessage(message);

  const load = async () => {
    if (!loading) loading = getMyPlayerOnboardingForm();

    try {
      send({
        type: 'JPDB_PROFILE_EDITOR_DATA',
        payload: await loading
      });
    } catch {
      send({
        type: 'JPDB_PROFILE_EDITOR_ERROR',
        message: 'Impossible de charger votre profil.'
      });
    } finally {
      loading = undefined;
    }
  };

  embed.onMessage(async (event) => {
    const message = event.data;
    if (!message || typeof message !== 'object') return;

    if (
      message.type === 'JPDB_PROFILE_EDITOR_READY' ||
      message.type === 'JPDB_PROFILE_EDITOR_REQUEST_DATA'
    ) {
      if (!saving) await load();
      return;
    }

    if (message.type === 'JPDB_PROFILE_EDITOR_SAVE' && !saving) {
      saving = true;

      try {
        const result = await savePlayerOnboarding(message.payload || {});
        if (!result?.success) throw new Error('Save failed');

        loading = undefined;
        send({ type: 'JPDB_PROFILE_EDITOR_SAVED' });
      } catch {
        send({
          type: 'JPDB_PROFILE_EDITOR_ERROR',
          message: 'Impossible d’enregistrer le profil. Réessayez.'
        });
      } finally {
        saving = false;
      }
    }
  });

  embed.src =
    'https://irisalukiferriswheel.github.io/profil-joueur-jouer-pour-de-bon/#/my-profile';
});
