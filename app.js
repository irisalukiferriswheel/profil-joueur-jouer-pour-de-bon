import { dashboardHtml } from './dashboard-view.js';
const app = document.querySelector('#app');
const previewMode = location.hash.includes('preview-profile') || location.hash.includes('preview-public');
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
  dashboard: { gamesWon: 11, totalWinnings: { CAD: 480 }, paymentsReceived: { CAD: 360 }, pendingPayments: { CAD: 120 }, totalContributions: { CAD: 135 },
    causes: [{ name: 'Jeunesse en mouvement', currency: 'CAD', contributed: 75 }, { name: 'Refuge local', currency: 'CAD', contributed: 60 }] },
  games: [{ slug: 'basketball', nameFr: 'Basketball' }, { slug: 'chess', nameFr: 'Échecs' }]
};

preview.invitations = [{ invitationId: 'demo-invite', competitionId: 'demo-competition', title: 'Soirée échecs pour la jeunesse', startAt: '2027-04-18T23:00:00Z', timezone: 'America/Toronto', locationType: 'online', feeAmount: 20, currency: 'CAD' }];
preview.schedule = [{ registrationId: 'demo-paid', title: 'Basketball pour notre communauté', startAt: '2027-04-22T22:00:00Z', timezone: 'America/Toronto', locationType: 'physical', locationName: 'Centre communautaire — exemple', address: '123, rue Exemple, Sherbrooke', feeAmount: 25, currency: 'CAD', registrationStatus: 'confirmed' }, { registrationId: 'demo-unpaid', title: 'Tournoi amical en ligne', startAt: '2027-04-25T23:00:00Z', timezone: 'America/Toronto', locationType: 'online', feeAmount: 15, currency: 'CAD', registrationStatus: 'pending_payment' }];
let data = null;
let editing = false;
let embedded = window.parent !== window;
let loadTimer;
let publicView = location.hash.startsWith('#/player/') || location.hash.includes('preview-public');
let publicUrl = '';
let parentOrigin = '*';
function trustedOrigin(origin) {
  try { const url = new URL(origin); return url.protocol === 'https:' && ['www.jouerpourdebon.ca', 'jouerpourdebon.ca', 'editor.wix.com', 'yellowpagescanada-website-10110.editor.wix.com'].includes(url.hostname); }
  catch { return false; }
}
let activeRequest = null;
let actionTimer;

function dashboardAction(type, payload) {
  if (activeRequest) return;
  const status = app.querySelector('#action-status');
  if (isPreview()) { status.textContent = 'Démonstration uniquement : aucune inscription ni aucun paiement effectué.'; return; }
  activeRequest = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  app.querySelectorAll('.invitation-form button,.checkout-button').forEach(button => { button.disabled = true; });
  status.textContent = 'Traitement en cours…';
  window.parent.postMessage({ type, requestId: activeRequest, payload }, parentOrigin);
  actionTimer = setTimeout(() => {
    activeRequest = null;
    status.textContent = 'La réponse prend du temps. Actualisez votre calendrier avant de réessayer.';
    app.querySelectorAll('.invitation-form button,.checkout-button').forEach(button => { button.disabled = false; });
  }, 30000);
}

function text(value, max = 200) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function money(amount, currency = 'CAD') { return new Intl.NumberFormat('fr-CA', { style: 'currency', currency }).format(Number(amount) || 0); }
function escapeHtml(value) { return text(String(value), 600).replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' })[c]); }
function isPreview() { return previewMode; }
function normalized(payload) {
  const profile = payload?.profile && typeof payload.profile === 'object' ? payload.profile : {};
  const dashboard = payload?.dashboard && typeof payload.dashboard === 'object' ? payload.dashboard : {};
  return { ...payload, profile, dashboard, games: Array.isArray(payload?.games) ? payload.games : [] };
}
function renderDashboard() {
  app.innerHTML = dashboardHtml(data, { publicView, preview: isPreview(), publicUrl });
  if (publicView) return;
  app.querySelector('#edit').addEventListener('click', renderEditor);
  app.querySelector('#refresh-dashboard').addEventListener('click', () => { if (!isPreview()) requestData(); });
  app.querySelectorAll('.invitation-form').forEach(form => form.addEventListener('submit', event => {
    event.preventDefault();
    dashboardAction('JPDB_PLAYER_REGISTER', { invitationId: form.dataset.invitation, competitionId: form.dataset.competition, customCauseName: new FormData(form).get('cause') });
  }));
  app.querySelectorAll('.checkout-button').forEach(button => button.addEventListener('click', () => dashboardAction('JPDB_PLAYER_CHECKOUT', { registrationId: button.dataset.registration })));
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
  window.parent.postMessage({ type: MESSAGE.save, payload }, parentOrigin);
  app.querySelector('#form-message').textContent = 'Enregistrement…';
}
function renderConnectionMessage() {
  app.innerHTML = `<div class="shell center"><div class="card"><div class="eyebrow">Mon profil joueur</div><h1>Connexion requise</h1><p>Ouvrez votre profil depuis votre compte Jouer pour de bon afin de voir vos données personnelles.</p><a class="primary" href="#/preview-profile">Voir l’aperçu du profil</a></div></div>`;
}
function requestData() { window.parent.postMessage({ type: MESSAGE.request }, parentOrigin); }
function startPrivateProfile() {
  if (!embedded) return renderConnectionMessage();
  window.addEventListener('message', event => {
    if (event.source !== window.parent || !trustedOrigin(event.origin) || !event.data || typeof event.data !== 'object') return;
    parentOrigin = event.origin;
    if (event.data.type === MESSAGE.data) { clearTimeout(loadTimer); publicView = event.data.publicView === true; publicUrl = event.data.publicUrl || ''; data = normalized(event.data.payload); renderDashboard(); }
    if (event.data.type === 'JPDB_PLAYER_ACTION_RESULT' && event.data.requestId === activeRequest) {
      clearTimeout(actionTimer);
      activeRequest = null;
      const result = event.data.payload || {};
      const status = app.querySelector('#action-status');
      if (!status) return;
      app.querySelectorAll('.invitation-form button,.checkout-button').forEach(button => { button.disabled = false; });
      if (result.success && result.checkoutUrl && /^https:\/\//.test(result.checkoutUrl)) {
        status.textContent = 'Votre paiement sécurisé est prêt. Après le paiement, actualisez votre calendrier. ';
        const link = document.createElement('a'); link.href = result.checkoutUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Continuer vers le paiement ↗'; status.append(link);
      } else if (result.success) { requestData(); }
      else { status.textContent = result.code === 'PAYMENT_NOT_CONFIGURED' ? 'Le paiement en ligne n’est pas encore disponible. Votre inscription reste en attente de paiement.' : 'Impossible de compléter cette demande. Vérifiez votre profil et actualisez les événements avant de réessayer.'; }
    }
    if (event.data.type === MESSAGE.saved) { editing = false; requestData(); }
    if (event.data.type === MESSAGE.error) { clearTimeout(loadTimer); app.innerHTML = `<div class="shell center"><div class="card"><h1>Impossible de charger le profil</h1><p>${escapeHtml(event.data.message || 'Réessayez plus tard.')}</p></div></div>`; }
  });
  window.parent.postMessage({ type: MESSAGE.ready }, parentOrigin); requestData();
  loadTimer = setTimeout(renderConnectionMessage, 9000);
}

if (isPreview()) { data = normalized(preview); renderDashboard(); } else startPrivateProfile();

