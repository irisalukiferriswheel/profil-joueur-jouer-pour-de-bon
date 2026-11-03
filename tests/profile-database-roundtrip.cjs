// Local contract qualification, NOT a Supabase/PostgREST/Wix deployment test.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const { PGlite } = require('@electric-sql/pglite');
const fixture = name => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
const clone = value => JSON.parse(JSON.stringify(value));
const complete = {
  firstName: 'Synthetic', lastName: 'Player', alias: 'Original fixture',
  email: 'fixture@example.invalid', phone: '5555555555', birthDate: '1990-01-01',
  streetAddress: 'Synthetic address', city: 'Fixture city', regionCode: 'QC',
  postalCode: 'H0H0H0', countryCode: 'CA', payoutContactPreference: 'email',
  emergencyContactName: 'Synthetic contact', emergencyContactPhone: '5555555555',
  games: ['chess'], isPublic: false
};

// Translate only the query shapes used by the pinned API to parameterized SQL.
// Authentication/HTTP/PostgREST are substitutes; SQL constraints and rows are real PGlite.
function databaseClient(db, fault) {
  return { from(table) {
    assert.ok(['players', 'games', 'player_games', 'game_suggestions'].includes(table));
    let operation = 'select', values, columns, single = false;
    const filters = [];
    const query = {
      select(value) { columns = value; return query; },
      eq(key, value) { filters.push([key, value]); return query; },
      in(key, value) { filters.push([key, value]); return query; },
      upsert(value, options) { assert.equal(options.onConflict, 'wix_member_id'); operation = 'upsert'; values = [value]; return query; },
      insert(value) { operation = 'insert'; values = Array.isArray(value) ? value : [value]; return query; },
      delete() { operation = 'delete'; return query; },
      single() { single = true; return query; },
      maybeSingle() { single = true; return query; },
      async then(resolve, reject) {
        try {
          if (fault.failGames && table === 'player_games' && operation === 'insert') throw new Error('Synthetic game insertion failure');
          const quote = key => { assert.match(key, /^[a-z_]+$/); return '"' + key + '"'; };
          const params = [];
          const where = filters.length ? ' WHERE ' + filters.map(([key, value]) => {
            params.push(value); return `${quote(key)} ${Array.isArray(value) ? '= ANY' : '='} ($${params.length})`;
          }).join(' AND ') : '';
          let sql;
          if (operation === 'select') sql = `SELECT * FROM ${table}${where}`;
          else if (operation === 'delete') sql = `DELETE FROM ${table}${where}`;
          else {
            const keys = Object.keys(values[0]);
            const tuples = values.map(row => '(' + keys.map(key => { params.push(row[key]); return '$' + params.length; }).join(',') + ')');
            sql = `INSERT INTO ${table} (${keys.map(quote).join(',')}) VALUES ${tuples.join(',')}`;
            if (operation === 'upsert') sql += ' ON CONFLICT (wix_member_id) DO UPDATE SET ' + keys.filter(key => key !== 'wix_member_id').map(key => `${quote(key)}=EXCLUDED.${quote(key)}`).join(',');
            sql += ' RETURNING *';
          }
          const result = await db.query(sql, params);
          // PostgREST JSON serializes SQL DATE as YYYY-MM-DD; PGlite uses Date.
          for (const row of result.rows) {
            if (row.birth_date instanceof Date) row.birth_date = row.birth_date.toISOString().slice(0, 10);
          }
          if (table === 'players' && operation === 'select' && columns.includes('player_games')) {
            for (const row of result.rows) row.player_games = (await db.query('SELECT json_build_object(\'slug\', g.slug) AS games FROM player_games pg JOIN games g ON g.id=pg.game_id WHERE pg.player_id=$1', [row.id])).rows;
          }
          resolve({ data: single ? result.rows[0] || null : result.rows, error: null });
        } catch (error) { resolve({ data: null, error: { message: error.message } }); }
      }
    };
    return query;
  } };
}

async function harness(t) {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(fixture('profile-reduced-schema.sql'));
  const fault = {}, routes = {}, calls = [];
  const api = { hasValidWixIntegrationKey: key => key === 'synthetic-key' };
  const source = stripTypeScriptTypes(fixture('api-main-player-onboarding.ts').replace(/^import .*;\r?\n/gm, '')).replace('export async function', 'async function');
  vm.runInNewContext(source + '\nglobalThis.register = registerPlayerOnboardingRoutes;', api);
  await api.register({ supabase: databaseClient(db, fault), get: (url, fn) => routes['GET ' + url] = fn, post: (url, fn) => routes['POST ' + url] = fn });
  async function request(method, url, body, key = 'synthetic-key') {
    const parsed = new URL(url, 'https://fixture.invalid');
    calls.push(method + ' ' + parsed.pathname);
    if (parsed.pathname === '/v1/players/games') return { status: 200, body: { data: [{ slug: 'chess', nameFr: 'Échecs' }] } };
    let status = 200, result;
    const reply = { code(n) { status = n; return reply; }, header() { return reply; }, send(value) { result = clone(value); return reply; } };
    await routes[method + ' ' + parsed.pathname.replace(/^\/v1/, '')]({ body, query: Object.fromEntries(parsed.searchParams), headers: { 'x-jpdb-integration-key': key }, log: { error() {} } }, reply);
    return { status, body: result };
  }
  assert.equal((await request('POST', '/v1/players/onboarding', { ...complete, wixMemberId: 'fixture-member' })).status, 200);
  const wix = {
    Permissions: { SiteMember: 'member' }, webMethod: (_, fn) => fn,
    currentMember: { getMember: async () => ({ _id: 'fixture-member' }) },
    getSecret: async key => key === 'JPDB_API_BASE_URL' ? 'https://fixture.invalid' : 'synthetic-key',
    fetch: async (url, options) => {
      const result = await request(options.method, url, options.body && JSON.parse(options.body), options.headers['x-jpdb-integration-key']);
      return { ok: result.status < 300, status: result.status, text: async () => JSON.stringify(result.body) };
    }, console: { error() {} }
  };
  vm.runInNewContext(fixture('wix-main-playerOnboarding.js').replace(/^import .*;\r?\n/gm, '').replaceAll('export const ', 'const ') + '\nglobalThis.load = getMyPlayerOnboardingForm; globalThis.save = savePlayerOnboarding;', wix);
  const pending = [], sent = [], hostSent = [], elements = new Map();
  let receive, hostReceive;
  const parent = { postMessage: message => { sent.push(clone(message)); pending.push(() => hostReceive({ data: clone(message) })); } };
  const app = { innerHTML: '', querySelector: selector => {
    if (!elements.has(selector)) elements.set(selector, { addEventListener(type, callback) { this[type] = callback; } });
    return elements.get(selector);
  } };
  const fields = { alias: 'Saved synthetic alias', city: 'Québec', isPublic: 'on' };
  const browser = { document: { querySelector: () => app }, window: { parent, addEventListener: (_, fn) => receive = fn }, location: { hash: '#/my-profile' }, Intl, setTimeout: () => 1, clearTimeout() {}, FormData: class { get(key) { return fields[key] || ''; } } };
  const component = { onMessage: fn => hostReceive = fn, postMessage: message => { hostSent.push(clone(message)); pending.push(() => receive({ source: parent, data: clone(message) })); } };
  const $w = () => component; $w.onReady = fn => fn();
  vm.runInNewContext(fixture('wix-main-profile-page.js').replace(/^import \{[\s\S]*?from 'backend\/playerOnboarding.web';/, ''), { $w, getMyPlayerOnboardingForm: wix.load, savePlayerOnboarding: wix.save });
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8') + '\nglobalThis.edit=renderEditor; globalThis.submit=saveProfile;', browser);
  async function drain() { while (pending.length) await pending.shift()(); }
  await drain();
  return { db, fault, request, wix, app, browser, fields, calls, sent, hostSent, drain,
    submit() { browser.edit(); browser.submit({ preventDefault() {}, currentTarget: {} }); } };
}

test('actual profile and pinned Wix/API code save essential fields to SQL and reload the same row', async t => {
  const h = await harness(t);
  const before = (await h.db.query('SELECT id FROM players')).rows;
  h.submit(); await h.drain();
  const row = (await h.db.query('SELECT id, alias, city, is_public, first_name FROM players')).rows;
  assert.equal(row.length, 1); assert.equal(row[0].id, before[0].id);
  assert.equal(row[0].alias, h.fields.alias); assert.equal(row[0].city, h.fields.city);
  assert.equal(row[0].is_public, true); assert.equal(row[0].first_name, complete.firstName);
  assert.equal((await h.db.query('SELECT count(*)::integer AS n FROM player_games')).rows[0].n, 1);
  assert.deepEqual(h.sent.find(m => m.type === 'JPDB_PROFILE_EDITOR_SAVE').payload.games, ['chess']);
  assert.ok(h.hostSent.some(m => m.type === 'JPDB_PROFILE_EDITOR_SAVED'));
  assert.match(h.app.innerHTML, /Saved synthetic alias/);
  const fresh = await h.wix.load();
  assert.equal(fresh.profile.alias, h.fields.alias); assert.equal(fresh.profile.city, h.fields.city);
  assert.equal(fresh.profile.games[0].slug, 'chess');
});

test('blank essential field is rejected before writes and does not display saved data', async t => {
  const h = await harness(t); h.fields.city = '  ';
  const posts = h.calls.filter(c => c.startsWith('POST')).length;
  h.submit(); await h.drain();
  assert.equal(h.calls.filter(c => c.startsWith('POST')).length, posts);
  assert.equal((await h.db.query('SELECT alias FROM players')).rows[0].alias, complete.alias);
  assert.equal(h.hostSent.some(m => m.type === 'JPDB_PROFILE_EDITOR_SAVED'), false);
});

test('Wix uses trusted member identity; invalid integration and inactive games do not write', async t => {
  const h = await harness(t);
  assert.equal((await h.request('POST', '/v1/players/onboarding', { ...complete, wixMemberId: 'other' }, 'wrong-key')).status, 401);
  assert.equal((await h.request('POST', '/v1/players/onboarding', { ...complete, wixMemberId: 'fixture-member', games: ['retired'] })).status, 400);
  assert.equal((await h.wix.save({ ...complete, alias: 'Trusted fixture', wixMemberId: 'forged' })).success, true);
  assert.deepEqual((await h.db.query('SELECT wix_member_id, alias FROM players')).rows, [{ wix_member_id: 'fixture-member', alias: 'Trusted fixture' }]);
});

test('characterization: current API main can partially save before game insertion fails', async t => {
  const h = await harness(t); h.fault.failGames = true;
  h.submit(); await h.drain();
  assert.equal(h.hostSent.some(m => m.type === 'JPDB_PROFILE_EDITOR_SAVED'), false);
  assert.equal((await h.db.query('SELECT alias FROM players')).rows[0].alias, h.fields.alias);
  assert.equal((await h.db.query('SELECT count(*)::integer AS n FROM player_games')).rows[0].n, 0);
  // This passing characterization exposes an unresolved atomicity defect, not a pass for production.
});
