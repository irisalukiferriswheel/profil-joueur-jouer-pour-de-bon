const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const code=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
function harness() {
 const sent=[],listeners={},elements=new Map();
 const app={innerHTML:'',querySelector:selector=>{if(!elements.has(selector))elements.set(selector,{disabled:false,textContent:'',addEventListener(type,fn){this[type]=fn;}});return elements.get(selector);}};
 const parent={postMessage:m=>sent.push(m)};
 const context={window:{parent,addEventListener:(name,fn)=>listeners[name]=fn},document:{querySelector:()=>app},location:{hash:'#/my-profile'},Intl,setTimeout:()=>1,clearTimeout(){},FormData:class {get(key){return {alias:'Typed alias',city:'Typed city',isPublic:'on'}[key]||'';}}};
 vm.runInNewContext(code+'\nglobalThis.submit=saveProfile; globalThis.edit=renderEditor;',context);
 const receive=data=>listeners.message({source:parent,data});
 receive({type:'JPDB_PROFILE_EDITOR_DATA',payload:{profile:{alias:'Original',games:['chess']},games:[]}});
 context.edit();
 return {app,elements,sent,receive,submit:()=>context.submit({preventDefault(){},currentTarget:{}})};
}
test('duplicate submit while pending sends one save and disables navigation',()=>{const h=harness();h.submit();h.submit();assert.equal(h.sent.filter(m=>m.type==='JPDB_PROFILE_EDITOR_SAVE').length,1);assert.equal(h.elements.get('#profile-form button[type="submit"]').disabled,true);assert.equal(h.elements.get('#back').disabled,true);const html=h.app.innerHTML;h.elements.get('#back').click();assert.equal(h.app.innerHTML,html);});
test('save error keeps the form DOM and typed state, restores controls, and hides raw server errors',()=>{const h=harness();h.submit();const html=h.app.innerHTML;h.app.querySelector('input[name="alias"]').value='Typed unsaved alias';h.receive({type:'JPDB_PROFILE_EDITOR_ERROR',message:'sensitive raw details'});assert.equal(h.app.innerHTML,html);assert.equal(h.elements.get('input[name="alias"]').value,'Typed unsaved alias');assert.equal(h.elements.get('#profile-form button[type="submit"]').disabled,false);assert.match(h.elements.get('#form-message').textContent,/conservées/);assert.doesNotMatch(h.elements.get('#form-message').textContent,/sensitive/);h.submit();assert.equal(h.sent.filter(m=>m.type==='JPDB_PROFILE_EDITOR_SAVE').length,2);});
test('late load data cannot replace an open edit form',()=>{const h=harness(),html=h.app.innerHTML;h.receive({type:'JPDB_PROFILE_EDITOR_DATA',payload:{profile:{alias:'Stale'},games:[]}});assert.equal(h.app.innerHTML,html);});
test('success requests authoritative readback, not optimistic local success',()=>{const h=harness();h.submit();const before=h.sent.filter(m=>m.type==='JPDB_PROFILE_EDITOR_REQUEST_DATA').length;h.receive({type:'JPDB_PROFILE_EDITOR_SAVED'});assert.equal(h.sent.filter(m=>m.type==='JPDB_PROFILE_EDITOR_REQUEST_DATA').length,before+1);h.receive({type:'JPDB_PROFILE_EDITOR_DATA',payload:{profile:{alias:'Server confirmed'},games:[]}});assert.match(h.app.innerHTML,/Server confirmed/);});
