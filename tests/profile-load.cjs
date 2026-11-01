const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const code = fs.readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
function harness({embedded=true, preview=false}={}) {
  const listeners={}, timers=new Map(), sent=[];
  const app={innerHTML:'',querySelector:()=>({addEventListener(){}})};
  const parent={postMessage:m=>sent.push(m)};
  const window={parent,addEventListener:(name,fn)=>listeners[name]=fn};
  if (!embedded) window.parent=window;
  vm.runInNewContext(code,{document:{querySelector:()=>app},window,location:{hash:preview?'#/preview-profile':'#/my-profile'},Intl,URL,FormData:class{},setTimeout:fn=>{timers.set(1,fn);return 1;},clearTimeout:id=>timers.delete(id)});
  return {app,sent,receive:(data,source=parent)=>listeners.message?.({data,source}),expire:()=>{for(const fn of [...timers.values()])fn();}};
}
test('a host error stays visible after the initial load deadline',()=>{const h=harness();h.receive({type:'JPDB_PROFILE_EDITOR_ERROR',message:'Service indisponible'});h.expire();assert.match(h.app.innerHTML,/Service indisponible/);assert.doesNotMatch(h.app.innerHTML,/Connexion requise/);});
test('a missing host response does not assert that the member is logged out',()=>{const h=harness();h.expire();assert.doesNotMatch(h.app.innerHTML,/Connexion requise/);assert.match(h.app.innerHTML,/chargement|charger/i);});
test('successful data cancels the deadline',()=>{const h=harness();h.receive({type:'JPDB_PROFILE_EDITOR_DATA',payload:{profile:{alias:'Fixture'},games:[]}});h.expire();assert.match(h.app.innerHTML,/Fixture/);assert.doesNotMatch(h.app.innerHTML,/Connexion requise/);});
test('late authenticated host data can recover from timeout',()=>{const h=harness();h.expire();h.receive({type:'JPDB_PROFILE_EDITOR_DATA',payload:{profile:{alias:'Late fixture'},games:[]}});assert.match(h.app.innerHTML,/Late fixture/);});
test('unrelated window cannot supply profile data',()=>{const h=harness();h.receive({type:'JPDB_PROFILE_EDITOR_DATA',payload:{profile:{alias:'Untrusted'}}},{});assert.doesNotMatch(h.app.innerHTML,/Untrusted/);});
test('standalone private page stays gated and sends nothing',()=>{const h=harness({embedded:false});assert.match(h.app.innerHTML,/Connexion requise/);assert.equal(h.sent.length,0);});
test('fictional preview does not request private data',()=>{const h=harness({preview:true});assert.match(h.app.innerHTML,/données fictives/);assert.equal(h.sent.length,0);});
