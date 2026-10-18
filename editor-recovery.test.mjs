import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {gameSlugs} from './profile-fields.js';
const source=readFileSync(new URL('./app.js',import.meta.url),'utf8').replace(/^import .*?;\r?\n/gm,'');
function harness() {
  const sent=[];let receive; const elements=new Map();
  const element=selector=>{if(!elements.has(selector)) elements.set(selector,{disabled:false,textContent:'',addEventListener(type,handler){this[type]=handler;},focus(){this.focused=true;}});return elements.get(selector);};
  const app={innerHTML:'',querySelector:element,querySelectorAll:()=>[]};
  const parent={postMessage:m=>sent.push(m)};
  const context=vm.createContext({document:{querySelector:()=>app},window:{parent,addEventListener:(_,fn)=>receive=fn},location:{hash:'#/my-profile'},URL,gameSlugs,dashboardHtml:()=>'<dashboard>',setTimeout:()=>1,clearTimeout(){},crypto:{randomUUID:()=> 'request-1'},FormData:class {get(key){return {alias:'Alice',city:'Sherbrooke'}[key]||'';}getAll(){return ['chess'];}}});
  vm.runInContext(source,context);
  const send=message=>receive({source:parent,origin:'https://www.jouerpourdebon.ca',data:message});
  send({type:'JPDB_PROFILE_EDITOR_DATA',payload:{profile:{alias:'Alice',city:'Sherbrooke',games:[{slug:'chess'}]},games:[{slug:'chess',nameFr:'Échecs'}]}});
  element('#edit').click();
  return {sent,send,element,app,submit:()=>element('#profile-form').submit({preventDefault(){},currentTarget:{}})};
}
test('duplicate submits are blocked and errors retain the form and selected games',()=>{
  const h=harness();h.submit();h.submit();assert.equal(h.sent.filter(m=>m.type==='JPDB_PROFILE_EDITOR_SAVE').length,1);
  const html=h.app.innerHTML;assert.match(html,/value="chess" checked/);
  h.send({type:'JPDB_PROFILE_EDITOR_ERROR',requestId:'request-1'});
  assert.equal(h.app.innerHTML,html);assert.equal(h.element('[type=submit]').disabled,false);assert.equal(h.element('#form-message').focused,true);
  h.submit();assert.equal(h.sent.filter(m=>m.type==='JPDB_PROFILE_EDITOR_SAVE').length,2);
});
test('foreign/stale results and background reload cannot discard an active draft',()=>{
  const h=harness();h.submit();const html=h.app.innerHTML;
  h.send({type:'JPDB_PROFILE_EDITOR_SAVED',requestId:'old-request'});
  h.send({type:'JPDB_PROFILE_EDITOR_DATA',payload:{profile:{alias:'Other'}}});
  h.send({type:'JPDB_PROFILE_EDITOR_ERROR',requestId:'old-request'});
  assert.equal(h.app.innerHTML,html);assert.equal(h.element('[type=submit]').disabled,true);
});
test('unconfirmed/expired session removes private draft and discards delayed old-session replies',()=>{
  for(const code of ['LOGIN_REQUIRED','SESSION_EXPIRED','SESSION_UNCONFIRMED']) {
    const h=harness();h.submit();h.send({type:'JPDB_PROFILE_EDITOR_ERROR',code});
    assert.doesNotMatch(h.app.innerHTML,/Alice|Sherbrooke|profile-form/);
    const cleared=h.app.innerHTML;
    h.send({type:'JPDB_PROFILE_EDITOR_DATA',payload:{profile:{alias:'Old account'}}});
    h.send({type:'JPDB_PROFILE_EDITOR_SAVED',requestId:'request-1'});
    assert.equal(h.app.innerHTML,cleared);
  }
});
