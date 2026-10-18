import test from 'node:test';import assert from 'node:assert/strict';
import {createProfileEditTransport} from '../profile-edit-transport.js';
test('save correlation rejects duplicates and stale acknowledgements; session end is irreversible',()=>{
 const sent=[],data=[],errors=[];let saved=0,ended=0;
 const t=createProfileEditTransport({send:m=>sent.push(m),onData:m=>data.push(m),onSaved:()=>saved++,onError:c=>errors.push(c),onSessionEnded:()=>ended++});
 t.editing(true);assert.equal(t.save({alias:'fixture'}),true);assert.equal(t.save({alias:'duplicate'}),false);
 t.receive({type:'JPDB_PROFILE_EDITOR_SAVED',requestId:'stale'});assert.equal(saved,0);
 t.receive({type:'JPDB_PROFILE_EDITOR_DATA',payload:{alias:'stale'}});assert.equal(data.length,0);
 t.receive({type:'JPDB_PROFILE_EDITOR_ERROR',requestId:sent[0].requestId,code:'SAVE_FAILED'});assert.deepEqual(errors,['SAVE_FAILED']);
 assert.equal(t.save({alias:'retry'}),true);t.receive({type:'JPDB_PROFILE_EDITOR_SAVED',requestId:sent[0].requestId});assert.equal(saved,0);
 t.receive({type:'JPDB_PROFILE_EDITOR_SAVED',requestId:sent[1].requestId});assert.equal(saved,1);
 t.receive({type:'JPDB_PROFILE_SESSION_ENDED'});assert.equal(ended,1);t.receive({type:'JPDB_PROFILE_EDITOR_DATA'});assert.equal(data.length,0);assert.equal(t.save({}),false);
});
test('lost acknowledgement releases retry without claiming success',async()=>{
 let error,saved=0;
 const t=createProfileEditTransport({send(){},onData(){},onSaved:()=>saved++,onError:c=>error=c,onSessionEnded(){},timeout:5});t.save({});
 await new Promise(r=>setTimeout(r,15));assert.equal(error,'SAVE_UNCONFIRMED');assert.equal(saved,0);assert.equal(t.save({}),true);t.receive({type:'JPDB_PROFILE_SESSION_ENDED'});
});
