// Additive owned-profile section. Existing profile editor and impact cards stay intact.
const pending=new Map();let sequence=0,busy=false,language='fr',generation=0;
const box=document.createElement('section');box.className='shell';box.hidden=true;
document.body.append(box);
const t=(fr,en)=>language==='en'?en:fr;
const node=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
function request(action,invitationId){
 return new Promise((resolve,reject)=>{
  const requestId='notifications-'+(++sequence);
  const timer=setTimeout(()=>{pending.delete(requestId);reject(Error('TIMEOUT'));},15000);
  pending.set(requestId,{resolve,reject,timer});
  window.parent.postMessage({type:'JPDB_NOTIFICATION_REQUEST',requestId,action,...(invitationId?{invitationId}:{})},'*');
 });
}
async function load(){
 if(busy)return;busy=true;const started=generation;
 try{const result=await request('list');
  if(started!==generation)return;
  if(!result?.success){box.hidden=true;return;}
  render(result.data);
 }catch{message(t('Invitations indisponibles. Réessayez.','Invitations unavailable. Please retry.'));}
 finally{if(started===generation)busy=false;}
}
function message(text){const p=box.querySelector('[role=status]');if(p)p.textContent=text;}
function render(data){
 box.hidden=false;box.replaceChildren();box.lang=language;
 const header=node('h2',t('Mes invitations','My invitations'));box.append(header);
 const locale=node('button',language==='fr'?'English':'Français');locale.type='button';locale.onclick=()=>{language=language==='fr'?'en':'fr';render(data);};box.append(locale);
 box.append(node('p',t(`${data.unreadCount} non lues · ${data.pendingCount} en attente`,`${data.unreadCount} unread · ${data.pendingCount} pending`)));
 const status=node('p','');status.setAttribute('role','status');status.tabIndex=-1;box.append(status);
 for(const item of data.items||[]){
  const card=node('article','');card.className='card';card.append(node('h3',item.title));
  const labels={pending:t('En attente','Pending'),full:t('Complet','Full'),expired:t('Expirée','Expired'),unavailable:t('Indisponible','Unavailable'),accepted:t('Acceptée','Accepted'),declined:t('Refusée','Declined'),revoked:t('Révoquée','Revoked')};
  card.append(node('p',labels[item.availability]||t('Indisponible','Unavailable')));
  for(const [action,label,allowed] of [['read',t('Marquer comme lue','Mark as read'),item.isNew],['accepted',t('Accepter','Accept'),item.canAccept],['declined',t('Refuser','Decline'),item.canDecline]]){
   const button=node('button',label);button.type='button';button.disabled=!allowed;
   button.onclick=async()=>{
    if(busy)return;busy=true;button.disabled=true;const started=generation;
    try{const result=await request(action,item.invitationId);
     if(started!==generation)return;
     if(!result?.success)throw Error(result?.code||'UNAVAILABLE');
     const state=result.data?.registrationStatus;
     busy=false;await load();message(state==='pending_payment'?t('Place réservée temporairement. Le paiement reste à compléter dans votre inscription.','Place temporarily reserved. Complete payment in your registration.'):t('Réponse enregistrée.','Response saved.'));
     box.querySelector('[role=status]')?.focus();
    }catch{message(t('Action non confirmée. Rechargez les invitations avant de réessayer.','Action not confirmed. Reload invitations before retrying.'));button.disabled=false;}
    finally{if(started===generation)busy=false;}
   };card.append(button);
  }
  box.append(card);
 }
 const reload=node('button',t('Actualiser','Refresh'));reload.type='button';reload.onclick=load;box.append(reload);
}
window.addEventListener('message',event=>{
 if(event.source!==window.parent||!event.data)return;
 const m=event.data;
 if(m.type==='JPDB_NOTIFICATION_RESULT'){
  const p=pending.get(m.requestId);if(!p)return;clearTimeout(p.timer);pending.delete(m.requestId);p.resolve(m.result);
 }
 if(m.type==='JPDB_PROFILE_EDITOR_DATA'){
  generation++;busy=false;box.hidden=true;box.replaceChildren();
  if(m.publicView){box.hidden=true;return;}
  load();
 }
});
