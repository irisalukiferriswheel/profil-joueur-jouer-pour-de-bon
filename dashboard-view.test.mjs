import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardHtml } from './dashboard-view.js';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const data = { profile: { alias: '<script>bad</script>', email: 'private@example.com' }, dashboard: { gamesWon: 2, totalWinnings: { CAD: 200 }, paymentsReceived: { CAD: 150 }, pendingPayments: { CAD: 50 }, totalContributions: { CAD: 30 }, causes: [{ name: '<b>Cause</b>', currency: 'CAD', contributed: 30 }] }, invitations: [{ title: 'Secret invitation' }], schedule: [{ title: 'Secret schedule', registrationStatus: 'confirmed', locationType: 'online', joinUrl: 'javascript:alert(1)' }] };
test('public HTML excludes all private event and payment details', () => {
  const html = dashboardHtml(data, { publicView: true });
  assert.doesNotMatch(html, /Secret invitation|Secret schedule|private@example|Paiements reçus|Paiements en attente|Modifier mon profil/);
  assert.match(html, /Parties gagnées/);
  assert.match(html, /Montants gagnés/);
  assert.match(html, /&lt;script&gt;/);
});

const registrationUrl = 'https://www.jouerpourdebon.ca/competitions?jpdbEvent=11111111-1111-4111-8111-111111111111';
const invitation = { invitationId: 'invite-1', invitationStatus: 'sent', canRegister: true, title: 'Invitation privée', registrationUrl };
test('pending invitation exposes response buttons but no registration or payment action', () => {
  const html = dashboardHtml({ ...data, schedule: [], invitations: [invitation] });
  assert.match(html, /data-response="accepted"/);
  assert.match(html, /data-response="declined"/);
  assert.doesNotMatch(html, /invitation-form|checkout-button|Continuer vers l’inscription|href="https:\/\/www.jouerpourdebon.ca\/competitions/);
});
test('accepted invitation exposes only the separate canonical registration link', () => {
  const html = dashboardHtml({ ...data, schedule: [], invitations: [{ ...invitation, invitationStatus: 'accepted' }] });
  assert.match(html, /Invitation acceptée/);
  assert.match(html, /Continuer vers l’inscription/);
  assert.doesNotMatch(html, /data-response=|checkout-button|invitation-form/);
  assert.doesNotMatch(dashboardHtml({ ...data, schedule: [], invitations: [{ ...invitation, invitationStatus: 'accepted', canRegister: false }] }), /Continuer vers l’inscription/);
  for (const url of ['https://evil.example/competitions?jpdbEvent=11111111-1111-4111-8111-111111111111', 'javascript:alert(1)', 'https://www.jouerpourdebon.ca/competitions?jpdbEvent=not-an-event']) {
    assert.doesNotMatch(dashboardHtml({ ...data, schedule: [], invitations: [{ ...invitation, invitationStatus: 'accepted', registrationUrl: url }] }), /Continuer vers l’inscription/);
  }
});
test('declined and revoked invitations cannot be accepted or registered from the card', () => {
  for (const invitationStatus of ['declined', 'revoked']) {
    const html = dashboardHtml({ ...data, schedule: [], invitations: [{ ...invitation, invitationStatus }] });
    assert.doesNotMatch(html, /data-response=|checkout-button|Continuer vers l’inscription/);
  }
});
test('clicking accept sends only a response; acknowledgement only refreshes the dashboard', () => {
  const sent = [];
  const buttons = ['accepted', 'declined'].map(response => ({ dataset: { invitation: 'invite-1', response }, addEventListener(type, fn) { this[type] = fn; } }));
  const status = { textContent: '', append() { throw new Error('Acceptance must not offer checkout'); } };
  const dummy = { addEventListener() {} };
  const app = { innerHTML: '', querySelector: selector => selector === '#action-status' ? status : dummy, querySelectorAll: selector => selector.includes('invitation-response') ? buttons : [] };
  let receive;
  const parent = { postMessage: message => sent.push(message) };
  const window = { parent, addEventListener: (type, fn) => { receive = fn; } };
  vm.runInNewContext(readFileSync(new URL('./app.js', import.meta.url), 'utf8').replace(/^import .*?;\r?\n/, ''), { document: { querySelector: () => app }, window, location: { hash: '#/my-profile' }, URL, dashboardHtml, setTimeout: () => 1, clearTimeout() {} });
  receive({ source: parent, origin: 'https://www.jouerpourdebon.ca', data: { type: 'JPDB_PROFILE_EDITOR_DATA', payload: { ...data, invitations: [invitation], schedule: [] } } });
  sent.length = 0;
  buttons[0].click();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].type, 'JPDB_PLAYER_INVITATION_RESPONSE');
  assert.equal(sent[0].payload.response, 'accepted');
  assert.equal(sent[0].payload.invitationId, 'invite-1');
  const requestId = sent[0].requestId;
  buttons[1].click();
  assert.equal(sent.length, 1, 'busy state prevents concurrent responses');
  receive({ source: parent, origin: 'https://www.jouerpourdebon.ca', data: { type: 'JPDB_PLAYER_ACTION_RESULT', requestId, payload: { success: true, checkoutUrl: 'https://example.com/payment' } } });
  assert.equal(sent.at(-1).type, 'JPDB_PROFILE_EDITOR_REQUEST_DATA');
  assert.ok(sent.every(message => !['JPDB_PLAYER_REGISTER', 'JPDB_PLAYER_CHECKOUT'].includes(message.type)));
});
test('private HTML contains schedule, invitations and payouts with safe links', () => {
  const html = dashboardHtml(data);
  assert.match(html, /Mon calendrier/);
  assert.match(html, /Mes invitations/);
  assert.match(html, /Paiements reçus/);
  assert.match(html, /Paiements en attente/);
  assert.doesNotMatch(html, /href="javascript:/);
});
