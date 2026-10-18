// UI consumes only the authenticated, minimized notification DTO. No account IDs or email addresses.
export function renderNotifications(root,{items,unreadCount,pendingCount},language,actions){
 const en=language==='en',t=(fr,enText)=>en?enText:fr;
 root.replaceChildren();document.getElementById('counts').textContent=t(`${unreadCount} non lues · ${pendingCount} en attente`,`${unreadCount} unread · ${pendingCount} pending`);
 const status={sent:t('En attente','Pending'),created:t('En attente','Pending'),accepted:t('Acceptée','Accepted'),declined:t('Refusée','Declined'),revoked:t('Révoquée','Revoked')};
 const node=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
 for(const item of items){const card=node('article','');card.className='card';card.dataset.invitation=item.invitationId;card.append(node('h2',item.title),node('p',item.isNew?t('Nouvelle · non lue','New · unread'):t('Lue','Read')),node('p',status[item.status]||item.status));
  if(['full','expired','unavailable'].includes(item.availability))card.append(node('p',({full:t('Complet','Full'),expired:t('Expirée','Expired'),unavailable:t('Indisponible','Unavailable')})[item.availability]));
  const controls=node('div','');controls.className='actions';
  for(const [label,action,disabled] of [[t('Marquer comme lue','Mark as read'),'read',!item.isNew],[t('Accepter','Accept'),'accepted',!item.canAccept],[t('Refuser','Decline'),'declined',!item.canDecline]]){const b=node('button',label);b.type='button';b.disabled=disabled;b.dataset.action=action;b.onclick=async()=>{b.disabled=true;try{await actions[action](item.invitationId);}catch{actions.error();}};controls.append(b);}
  card.append(controls);root.append(card);
 }
}
