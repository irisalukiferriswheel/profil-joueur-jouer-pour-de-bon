const app = document.querySelector('#app');
const MESSAGE = {
  ready: 'JPDB_PROFILE_EDITOR_READY', request: 'JPDB_PROFILE_EDITOR_REQUEST_DATA',
  data: 'JPDB_PROFILE_EDITOR_DATA', save: 'JPDB_PROFILE_EDITOR_SAVE',
  saved: 'JPDB_PROFILE_EDITOR_SAVED', error: 'JPDB_PROFILE_EDITOR_ERROR'
};

const preview = {
  member: { firstName: 'Camille', lastName: 'Martin', nickname: 'Camille' },
  profile: { alias: 'CamilleM', city: 'Sherbrooke', games: ['basketball', 'chess'], isPublic: true,
    wantsToOrganize: true, interestedInVolunteering: false,
    socials: [{ platform: 'instagram', url: 'https://instagram.com/' }, { platform: 'website', url: 'https://example.com' }] },
  dashboard: { gamesPlayed: 18, gamesWon: 11, totalContributions: { CAD: 135 },
    causes: [{ name: 'Jeunesse en mouvement', currency: 'CAD', contributed: 75 }, { name: 'Refuge local', currency: 'CAD', contributed: 60 }] },
  games: [{ slug: 'basketball', nameFr: 'Basketball' }, { slug: 'chess', nameFr: 'Échecs' }]
};

let data = null;
let editing = false;
let embedded = window.parent !== window;
let loadTimer;

function text(value, max = 200) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function money(amount, currency = 'CAD') { return new Intl.NumberFormat('fr-CA', { style: 'currency', currency }).format(Number(amount) || 0); }
function escapeHtml(value) { return text(String(value), 600).replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' })[c]); }
function isPreview() { return location.hash.includes('preview-profile'); }
function normalized(payload) {
  const profile = payload?.profile && typeof payload.profile === 'object' ? payload.profile : {};
  const dashboard = payload?.dashboard && typeof payload.dashboard === 'object' ? payload.dashboard : {};
  return { ...payload, profile, dashboard, games: Array.isArray(payload?.games) ? payload.games : [] };
}
function gamesList() {
  return (data.profile.games || []).map(game => {
    const slug = typeof game === 'string' ? game : game?.slug;
    return data.games.find(item => item.slug === slug)?.nameFr || slug;
  }).filter(Boolean);
}
function socialLinks() {
  return (data.profile.socials || []).filter(link => /^https:\/\//.test(link?.url || '')).map(link =>
    `<a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.platform)}</a>`).join('');
}
function dashboard() {
  const impact = data.dashboard || {};
  const totals = Object.entries(impact.totalContributions || {}).map(([currency, amount]) => money(amount, currency)).join(' · ') || '0 $';
  const causes = Array.isArray(impact.causes) ? impact.causes : [];
  return `<section class="stats" aria-label="Mon impact">
    <article><span>🏆</span><strong>${Number.isFinite(impact.gamesPlayed) ? impact.gamesPlayed : '—'}</strong><small>Parties jouées</small></article>
    <article><span>✨</span><strong>${Number.isFinite(impact.gamesWon) ? impact.gamesWon : '—'}</strong><small>Parties gagnées</small></article>
    <article><span>♥</span><strong>${totals}</strong><small>Contributions aux causes</small></article>
  </section>
  <section class="card causes"><h2>Causes soutenues</h2>${causes.length ? `<ul>${causes.map(cause => `<li><span>${escapeHtml(cause.name)}</span><strong>${money(cause.contributed, cause.currency)}</strong></li>`).join('')}</ul>` : '<p>Aucune contribution confirmée pour le moment.</p>'}</section>`;
}
function renderDashboard() {
  const profile = data.profile;
  const name = text(profile.alias) || text(data.member?.nickname) || text(data.member?.firstName) || 'Votre profil';
  document.title = `${name} | Jouer pour de bon`;
  app.innerHTML = `<div class="shell">
    ${isPreview() ? '<div class="preview-banner">Aperçu public — données fictives</div>' : ''}
    <header><div class="eyebrow">Espace joueur</div><h1>Mon profil joueur</h1><p>Votre espace pour jouer, participer et faire une différence.</p></header>
    <section class="identity card"><div class="avatar">${escapeHtml(name.slice(0,2).toUpperCase())}</div><div class="identity-copy"><h2>${escapeHtml(name)}</h2><p>⌖ ${escapeHtml(profile.city || 'Ville non renseignée')}</p><span class="pill">${profile.isPublic ? 'Profil visible dans l’annuaire' : 'Profil privé'}</span>${socialLinks() ? `<div class="socials">${socialLinks()}</div>` : ''}</div><button id="edit" class="primary">Modifier mon profil</button></section>
    ${dashboard()}
    <div class="grid"><section class="card"><h2>Mes jeux</h2><div class="chips">${gamesList().map(game => `<span>${escapeHtml(game)}</span>`).join('') || '<p>Ajoutez vos jeux à votre profil.</p>'}</div></section>
    <section class="card"><h2>Ma participation</h2><p>Organiser des parties : <strong>${profile.wantsToOrganize ? 'Intéressé·e' : 'Non sélectionné'}</strong></p><p>Bénévolat : <strong>${profile.interestedInVolunteering ? 'Intéressé·e' : 'Non sélectionné'}</strong></p></section></div>
    <p class="note">Les parties, victoires et contributions proviennent des données confirmées. Elles ne sont pas modifiables ici.</p>
  </div>`;
  app.querySelector('#edit').addEventListener('click', renderEditor);
}
function renderEditor() {
  editing = true;
  const p = data.profile;
  const socials = Object.fromEntries((p.socials || []).map(link => [link.platform, link.url]));
  app.innerHTML = `<div class="shell"><button id="back" class="link">← Retour au profil</button><header><div class="eyebrow">Espace joueur</div><h1>Modifier mon profil</h1><p>Vos coordonnées restent privées. Les liens sociaux sont facultatifs et publics.</p></header>
  <form id="profile-form" class="card form"><label>Alias public<input name="alias" value="${escapeHtml(p.alias || '')}" required></label><label>Ville<input name="city" value="${escapeHtml(p.city || '')}"></label><label>Site Web<input name="website" type="url" placeholder="https://…" value="${escapeHtml(socials.website || '')}"></label><label>Instagram<input name="instagram" type="url" placeholder="https://…" value="${escapeHtml(socials.instagram || '')}"></label><label>TikTok<input name="tiktok" type="url" placeholder="https://…" value="${escapeHtml(socials.tiktok || '')}"></label><label>YouTube<input name="youtube" type="url" placeholder="https://…" value="${escapeHtml(socials.youtube || '')}"></label><label class="toggle"><input name="isPublic" type="checkbox" ${p.isPublic ? 'checked' : ''}> Afficher mon profil dans l’annuaire public</label><p id="form-message" class="message"></p><button class="primary" type="submit">Enregistrer mon profil</button></form></div>`;
  app.querySelector('#back').addEventListener('click', () => { editing = false; renderDashboard(); });
  app.querySelector('#profile-form').addEventListener('submit', saveProfile);
}
function saveProfile(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const socials = ['website', 'instagram', 'tiktok', 'youtube'].map(platform => ({ platform, url: text(form.get(platform), 500) })).filter(link => /^https:\/\//.test(link.url));
  const payload = { ...data.profile, alias: text(form.get('alias'), 100), city: text(form.get('city'), 150), isPublic: form.get('isPublic') === 'on', socials };
  if (isPreview()) { data.profile = payload; editing = false; renderDashboard(); return; }
  window.parent.postMessage({ type: MESSAGE.save, payload }, '*');
  app.querySelector('#form-message').textContent = 'Enregistrement…';
}
function renderConnectionMessage() {
  app.innerHTML = `<div class="shell center"><div class="card"><div class="eyebrow">Mon profil joueur</div><h1>Connexion requise</h1><p>Ouvrez votre profil depuis votre compte Jouer pour de bon afin de voir vos données personnelles.</p><a class="primary" href="#/preview-profile">Voir l’aperçu du profil</a></div></div>`;
}
function requestData() { window.parent.postMessage({ type: MESSAGE.request }, '*'); }
function startPrivateProfile() {
  if (!embedded) return renderConnectionMessage();
  window.addEventListener('message', event => {
    if (event.source !== window.parent || !event.data || typeof event.data !== 'object') return;
    if (event.data.type === MESSAGE.data) { clearTimeout(loadTimer); data = normalized(event.data.payload); renderDashboard(); }
    if (event.data.type === MESSAGE.saved) { editing = false; requestData(); }
    if (event.data.type === MESSAGE.error) app.innerHTML = `<div class="shell center"><div class="card"><h1>Impossible de charger le profil</h1><p>${escapeHtml(event.data.message || 'Réessayez plus tard.')}</p></div></div>`;
  });
  window.parent.postMessage({ type: MESSAGE.ready }, '*'); requestData();
  loadTimer = setTimeout(renderConnectionMessage, 9000);
}

if (isPreview()) { data = normalized(preview); renderDashboard(); } else startPrivateProfile();

