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
  let generation = 0;
  const reset = () => { generation++; busy = false; state = 'signed-out'; form = null; return { state, form }; };
  const run = async (operation) => {
    if (busy) return { state, busy: true };
    const started = generation;
    const current = () => { if (started !== generation) throw Object.assign(new Error(), { code: 'STALE_SESSION' }); };
    busy = true;
    try { return await operation(current); }
    catch (error) {
      if (started !== generation) return { state: 'discarded', form: null };
      if (['SESSION_EXPIRED', 'LOGIN_REQUIRED', 'UNAUTHENTICATED'].includes(error.code)) return { ...reset(), code: 'LOGIN_REQUIRED' };
      state = 'error'; return { state, code: error.code || 'UNAVAILABLE', form };
    }
    finally { if (started === generation) busy = false; }
  };
  const load = async (current) => {
    form = null; // Never retain a previous account while a new session is loading.
    const loaded = await adapter.load();
    current();
    form = loaded;
    state = form.basicsComplete ? 'complete' : 'editing';
    return { state, form };
  };
  return {
    logout: reset,
    resume: () => run(load),
    authenticate: () => run(async (current) => {
      state = 'authenticating';
      form = null;
      const result = await adapter.authenticate();
      current();
      if (result.status === 'pending') { state = 'verification-pending'; return { state }; }
      if (result.status !== 'authenticated') { state = 'signed-out'; return { state }; }
      return load(current);
    }),
    save: input => run(async (current) => {
      if (!form) return { state: 'signed-out' };
      const validated = validateBasics(input, form.games, form.cities);
      if (!validated.value) return { state: 'editing', code: validated.code };
      state = 'saving';
      // Adapter must re-derive identity server-side on every save and atomically
      // upsert the existing profile + interests + preferences by member identity.
      await adapter.save(validated.value);
      current();
      return load(current);
    })
  };
}

