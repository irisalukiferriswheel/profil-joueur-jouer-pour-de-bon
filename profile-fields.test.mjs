import test from 'node:test';
import assert from 'node:assert/strict';
import {createSignupFlow, validateBasics, gameSlugs} from './profile-fields.js';
const games=[{slug:'chess'}], cities=['Sherbrooke'];
const input={alias:' Alice ',city:'Sherbrooke',games:['chess','chess'],wixMemberId:'forged',email:'forged',role:'admin'};
function harness(options={}) {
  let profile=options.profile || null, calls=0, loggedIn=options.loggedIn ?? true;
  const flow=createSignupFlow({
    authenticate:async()=> { if(options.authError) throw new Error(); return {status:options.authStatus || 'authenticated'}; },
    load:async()=> {if(!loggedIn) throw Object.assign(new Error(),{code:'SESSION_EXPIRED'}); return {profile, basicsComplete:!!profile,games,cities};},
    save:async value=> {calls++; if(options.wait) await options.wait; if(!loggedIn) throw Object.assign(new Error(),{code:'SESSION_EXPIRED'}); if(options.fail) throw new Error(); profile=value;}
  });
  return {flow,get calls(){return calls;},expire(){loggedIn=false;}};
}
test('strict catalog validation, normalization, ownership projection and independent opt-ins',()=>{
  const result=validateBasics(input,games,cities).value;
  assert.deepEqual(result,{alias:'Alice',city:'Sherbrooke',games:['chess'],isPublic:false,invitationEmails:false});
  assert.equal(validateBasics({...input,isPublic:true},games,cities).value.invitationEmails,false);
  assert.equal(validateBasics({...input,invitationEmails:true},games,cities).value.isPublic,false);
  for(const bad of [{alias:''},{alias:'a'.repeat(101)},{city:'invented'},{games:[]},{games:['invented']}]) assert.ok(validateBasics({...input,...bad},games,cities).code);
  assert.deepEqual(gameSlugs(['chess',{slug:'chess'}]),['chess']);
});
test('signup success creates profile and completed members resume without another save',async()=>{
  const h=harness(); assert.equal((await h.flow.authenticate()).state,'editing');
  assert.equal((await h.flow.save(input)).state,'complete');
  assert.equal((await h.flow.resume()).state,'complete'); assert.equal(h.calls,1);
});
test('pending verification and cancellation never save or load as authenticated',async()=>{
  for(const [authStatus,state] of [['pending','verification-pending'],['cancelled','signed-out']]){
    const h=harness({authStatus}); assert.equal((await h.flow.authenticate()).state,state); assert.equal(h.calls,0);
  }
  assert.equal((await harness({authError:true}).flow.authenticate()).state,'error');
});
test('interrupted signup resumes editing and existing completed members can edit',async()=>{
  assert.equal((await harness().flow.resume()).state,'editing');
  const h=harness({profile:input}); assert.equal((await h.flow.resume()).state,'complete');
  assert.equal((await h.flow.save({...input,alias:'Bob'})).form.profile.alias,'Bob');
});
test('expired session cannot save; loaded draft remains available for retry',async()=>{
  const h=harness(); await h.flow.resume();h.expire();
  const result=await h.flow.save(input); assert.equal(result.state,'signed-out');assert.ok(result.form);
  assert.equal((await harness({loggedIn:false}).flow.resume()).state,'signed-out');
});
test('duplicate submit is single flight and a failed save is retryable',async()=>{
  let finish; const h=harness({wait:new Promise(r=>finish=r)});await h.flow.resume();
  const first=h.flow.save(input);assert.equal((await h.flow.save(input)).busy,true);finish();await first;assert.equal(h.calls,1);
  const failed=harness({fail:true});await failed.flow.resume();assert.equal((await failed.flow.save(input)).state,'error');await failed.flow.save(input);assert.equal(failed.calls,2);
});
