import {t,locale,setLocale} from './i18n.js';
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function money(value, currency = 'CAD') {
  try { return new Intl.NumberFormat(locale(), { style: 'currency', currency }).format(Number(value) || 0); }
  catch { return t("Montant indisponible"); }
}
const totals = value => Object.entries(value || {}).map(([currency, amount]) => money(amount, currency)).join(' · ') || money(0);
const safeUrl = value => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch { return ''; } };
function date(event) {
  try { return new Intl.DateTimeFormat(locale(), { dateStyle: 'medium', timeStyle: 'short', timeZone: event.timezone || 'America/Toronto' }).format(new Date(event.startAt)) + ` (${event.timezone || 'America/Toronto'})`; }
  catch { return t("Date à confirmer"); }
}
function location(event) {
  const mode = { online: t("En ligne"), physical: t("En personne"), hybrid: t("En ligne et en personne"), unspecified: t("Lieu à confirmer") }[event.locationType] || t("Lieu à confirmer");
  const join = safeUrl(event.joinUrl);
  const map = safeUrl(event.mapUrl);
  return `<span class="mode ${event.locationType === 'online' ? 'online' : ''}">${escape(mode)}</span>
    ${['physical', 'hybrid'].includes(event.locationType) ? `<p>${escape(event.locationName || '')}${event.address ? `<br>${escape(event.address)}` : `<br>${t("Adresse à confirmer")}`}</p>${map ? `<a href="${escape(map)}" target="_blank" rel="noopener noreferrer">${t("Voir la carte ↗")}</a>` : ''}` : ''}
    ${['online', 'hybrid'].includes(event.locationType) ? (join ? `<a class="join-link" href="${escape(join)}" target="_blank" rel="noopener noreferrer">${t("Rejoindre l’événement ↗")}</a>` : `<p class="muted">${event.registrationStatus === 'confirmed' ? t("Le lien sera communiqué ici.") : t("Lien disponible après confirmation.")}</p>`) : ''}`;
}
function invitationActions(event) {
  const status = event.invitationStatus || 'sent';
  if (status === 'accepted') {
    const url = safeUrl(event.registrationUrl);
    let registrationUrl = '';
    if (url && event.canRegister === true) {
      const parsed = new URL(url);
      if (parsed.origin === 'https://www.jouerpourdebon.ca' && parsed.pathname === '/competitions' && /^[0-9a-f-]{36}$/i.test(parsed.searchParams.get('jpdbEvent') || '')) registrationUrl = parsed.href;
    }
    return `<div class="invitation-actions"><p>${t("Invitation acceptée. Consultez votre calendrier pour vérifier votre place et compléter le paiement si nécessaire.")}</p>${registrationUrl ? `<a class="primary" href="${escape(registrationUrl)}" target="_blank" rel="noopener noreferrer">${t("Voir mon inscription ↗")}</a>` : `<p class="muted">${t("Le lien d’inscription sera disponible ici.")}</p>`}</div>`;
  }
  if (!['created', 'sent'].includes(status)) return `<p class="muted">${t("Cette invitation n’est plus disponible.")}</p>`;
  return `<div class="invitation-actions"><p>${Number(event.feeAmount)>0?t("Accepter réserve une place pendant 30 minutes au maximum. Le paiement reste à compléter; aucun montant n’est prélevé automatiquement."):t("Accepter vous inscrit à cet événement gratuit, selon les places disponibles.")}</p><div class="invitation-buttons"><button type="button" class="primary invitation-response" data-invitation="${escape(event.invitationId)}" data-response="accepted">${t("Accepter")}</button><button type="button" class="link invitation-response" data-invitation="${escape(event.invitationId)}" data-response="declined">${t("Décliner")}</button></div></div>`;
}
function eventCard(event, invited) {
  return `<article class="event-card"><div class="event-heading"><h3>${escape(event.title)}</h3><span class="pill">${invited ? event.invitationStatus === 'accepted' ? t("Invitation acceptée") : 'Invitation' : event.registrationStatus === 'confirmed' ? t("Inscription confirmée") : event.registrationStatus === 'expired' ? t("Réservation expirée") : t("Paiement à compléter")}</span></div>
    <p class="event-date">${escape(date(event))}</p>${location(event)}
    <div class="event-footer"><strong>${money(event.feeAmount, event.currency)} <small>${t("de participation")}</small></strong>
    ${invited ? invitationActions(event) : event.registrationStatus === 'expired' ? `<p>${t("Votre réservation a expiré. Contactez l’organisateur.")}</p>` : event.registrationStatus === 'pending_payment' ? (safeUrl(event.registrationUrl) ? `<a class="primary" href="${escape(safeUrl(event.registrationUrl))}" target="_blank" rel="noopener noreferrer">${t("Payer ma participation ↗")}</a>` : `<button class="primary checkout-button" data-registration="${escape(event.registrationId)}">${t("Payer ma participation")}</button>`) : ''}</div></article>`;
}
export function dashboardHtml(data, { publicView = false, preview = false, publicUrl = '', canContinueToEvent = false } = {}) {
  const impact = data.dashboard || {};
  const name = data.profile?.alias || t("Profil joueur");
  const causes = Array.isArray(impact.causes) ? impact.causes : [];
  return `<div class="shell dashboard-shell">${preview ? `<div class="preview-banner">${t("Démonstration — données fictives, aucun paiement réel")}</div>` : ''}
    <header><div class="eyebrow">${t("Jouer pour de bon")} · ${publicView ? t("Profil public") : t("Mon espace privé")}</div><h1>${escape(name)}</h1><p>${publicView ? t("Les victoires et les causes qui font la différence.") : t("Vos prochaines parties. Vos victoires. Votre impact.")}</p></header>
    ${!publicView && canContinueToEvent ? `<section class="card" aria-label="${t("Reprendre mon inscription")}"><h2>${t("Profil enregistré")}</h2><p>${t("Vous pouvez maintenant retourner à l’événement pour continuer votre inscription. Aucun paiement n’a été effectué.")}</p><button type="button" id="continue-event" class="primary">${t("Continuer vers l’événement")}</button></section>` : ''}
    ${publicView ? '' : `<nav class="dashboard-nav" aria-label="${t("Mon espace")}"><a href="#invitations">${t("Invitations")}</a><a href="#schedule">${t("Mon calendrier")}</a><a href="#winnings">${t("Mes gains")}</a><a href="#causes">${t("Mes causes")}</a><button id="edit" class="link">${t("Modifier mon profil")}</button><button id="refresh-dashboard" class="link">${t("Actualiser")}</button>${data.profile?.isPublic && safeUrl(publicUrl) ? `<a href="${escape(publicUrl)}" target="_blank" rel="noopener noreferrer">${t("Mon profil public ↗")}</a>` : ''}</nav>`}
    <section class="stats" aria-label="${t("Résultats confirmés")}"><article><small>${t("Parties gagnées")}</small><strong>${Number.isSafeInteger(impact.gamesWon) ? impact.gamesWon : '—'}</strong></article><article><small>${t("Montants gagnés")}</small><strong>${escape(totals(impact.totalWinnings))}</strong></article><article><small>${t("Contributions à toutes les causes")}</small><strong>${escape(totals(impact.totalContributions))}</strong></article></section>
    ${publicView ? '' : `<section id="winnings" class="card"><div class="section-heading"><h2>${t("Mes gains et versements")}</h2><span>${t("Suivi privé")}</span></div><div class="payout-grid"><div><small>${t("Paiements reçus")}</small><strong>${escape(totals(impact.paymentsReceived))}</strong></div><div><small>${t("Paiements en attente")}</small><strong>${escape(totals(impact.pendingPayments))}</strong></div></div><p class="note">${t("Les montants reçus et en attente concernent vos gains. Les frais de participation sont indiqués dans votre calendrier.")}</p></section>
    <p id="action-status" class="action-status" role="status"></p><section id="invitations" class="card"><div class="section-heading"><h2>${t("Mes invitations")}</h2><span>${(data.invitations || []).length} ${t("à découvrir")}</span></div><p>${t("Choisissez les événements auxquels vous souhaitez participer.")}</p>${(data.invitations || []).map(event => eventCard(event, true)).join('') || `<p class="empty">${t("Aucune invitation à venir pour le moment.")}</p>`}</section>
    <section id="schedule" class="card"><div class="section-heading"><h2>${t("Mon calendrier")}</h2><span>${t("À venir")}</span></div><p>${t("Tous vos événements à venir, en ordre chronologique.")}</p>${(data.schedule || []).map(event => eventCard(event, false)).join('') || `<p class="empty">${t("Vos événements sélectionnés apparaîtront ici.")}</p>`}</section>`}
    <section id="causes" class="card causes"><div class="section-heading"><h2>${publicView ? t("Contributions aux causes") : t("Les causes pour lesquelles je joue")}</h2><span>${causes.length} contribution${causes.length === 1 ? '' : 's'}</span></div>${causes.length ? `<ul>${causes.map(cause => `<li><span>${escape(cause.name)}</span><strong>${money(cause.contributed, cause.currency)}</strong></li>`).join('')}</ul>` : `<p class="empty">${t("Aucune contribution confirmée pour le moment.")}</p>`}<div class="cause-total"><span>${t("Total, toutes causes")}</span><strong>${escape(totals(impact.totalContributions))}</strong></div></section>
    <p class="note">${t("Résultats et contributions confirmés. Les montants dans différentes devises sont présentés séparément.")}</p></div>`;
}
