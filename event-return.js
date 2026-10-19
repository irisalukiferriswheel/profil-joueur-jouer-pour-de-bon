let dispose = () => {};
export function mountEventReturn(app, allowed, send) {
  dispose();
  if (!allowed) return;
  const en = new URLSearchParams(location.search).get('lang') === 'en';
  const section = document.createElement('section'); section.className = 'card';
  const button = document.createElement('button'); button.id = 'continue-event'; button.className = 'primary';
  button.textContent = en ? 'Return to the event' : 'Retourner à l’événement';
  const status = document.createElement('p'); status.setAttribute('role', 'status');
  button.onclick = () => {
    button.disabled = true;
    const requestId = crypto.randomUUID();
    const failed = () => { button.disabled = false; status.textContent = en ? 'Return unavailable. Reload your profile and try again.' : 'Retour indisponible. Rechargez votre profil et réessayez.'; };
    const timer = setTimeout(() => { dispose(); failed(); },15000);
    const reply = event => {
      if(event.source !== window.parent || event.data?.type !== 'JPDB_PLAYER_ACTION_RESULT' || event.data.requestId !== requestId) return;
      dispose(); if(!event.data.payload?.success) failed();
    };
    dispose = () => { clearTimeout(timer); window.removeEventListener('message',reply); };
    window.addEventListener('message',reply);
    status.textContent = en ? 'Returning to your event…' : 'Retour à votre événement…';
    send({type:'JPDB_PROFILE_CONTINUE_EVENT',requestId});
  };
  section.append(button,status); app.querySelector('.shell')?.append(section);
}
