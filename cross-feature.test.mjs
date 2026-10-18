import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {validateBasics} from './profile-fields.js';
const taskRoot=process.env.JPDB_REFERENCE_TASK || 'C:/Users/simon/Documents/Codex/2026-10-17/task';
// Read-only contract review against the notification worker's actual source.
const source=readFileSync(`${taskRoot}/wix-notifications/src/backend/invitationNotificationService.js`,'utf8');
const {createMemberNotifications,createInvitationDelivery}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const scope={window:{}};
vm.runInNewContext(readFileSync(`${taskRoot}/organizer-eligibility/preview-assets/eligibility.js`,'utf8'),scope);
const id='00000000-0000-4000-8000-000000000001';
const games=[{slug:'chess',nameFr:'Échecs',nameEn:'Chess'}];
test('signup slugs + city strings round-trip to the actual organizer picker contract',()=>{
  const value=validateBasics({alias:'Fixture',city:'Montréal',games:['chess']},games,['Montréal']).value;
  // Existing API serializer expands stored slugs into localized game objects.
  const publicPlayer={id,alias:value.alias,city:value.city,games:value.games.map(slug=>games.find(game=>game.slug===slug))};
  assert.equal(scope.window.InvitationEligibility.matches(publicPlayer,' MONTRÉAL ','chess'),true);
  assert.equal(scope.window.InvitationEligibility.matches(publicPlayer,'Montréal','Échecs'),true);
  assert.equal(scope.window.InvitationEligibility.matches(publicPlayer,'Montreal','chess'),false);
  assert.equal(scope.window.InvitationEligibility.matches({...publicPlayer,games:value.games},'Montréal','chess'),false,'picker consumes public API objects, not raw save slugs');
});
test('actual notification delivery never interprets directory visibility as email permission',async()=>{
  for(const [isPublic,invitationEmails,emailPermitted,expected] of [[true,false,true,'suppressed'],[false,true,true,'sent'],[true,true,false,'suppressed'],[false,false,true,'suppressed']]){
    const value=validateBasics({alias:'Fixture',city:'Montréal',games:['chess'],isPublic,invitationEmails},games,['Montréal']).value;
    let sends=0;
    const repository={claim:async()=>({invitationId:id,memberId:'member-a',attempts:1}),loadCurrentInvitation:async()=>({id,memberId:'member-a',status:'sent',expiresAt:'2030-01-02T00:00:00Z',preferences:{invitationEmails:value.invitationEmails},emailPermitted,event:{status:'scheduled',visibility:'published',startAt:'2030-01-01T00:00:00Z',spotsLeft:1}}),finish:async()=>{}};
    const service=createInvitationDelivery({enabled:true,now:()=>0,repository,provider:{send:async({memberId})=>{assert.equal(memberId,'member-a');sends++;return {status:'sent'};}}});
    assert.equal((await service.deliverOne()).status,expected);assert.equal(sends,expected==='sent'?1:0);
  }
});
test('notification ownership is re-resolved per call and logged-out calls read no repository data',async()=>{
  let member={_id:'member-a'},reads=0;
  const service=createMemberNotifications({enabled:true,getMember:async()=>member,repository:{getForMember:async()=>{reads++;return {id,memberId:'member-a',status:'declined',event:{}};}}});
  assert.equal((await service.detail(id)).invitationId,id);
  member={_id:'member-b'};await assert.rejects(service.detail(id),/NOT_FOUND/);
  member=null;await assert.rejects(service.detail(id),/UNAUTHENTICATED/);assert.equal(reads,2);
});
