import { gameSlugs } from './profile-fields.js';
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
let savingProfile = false;
let saveRequestId = null;
let profileSaveTimer;
let embedded = window.parent !== window;
let loadTimer;
let publicView = location.hash.startsWith('#/player/') || location.hash.includes('preview-public');
let publicUrl = '';
let canContinueToEvent = false;
let parentOrigin = '*';
function trustedOrigin(origin) {
  try { const url = new URL(origin); return url.protocol === 'https:' && ['www.jouerpourdebon.ca', 'jouerpourdebon.ca', 'editor.wix.com', 'yellowpagescanada-website-10110.editor.wix.com'].includes(url.hostname); }
  catch { return false; }
}
let activeRequest = null;
let activeAction = null;
let actionTimer;

function dashboardAction(type, payload) {
  if (activeRequest) return;
  const status = app.querySelector('#action-status');
  if (isPreview()) {
    if (type === 'JPDB_PLAYER_INVITATION_RESPONSE') {
      const invitation = data.invitations.find(item => item.invitationId === payload.invitationId);
      if (invitation && payload.response === 'accepted') invitation.invitationStatus = 'accepted';
      if (payload.response === 'declined') data.invitations = data.invitations.filter(item => item.invitationId !== payload.invitationId);
      renderDashboard();
    }
    app.querySelector('#action-status').textContent = 'Démonstration uniquement : aucune inscription ni aucun paiement effectué.';
    return;
  }
  activeRequest = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  activeAction = type;
  app.querySelectorAll('.invitation-response,.checkout-button').forEach(button => { button.disabled = true; });
  status.textContent = 'Traitement en cours…';
  window.parent.postMessage({ type, requestId: activeRequest, payload }, parentOrigin);
  actionTimer = setTimeout(() => {
    activeRequest = null;
    activeAction = null;
    status.textContent = 'La réponse prend du temps. Actualisez votre calendrier avant de réessayer.';
    app.querySelectorAll('.invitation-response,.checkout-button').forEach(button => { button.disabled = false; });
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
  app.innerHTML = dashboardHtml(data, { publicView, preview: isPreview(), publicUrl, canContinueToEvent });
  if (publicView) return;
  app.querySelector('#edit').addEventListener('click', renderEditor);
  app.querySelector('#continue-event')?.addEventListener('click', () => dashboardAction('JPDB_PROFILE_CONTINUE_EVENT', {}));
  app.querySelector('#refresh-dashboard').addEventListener('click', () => { if (!isPreview()) requestData(); });
  app.querySelectorAll('.invitation-response').forEach(button => button.addEventListener('click', () => {
    dashboardAction('JPDB_PLAYER_INVITATION_RESPONSE', { invitationId: button.dataset.invitation, response: button.dataset.response });
  }));
  app.querySelectorAll('.checkout-button').forEach(button => button.addEventListener('click', () => dashboardAction('JPDB_PLAYER_CHECKOUT', { registrationId: button.dataset.registration })));
}
function renderEditor() {
  editing = true;
  const p = data.profile;
  const socials = Object.fromEntries((p.socials || []).map(link => [link.platform, link.url]));
  app.innerHTML = `<div class="shell"><button id="back" class="link">← Retour au profil</button><header><div class="eyebrow">Espace joueur</div><h1>Modifier mon profil</h1><p>Vos coordonnées restent privées. Les liens sociaux sont facultatifs et publics.</p></header>
  <form id="profile-form" class="card form"><label>Alias public<input name="alias" value="${escapeHtml(p.alias || '')}" required></label><label>Ville<input name="city" value="${escapeHtml(p.city || '')}"></label>${gameFields(p)}<label>Site Web<input name="website" type="url" placeholder="https://…" value="${escapeHtml(socials.website || '')}"></label><label>Instagram<input name="instagram" type="url" placeholder="https://…" value="${escapeHtml(socials.instagram || '')}"></label><label>TikTok<input name="tiktok" type="url" placeholder="https://…" value="${escapeHtml(socials.tiktok || '')}"></label><label>YouTube<input name="youtube" type="url" placeholder="https://…" value="${escapeHtml(socials.youtube || '')}"></label><label class="toggle"><input name="isPublic" type="checkbox" ${p.isPublic ? 'checked' : ''}> Afficher mon profil dans l’annuaire public</label><p id="form-message" class="message" role="status" tabindex="-1"></p><button class="primary" type="submit">Enregistrer mon profil</button></form></div>`;
  app.querySelector('#back').addEventListener('click', () => { if (savingProfile) return; editing = false; renderDashboard(); });
  app.querySelector('#profile-form').addEventListener('submit', saveProfile);
}
function saveProfile(event) {
  event.preventDefault();
  if (savingProfile) return;
  const form = new FormData(event.currentTarget);
  const socials = ['website', 'instagram', 'tiktok', 'youtube'].map(platform => ({ platform, url: text(form.get(platform), 500) })).filter(link => /^https:\/\//.test(link.url));
  const payload = { ...data.profile, alias: text(form.get('alias'), 100), city: text(form.get('city'), 150), isPublic: form.get('isPublic') === 'on', games: form.getAll('games'), socials };
  if (!payload.games.length) { app.querySelector('#form-message').textContent = 'Choisissez au moins un jeu / Select at least one game.'; return; }
  if (isPreview()) { data.profile = payload; editing = false; renderDashboard(); return; }
  savingProfile = true;
  saveRequestId = crypto.randomUUID();
  app.querySelector('[type=submit]').disabled = true;
  window.parent.postMessage({ type: MESSAGE.save, payload, requestId: saveRequestId }, parentOrigin);
  profileSaveTimer = setTimeout(() => profileSaveError('La réponse prend du temps. Vos choix sont conservés. Réessayez / Response delayed. Your choices are preserved. Retry.'), 30000);
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
    if (event.data.type === MESSAGE.data) { if (editing) return; clearTimeout(loadTimer); publicView = event.data.publicView === true; publicUrl = event.data.publicUrl || ''; data = normalized(event.data.payload); renderDashboard(); }
    if (event.data.type === 'JPDB_PLAYER_ACTION_RESULT' && event.data.requestId === activeRequest) {
      clearTimeout(actionTimer);
      const action = activeAction;
      activeRequest = null;
      activeAction = null;
      const result = event.data.payload || {};
      const status = app.querySelector('#action-status');
      if (!status) return;
      app.querySelectorAll('.invitation-response,.checkout-button').forEach(button => { button.disabled = false; });
      if (result.success && action === 'JPDB_PLAYER_INVITATION_RESPONSE') {
        requestData();
      } else if (result.success && result.checkoutUrl && /^https:\/\//.test(result.checkoutUrl)) {
        status.textContent = 'Votre paiement sécurisé est prêt. Après le paiement, actualisez votre calendrier. ';
        const link = document.createElement('a'); link.href = result.checkoutUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Continuer vers le paiement ↗'; status.append(link);
      } else if (result.success) { requestData(); }
      else { const messages={COMPETITION_FULL:'Cet événement est complet. Votre invitation n’a pas été acceptée.',PLAYER_PROFILE_REQUIRED:'Complétez votre profil joueur avant d’accepter cette invitation.',AGE_NOT_ELIGIBLE:'Vous ne remplissez pas les conditions d’âge de cet événement.',REGISTRATION_CLOSED:'Les inscriptions sont fermées.',INVITATION_ALREADY_ANSWERED:'Cette invitation a déjà reçu une réponse. Actualisez votre profil.',PAYMENT_NOT_CONFIGURED:'Le paiement en ligne n’est pas encore disponible. Votre inscription reste en attente de paiement.'};status.textContent=messages[result.code]||'Impossible de compléter cette demande. Vérifiez votre profil et actualisez les événements avant de réessayer.'; }
    }
    if (event.data.type === MESSAGE.saved && (!event.data.requestId || event.data.requestId === saveRequestId)) { clearTimeout(profileSaveTimer); savingProfile = false; editing = false; canContinueToEvent = event.data.canContinueToEvent === true; requestData(); }
    if (event.data.type === MESSAGE.error) { if (editing) { if (event.data.requestId && event.data.requestId !== saveRequestId) return; profileSaveError(event.data.code === 'PLAYER_PROFILE_INCOMPLETE' ? 'Votre profil nécessite les renseignements d’admissibilité. Vos choix sont conservés.' : 'Enregistrement impossible. Vos choix sont conservés. Reconnectez-vous au besoin puis réessayez / Unable to save. Your choices are preserved. Sign in again if needed and retry.'); return; } clearTimeout(loadTimer); app.innerHTML = `<div class="shell center"><div class="card"><h1>Impossible de charger le profil</h1><p>${escapeHtml(event.data.message || 'Réessayez plus tard.')}</p></div></div>`; }
  });
  window.parent.postMessage({ type: MESSAGE.ready }, parentOrigin); requestData();
  loadTimer = setTimeout(renderConnectionMessage, 9000);
}

if (isPreview()) { data = normalized(preview); renderDashboard(); } else startPrivateProfile();


function gameFields(profile) {
  const selected = new Set(gameSlugs(profile.games));
  return '<fieldset class="game-fields"><legend>Jeux qui m’intéressent / Game interests</legend>'+data.games.map(game => '<label class="toggle"><input type="checkbox" name="games" value="'+escapeHtml(game.slug)+'" '+(selected.has(game.slug) ? 'checked' : '')+'> '+escapeHtml(game.nameFr || game.nameEn || game.slug)+'</label>').join('')+'</fieldset>';
}
function profileSaveError(message) {
  clearTimeout(profileSaveTimer); savingProfile = false;
  const status = app.querySelector('#form-message');
  if (status) { status.textContent = message; status.focus(); }
  const submit = app.querySelector('[type=submit]'); if (submit) submit.disabled = false;
}
