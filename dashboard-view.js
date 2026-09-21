export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function money(value, currency = 'CAD') {
  try { return new Intl.NumberFormat('fr-CA', { style: 'currency', currency }).format(Number(value) || 0); }
  catch { return 'Montant indisponible'; }
}
const totals = value => Object.entries(value || {}).map(([currency, amount]) => money(amount, currency)).join(' · ') || money(0);
const safeUrl = value => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch { return ''; } };
function date(event) {
  try { return new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium', timeStyle: 'short', timeZone: event.timezone || 'America/Toronto' }).format(new Date(event.startAt)) + ` (${event.timezone || 'America/Toronto'})`; }
  catch { return 'Date à confirmer'; }
}
function location(event) {
  const mode = { online: 'En ligne', physical: 'En personne', hybrid: 'En ligne et en personne', unspecified: 'Lieu à confirmer' }[event.locationType] || 'Lieu à confirmer';
  const join = safeUrl(event.joinUrl);
  const map = safeUrl(event.mapUrl);
  return `<span class="mode ${event.locationType === 'online' ? 'online' : ''}">${escape(mode)}</span>
    ${['physical', 'hybrid'].includes(event.locationType) ? `<p>${escape(event.locationName || '')}${event.address ? `<br>${escape(event.address)}` : '<br>Adresse à confirmer'}</p>${map ? `<a href="${escape(map)}" target="_blank" rel="noopener noreferrer">Voir la carte ↗</a>` : ''}` : ''}
    ${['online', 'hybrid'].includes(event.locationType) ? (join ? `<a class="join-link" href="${escape(join)}" target="_blank" rel="noopener noreferrer">Rejoindre l’événement ↗</a>` : `<p class="muted">${event.registrationStatus === 'confirmed' ? 'Le lien sera communiqué ici.' : 'Lien disponible après confirmation.'}</p>`) : ''}`;
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
    return `<div class="invitation-actions"><p>Invitation acceptée. Votre inscription et votre paiement restent à compléter séparément.</p>${registrationUrl ? `<a class="primary" href="${escape(registrationUrl)}" target="_blank" rel="noopener noreferrer">Continuer vers l’inscription ↗</a>` : '<p class="muted">Le lien d’inscription sera disponible ici.</p>'}</div>`;
  }
  if (!['created', 'sent'].includes(status)) return '<p class="muted">Cette invitation n’est plus disponible.</p>';
  return `<div class="invitation-actions"><p>Accepter cette invitation ne vous inscrit pas et ne déclenche aucun paiement.</p><div class="invitation-buttons"><button type="button" class="primary invitation-response" data-invitation="${escape(event.invitationId)}" data-response="accepted">Accepter</button><button type="button" class="link invitation-response" data-invitation="${escape(event.invitationId)}" data-response="declined">Décliner</button></div></div>`;
}
function eventCard(event, invited) {
  return `<article class="event-card"><div class="event-heading"><h3>${escape(event.title)}</h3><span class="pill">${invited ? event.invitationStatus === 'accepted' ? 'Invitation acceptée' : 'Invitation' : event.registrationStatus === 'confirmed' ? 'Inscription confirmée' : 'Paiement à compléter'}</span></div>
    <p class="event-date">${escape(date(event))}</p>${location(event)}
    <div class="event-footer"><strong>${money(event.feeAmount, event.currency)} <small>de participation</small></strong>
    ${invited ? invitationActions(event) : event.registrationStatus === 'pending_payment' ? `<button class="primary checkout-button" data-registration="${escape(event.registrationId)}">Payer ma participation</button>` : ''}</div></article>`;
}
export function dashboardHtml(data, { publicView = false, preview = false, publicUrl = '', canContinueToEvent = false } = {}) {
  const impact = data.dashboard || {};
  const name = data.profile?.alias || 'Profil joueur';
  const causes = Array.isArray(impact.causes) ? impact.causes : [];
  return `<div class="shell dashboard-shell">${preview ? '<div class="preview-banner">Démonstration — données fictives, aucun paiement réel</div>' : ''}
    <header><div class="eyebrow">Jouer pour de bon · ${publicView ? 'Profil public' : 'Mon espace privé'}</div><h1>${escape(name)}</h1><p>${publicView ? 'Les victoires et les causes qui font la différence.' : 'Vos prochaines parties. Vos victoires. Votre impact.'}</p></header>
    ${!publicView && canContinueToEvent ? '<section class="card" aria-label="Reprendre mon inscription"><h2>Profil enregistré</h2><p>Vous pouvez maintenant retourner à l’événement pour continuer votre inscription. Aucun paiement n’a été effectué.</p><button type="button" id="continue-event" class="primary">Continuer vers l’événement</button></section>' : ''}
    ${publicView ? '' : `<nav class="dashboard-nav" aria-label="Mon espace"><a href="#invitations">Invitations</a><a href="#schedule">Mon calendrier</a><a href="#winnings">Mes gains</a><a href="#causes">Mes causes</a><button id="edit" class="link">Modifier mon profil</button><button id="refresh-dashboard" class="link">Actualiser</button>${data.profile?.isPublic && safeUrl(publicUrl) ? `<a href="${escape(publicUrl)}" target="_blank" rel="noopener noreferrer">Mon profil public ↗</a>` : ''}</nav>`}
    <section class="stats" aria-label="Résultats confirmés"><article><small>Parties gagnées</small><strong>${Number.isSafeInteger(impact.gamesWon) ? impact.gamesWon : '—'}</strong></article><article><small>Montants gagnés</small><strong>${escape(totals(impact.totalWinnings))}</strong></article><article><small>Contributions à toutes les causes</small><strong>${escape(totals(impact.totalContributions))}</strong></article></section>
    ${publicView ? '' : `<section id="winnings" class="card"><div class="section-heading"><h2>Mes gains et versements</h2><span>Suivi privé</span></div><div class="payout-grid"><div><small>Paiements reçus</small><strong>${escape(totals(impact.paymentsReceived))}</strong></div><div><small>Paiements en attente</small><strong>${escape(totals(impact.pendingPayments))}</strong></div></div><p class="note">Les montants reçus et en attente concernent vos gains. Les frais de participation sont indiqués dans votre calendrier.</p></section>
    <p id="action-status" class="action-status" role="status"></p><section id="invitations" class="card"><div class="section-heading"><h2>Mes invitations</h2><span>${(data.invitations || []).length} à découvrir</span></div><p>Choisissez les événements auxquels vous souhaitez participer.</p>${(data.invitations || []).map(event => eventCard(event, true)).join('') || '<p class="empty">Aucune invitation à venir pour le moment.</p>'}</section>
    <section id="schedule" class="card"><div class="section-heading"><h2>Mon calendrier</h2><span>À venir</span></div><p>Tous vos événements à venir, en ordre chronologique.</p>${(data.schedule || []).map(event => eventCard(event, false)).join('') || '<p class="empty">Vos événements sélectionnés apparaîtront ici.</p>'}</section>`}
    <section id="causes" class="card causes"><div class="section-heading"><h2>${publicView ? 'Contributions aux causes' : 'Les causes pour lesquelles je joue'}</h2><span>${causes.length} contribution${causes.length === 1 ? '' : 's'}</span></div>${causes.length ? `<ul>${causes.map(cause => `<li><span>${escape(cause.name)}</span><strong>${money(cause.contributed, cause.currency)}</strong></li>`).join('')}</ul>` : '<p class="empty">Aucune contribution confirmée pour le moment.</p>'}<div class="cause-total"><span>Total, toutes causes</span><strong>${escape(totals(impact.totalContributions))}</strong></div></section>
    <p class="note">Résultats et contributions confirmés. Les montants dans différentes devises sont présentés séparément.</p></div>`;
}
