// Shared by the original and additive editors; no account or consent storage.
export function createProfileEditTransport({ send, onData, onSaved, onError, onSessionEnded, timeout = 30000 }) {
  let pending = null, timer, ended = false, editing = false;
  const reset = () => { clearTimeout(timer); pending = null; };
  return {
    editing(value) { editing = value; },
    save(payload, type = 'JPDB_PROFILE_EDITOR_SAVE') {
      if (pending || ended) return false;
      pending = crypto.randomUUID();
      timer = setTimeout(() => { reset(); onError('SAVE_UNCONFIRMED'); }, timeout);
      send({ type, requestId: pending, payload });
      return true;
    },
    receive(message) {
      if (message.type === 'JPDB_PROFILE_SESSION_ENDED' || (message.type === 'JPDB_PROFILE_EDITOR_ERROR' && ['LOGIN_REQUIRED','SESSION_EXPIRED','SESSION_CHANGED','SESSION_UNCONFIRMED'].includes(message.code))) {
        ended = true; reset(); onSessionEnded(); return;
      }
      if (ended) return;
      if (message.type === 'JPDB_PROFILE_EDITOR_DATA' && !editing && !pending) onData(message);
      if (message.type === 'JPDB_PROFILE_EDITOR_SAVED' && pending && message.requestId === pending) { reset(); editing = false; onSaved(message); }
      if (message.type === 'JPDB_PROFILE_EDITOR_ERROR' && (!message.requestId || message.requestId === pending)) { reset(); onError(message.code || 'SAVE_FAILED'); }
    }
  };
}
