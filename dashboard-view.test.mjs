import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardHtml } from './dashboard-view.js';
const data = { profile: { alias: '<script>bad</script>', email: 'private@example.com' }, dashboard: { gamesWon: 2, totalWinnings: { CAD: 200 }, paymentsReceived: { CAD: 150 }, pendingPayments: { CAD: 50 }, totalContributions: { CAD: 30 }, causes: [{ name: '<b>Cause</b>', currency: 'CAD', contributed: 30 }] }, invitations: [{ title: 'Secret invitation' }], schedule: [{ title: 'Secret schedule', registrationStatus: 'confirmed', locationType: 'online', joinUrl: 'javascript:alert(1)' }] };
test('public HTML excludes all private event and payment details', () => {
  const html = dashboardHtml(data, { publicView: true });
  assert.doesNotMatch(html, /Secret invitation|Secret schedule|private@example|Paiements reçus|Paiements en attente|Modifier mon profil/);
  assert.match(html, /Parties gagnées/);
  assert.match(html, /Montants gagnés/);
  assert.match(html, /&lt;script&gt;/);
});
test('private HTML contains schedule, invitations and payouts with safe links', () => {
  const html = dashboardHtml(data);
  assert.match(html, /Mon calendrier/);
  assert.match(html, /Mes invitations/);
  assert.match(html, /Paiements reçus/);
  assert.match(html, /Paiements en attente/);
  assert.doesNotMatch(html, /href="javascript:/);
});
