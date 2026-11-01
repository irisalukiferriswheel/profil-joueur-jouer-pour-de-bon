const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const code=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
function save(games) {
 const sent=[],listeners={},app={innerHTML:'',querySelector:()=>({addEventListener(){}})},parent={postMessage:m=>sent.push(m)};
 const context={window:{parent,addEventListener:(name,fn)=>listeners[name]=fn},document:{querySelector:()=>app},location:{hash:'#/my-profile'},Intl,setTimeout:()=>1,clearTimeout(){},FormData:class {get(key){return {alias:'Changed alias',city:'Fixture city',isPublic:'on'}[key]||'';}}};
 vm.runInNewContext(code+'\nglobalThis.submit=saveProfile;',context);
 listeners.message({source:parent,data:{type:'JPDB_PROFILE_EDITOR_DATA',payload:{profile:{alias:'Original',games},games:[]}}});
 context.submit({preventDefault(){},currentTarget:{}});
 return JSON.parse(JSON.stringify(sent.find(m=>m.type==='JPDB_PROFILE_EDITOR_SAVE').payload));
}
test('loaded game objects are sent as slug strings required by onboarding',()=>{assert.deepEqual(save([{slug:'chess',nameFr:'Échecs'},{slug:'basketball'}]).games,['chess','basketball']);});
test('existing slug strings remain compatible with both host bridges',()=>{const payload=save(['chess']);assert.deepEqual(payload.games,['chess']);assert.equal(payload.alias,'Changed alias');});
test('missing or invalid games are not invented and remain subject to backend validation',()=>{assert.deepEqual(save(undefined).games,[]);assert.deepEqual(save([null,{},'chess']).games,['chess']);});
