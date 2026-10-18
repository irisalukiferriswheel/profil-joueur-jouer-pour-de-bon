import { createSignupFlow } from './profile-fields.js';
const en = new URLSearchParams(location.search).get('lang') === 'en';
document.documentElement.lang = en ? 'en' : 'fr';
const t = (fr, english) => en ? english : fr;
const games = [{slug:'chess',nameFr:'Échecs',nameEn:'Chess'},{slug:'basketball',nameFr:'Basketball',nameEn:'Basketball'},{slug:'pickleball',nameFr:'Pickleball',nameEn:'Pickleball'}];
// Fictional fixture catalog, not an authoritative production location source.
const cities = ['Sherbrooke', 'Montréal', 'Québec']; // Fixture values shaped like existing public_player_filters().cities.
let profile = null;
let authenticated = false;
const flow = createSignupFlow({
  authenticate: async () => { authenticated = true; return {status:'authenticated'}; },
  load: async () => { if (!authenticated) throw Object.assign(new Error(),{code:'SESSION_EXPIRED'}); return { profile, basicsComplete: Boolean(profile), games, cities }; },
  save: async value => { if (!authenticated) throw Object.assign(new Error(),{code:'SESSION_EXPIRED'}); profile = {...value}; }
});
const app = document.querySelector('#app');
const shell = content => `<div class="shell signup-shell"><div class="preview-banner">${t('Aperçu local · données fictives · aucun compte créé','Local preview · fictional data · no account created')}</div><div class="eyebrow">Jouer pour de bon</div>${content}</div>`;
function start() {
  app.innerHTML = shell(`<h1>${t('Bienvenue dans le jeu.','Welcome to the game.')}</h1><p>${t('Un compte, puis un profil qui vous ressemble.','One account, then a profile that feels like you.')}</p><section class="card"><p>${t('1 · Votre compte sécurisé','1 · Your secure account')}</p><h2>${t('Créer un compte ou se connecter','Create an account or sign in')}</h2><p>${t('Wix gère votre courriel, votre mot de passe et la vérification du compte.','Wix handles your email, password and account verification.')}</p><button class="primary" id="start">${t('Simuler la connexion Wix','Simulate Wix sign-in')}</button></section>`);
  app.querySelector('#start').onclick = async () => show(await flow.authenticate());
}
function show(result) {
  if (result.state === 'complete') {
    app.innerHTML = shell(`<h1>${t('Votre profil est prêt.','Your profile is ready.')}</h1><p>${t('Vous pourrez fournir les renseignements d’admissibilité lorsqu’ils seront nécessaires pour participer à un événement.','You can provide eligibility information when it is needed to join an event.')}</p><button class="primary" id="edit">${t('Modifier mon profil','Edit my profile')}</button>`);
    app.querySelector('#edit').onclick = editor;
  } else editor();
}
function editor() {
  const p = profile || {alias:'',city:'',games:[],isPublic:false,invitationEmails:false};
  app.innerHTML = shell(`<p>${t('2 · Votre profil joueur','2 · Your player profile')}</p><h1>${t('Faisons connaissance.','Let’s get acquainted.')}</h1><p>${t('Choisissez votre alias, votre ville et les jeux qui vous intéressent.','Choose your alias, your city and the games you enjoy.')}</p><form class="card form" id="basics"><label>${t('Alias / nom affiché','Alias / display name')}<input name="alias" required maxlength="100" autocomplete="nickname"></label><label>${t('Ville','City')}<select name="city" required><option value="">${t('Choisir une ville','Choose a city')}</option>${cities.map(c=>`<option value="${c}">${c}</option>`).join('')}</select></label><fieldset class="game-fields"><legend>${t('Jeux qui m’intéressent','Game interests')}</legend>${games.map(g=>`<label class="toggle"><input type="checkbox" name="games" value="${g.slug}"> ${en?g.nameEn:g.nameFr}</label>`).join('')}</fieldset><label class="toggle"><input name="isPublic" type="checkbox"> ${t('Afficher mon profil dans l’annuaire','Show my profile in the directory')}</label><p class="note wide">${t('Mon alias, ma ville et mes jeux seront visibles. Mon courriel reste privé.','My alias, city and games will be visible. My email stays private.')}</p><label class="toggle"><input name="invitationEmails" type="checkbox"> ${t('Recevoir les invitations à des événements par courriel','Receive event invitations by email')}</label><p class="note wide">${t('Ces deux choix sont indépendants et modifiables en tout temps.','These choices are independent and can be changed at any time.')}</p><p id="status" class="message" role="status" tabindex="-1"></p><button type="submit" class="primary">${t('Enregistrer mon profil','Save my profile')}</button></form>`);
  const form = app.querySelector('form');
  form.elements.alias.value = p.alias;
  form.elements.city.value = p.city;
  form.elements.isPublic.checked = p.isPublic;
  form.elements.invitationEmails.checked = p.invitationEmails;
  form.querySelectorAll('[name=games]').forEach(el=>el.checked=p.games.includes(el.value));
  form.onsubmit = async event => {
    event.preventDefault(); const fields = new FormData(form);
    const input = {alias:fields.get('alias'),city:fields.get('city'),games:fields.getAll('games'),isPublic:fields.has('isPublic'),invitationEmails:fields.has('invitationEmails')};
    const button = form.querySelector('[type=submit]'); button.disabled = true;
    const result = await flow.save(input); button.disabled = false;
    if (result.state === 'complete') show(result);
    else { const status = app.querySelector('#status'); status.textContent = t('Choisissez une ville et au moins un jeu. Vos choix sont conservés.','Choose a city and at least one game. Your choices are preserved.'); status.focus(); }
  };
}
start();

