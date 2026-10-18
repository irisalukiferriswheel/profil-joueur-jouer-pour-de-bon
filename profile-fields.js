// Shared by the existing profile editor and the local signup preview.
export function gameSlugs(games = []) {
  return [...new Set(games.map(game => typeof game === 'string' ? game : game?.slug).filter(Boolean))];
}
export function validateBasics(input, games, cities) {
  const alias = typeof input.alias === 'string' ? input.alias.trim() : '';
  if (!alias || alias.length > 100) return { code: 'ALIAS_REQUIRED' };
  const selected = gameSlugs(input.games);
  if (!selected.length || selected.length > 50 || selected.some(slug => !games.some(game => game.slug === slug))) return { code: 'GAMES_REQUIRED' };
  const city = cities.find(city => city === input.city);
  if (!city) return { code: 'CITY_REQUIRED' };
  return { value: { alias, city, games: selected, isPublic: input.isPublic === true, invitationEmails: input.invitationEmails === true } };
}

// Authentication is supplied by Wix. Never store or receive passwords here.
export function createSignupFlow(adapter) {
  let busy = false;
  let state = 'signed-out';
  let form = null;
  const run = async (operation) => {
    if (busy) return { state, busy: true };
    busy = true;
    try { return await operation(); }
    catch (error) { state = error.code === 'SESSION_EXPIRED' ? 'signed-out' : 'error'; return { state, code: error.code || 'UNAVAILABLE', form }; }
    finally { busy = false; }
  };
  const load = async () => {
    form = await adapter.load();
    state = form.basicsComplete ? 'complete' : 'editing';
    return { state, form };
  };
  return {
    resume: () => run(load),
    authenticate: () => run(async () => {
      state = 'authenticating';
      form = null;
      const result = await adapter.authenticate();
      if (result.status === 'pending') { state = 'verification-pending'; return { state }; }
      if (result.status !== 'authenticated') { state = 'signed-out'; return { state }; }
      return load();
    }),
    save: input => run(async () => {
      if (!form) return { state: 'signed-out' };
      const validated = validateBasics(input, form.games, form.cities);
      if (!validated.value) return { state: 'editing', code: validated.code };
      state = 'saving';
      // Adapter must re-derive identity server-side on every save and atomically
      // upsert the existing profile + interests + preferences by member identity.
      await adapter.save(validated.value);
      return load();
    })
  };
}

