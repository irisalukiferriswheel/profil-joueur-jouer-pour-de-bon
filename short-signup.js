// Uses the same player record and host transport. Wix owns account/password handling.
let chosenLanguage;
export function renderShortSignup({app,data,save,send}) {
 let language=chosenLanguage || (new URLSearchParams(location.search).get('lang')==='en'?'en':'fr');
 let editing=!(data.basicsComplete && data.accountReady);
 const initial=data.profile||{};
 let draft={alias:initial.alias||'',city:initial.city||'',games:(initial.games||[]).map(g=>typeof g==='string'?g:g.slug),isPublic:data.preferences?.isPublic===true,invitationEmails:data.preferences?.invitationEmails===true};
 const t=(fr,en)=>language==='en'?en:fr;
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const capture=()=>{const form=app.querySelector('form');if(!form)return;const f=new FormData(form);draft={alias:f.get('alias'),city:f.get('city'),games:f.getAll('games'),isPublic:f.has('isPublic'),invitationEmails:f.has('invitationEmails')};};
 function render(){
  document.documentElement.lang=language;
  app.innerHTML=`<section class="shell" lang="${language}"><label>${t('Langue','Language')}<select id="signup-language"><option value="fr">Français</option><option value="en">English</option></select></label><header><div class="eyebrow">${t('Votre compte Wix est connecté','Your Wix account is signed in')}</div><h1>${t('Votre profil joueur','Your player profile')}</h1></header>${editing?`
  <form class="card form" id="profile-form"><p>${t('Choisissez votre alias, votre ville et vos jeux. Les renseignements d’admissibilité seront requis avant de rejoindre un événement.','Choose your display name, city and games. Full eligibility details are required before joining an event.')}</p>
  <label>${t('Alias public','Display name')}<input name="alias" required maxlength="100" value="${escape(draft.alias)}"></label><label>${t('Ville','City')}<input name="city" required maxlength="150" value="${escape(draft.city)}"></label>
  <fieldset class="game-fields"><legend>${t('Jeux qui m’intéressent','Game interests')}</legend>${(data.games||[]).map(g=>`<label class="toggle"><input type="checkbox" name="games" value="${escape(g.slug)}" ${draft.games.includes(g.slug)?'checked':''}>${escape(language==='en'?g.nameEn||g.nameFr||g.slug:g.nameFr||g.nameEn||g.slug)}</label>`).join('')}</fieldset>
  <label class="toggle"><input name="isPublic" type="checkbox" ${draft.isPublic?'checked':''}>${t('Afficher mon profil dans l’annuaire public','Show my profile in the public directory')}</label>
  <label class="toggle"><input name="invitationEmails" type="checkbox" ${draft.invitationEmails?'checked':''}>${t('Recevoir les invitations par courriel','Receive invitation emails')}</label>
  <p id="form-message" role="status" tabindex="-1"></p><button type="submit" class="primary">${t('Enregistrer mon profil','Save my profile')}</button></form>`:`
  <section class="card"><h2>${t('Votre profil de base est enregistré','Your basic profile is saved')}</h2><p>${t('Avant de rejoindre un événement, complétez le formulaire d’admissibilité existant. Votre profil de base seul ne permet pas de vous inscrire.','Before joining an event, complete the existing eligibility form. A basic profile alone does not allow registration.')}</p><button id="complete-eligibility" class="primary">${t('Compléter mon admissibilité','Complete eligibility')}</button><button id="edit-basics">${t('Modifier mon profil de base','Edit basic profile')}</button></section>`}</section>`;
  app.querySelector('#signup-language').value=language;
  app.querySelector('#signup-language').onchange=e=>{capture();language=e.target.value;chosenLanguage=language;render();};
  app.querySelector('#complete-eligibility')?.addEventListener('click',()=>send({type:'JPDB_PROFILE_COMPLETE_ELIGIBILITY',language}));
  app.querySelector('#edit-basics')?.addEventListener('click',()=>{editing=true;render();});
  app.querySelector('form')?.addEventListener('submit',e=>{e.preventDefault();capture();if(!draft.games.length){app.querySelector('#form-message').textContent=t('Choisissez au moins un jeu.','Select at least one game.');return;}save({...draft});});
 }
 render();
}
