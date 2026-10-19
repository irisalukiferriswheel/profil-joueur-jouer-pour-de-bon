const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const c=await b.newContext({viewport:{width:390,height:900}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await c.route('https://profile.test/**',r=>{const file=new URL(r.request().url()).pathname.slice(1);return r.fulfill({body:fs.readFileSync(path.join(__dirname,'..',file)),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html; charset=utf-8'});});
 await c.route('https://parent.test/**',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:`<iframe style="width:100%;height:1500px;border:0" src="https://profile.test/index.html"></iframe><script>
 window.calls=[];window.returns=[];window.canReturn=false;window.mode='fail';window.profile={alias:'Fixture',city:'Montreal',games:['chess'],isPublic:false,socials:[]};
 window.reply=m=>document.querySelector('iframe').contentWindow.postMessage(m,'*');
 addEventListener('message',e=>{const m=e.data;if(m.type==='JPDB_PROFILE_EDITOR_READY'||m.type==='JPDB_PROFILE_EDITOR_REQUEST_DATA')reply({type:'JPDB_PROFILE_EDITOR_DATA',canContinueToEvent:canReturn,payload:{complete:true,profile,games:[{slug:'chess',nameFr:'Échecs'},{slug:'basketball',nameFr:'Basketball'}],dashboard:{}}});
 if(m.type==='JPDB_PROFILE_EDITOR_SAVE'){calls.push(m);setTimeout(()=>{if(mode==='fail')reply({type:'JPDB_PROFILE_EDITOR_ERROR',requestId:m.requestId,code:'SAVE_UNCONFIRMED'});else{profile=m.payload;canReturn=true;reply({type:'JPDB_PROFILE_EDITOR_SAVED',requestId:m.requestId});}},150);}
 if(m.type==='JPDB_PROFILE_CONTINUE_EVENT'){returns.push(m);reply({type:'JPDB_PLAYER_ACTION_RESULT',requestId:m.requestId,payload:{success:false}});}
 if(m.type==='JPDB_NOTIFICATION_REQUEST')reply({type:'JPDB_NOTIFICATION_RESULT',requestId:m.requestId,result:{success:true,data:m.action==='list'?{items:[],unreadCount:0,pendingCount:0}:null}});
 });</script>`}));
 await p.goto('https://parent.test/');const f=p.frameLocator('iframe');await f.locator('#edit').click();await f.locator('[name=alias]').fill('Edited fixture');await f.locator('[name=city]').fill('Sherbrooke');await f.locator('[value=basketball]').check();
 await f.locator('[type=submit]').click();assert.equal(await f.locator('[type=submit]').isDisabled(),true);await f.locator('#form-message').filter({hasText:'conservés'}).waitFor();assert.equal(await f.locator('[name=alias]').inputValue(),'Edited fixture');assert.equal(await p.evaluate(()=>calls.length),1);
 await p.evaluate(()=>{mode='success';reply({type:'JPDB_PROFILE_EDITOR_DATA',payload:{profile:{alias:'Stale'},games:[]}});});assert.equal(await f.locator('[name=alias]').inputValue(),'Edited fixture');
 await f.locator('[type=submit]').click();await f.locator('.identity').filter({hasText:'Edited fixture'}).waitFor();await f.locator('#continue-event').click();await f.getByText(/Retour indisponible/).waitFor();assert.equal(await p.evaluate(()=>returns.length),1);assert.equal(await f.locator('#continue-event').isDisabled(),false);await f.locator('#edit').click();assert.equal(await f.locator('[name=city]').inputValue(),'Sherbrooke');assert.equal(await f.locator('[name=games]:checked').count(),2);
 const sent=await p.evaluate(()=>calls.at(-1).payload);assert.deepEqual(sent.games,['chess','basketball']);assert.equal(sent.isPublic,false);assert.equal(sent.invitationEmails,undefined);
 if(process.env.SCREENSHOT_DIR)await p.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'composed-profile-mobile.png'),fullPage:true});
 await p.evaluate(()=>reply({type:'JPDB_PROFILE_SESSION_ENDED'}));await f.getByRole('heading',{name:'Connexion requise'}).waitFor();await p.evaluate(()=>reply({type:'JPDB_PROFILE_EDITOR_DATA',payload:{profile:{alias:'Stale private identity'}}}));assert.doesNotMatch(await f.locator('body').innerText(),/Stale private identity|Edited fixture|Mes invitations/);
 assert.deepEqual(errors,[]);console.log('PASS mocked host: failed save preserves draft, duplicate submit disabled, stale data ignored, retry/save/reedit, game slugs, independent consent, mobile, session invalidation clears profile and notifications.');
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
