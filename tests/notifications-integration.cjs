const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{
const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await context.route('https://profile.test/**',r=>{const file=new URL(r.request().url()).pathname.slice(1)||'index.html';return r.fulfill({body:fs.readFileSync(path.join(__dirname,'..',file)),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html; charset=utf-8'});});
await context.route('https://parent.test/**',r=>r.fulfill({contentType:'text/html',body:`<iframe src="https://profile.test/index.html"></iframe><script>
window.calls=[];let accepted=false;addEventListener('message',e=>{const m=e.data;
if(m.type==='JPDB_PROFILE_EDITOR_READY'||m.type==='JPDB_PROFILE_EDITOR_REQUEST_DATA')e.source.postMessage({type:'JPDB_PROFILE_EDITOR_DATA',payload:{profile:{alias:'Fixture',city:'Montreal',games:[],socials:[]},member:{},dashboard:{}}},'*');
if(m.type==='JPDB_NOTIFICATION_REQUEST'){calls.push(m);if(m.action==='accepted')accepted=true;const item={invitationId:'11111111-1111-4111-8111-111111111111',eventId:'22222222-2222-4222-8222-222222222222',title:'Chess fixture',availability:accepted?'accepted':'pending',status:accepted?'accepted':'sent',isNew:true,canAccept:!accepted,canDecline:!accepted};e.source.postMessage({type:'JPDB_NOTIFICATION_RESULT',requestId:m.requestId,result:{success:true,data:m.action==='list'?{items:[item],unreadCount:1,pendingCount:accepted?0:1}:{registrationStatus:'confirmed'}}},'*');}});</script>`}));
await page.goto('https://parent.test/');const frame=page.frameLocator('iframe');
await frame.getByRole('heading',{name:'Mes invitations',exact:true}).waitFor();assert.equal(await frame.locator('.identity,.stats,.causes,.grid,.note').count(),5);
await frame.getByRole('button',{name:'Accepter',exact:true}).click();await frame.getByText('Réponse enregistrée.',{exact:true}).waitFor();
const actions=await page.evaluate(()=>calls.filter(c=>c.action==='accepted'));assert.equal(actions.length,1);assert.deepEqual(Object.keys(actions[0]).sort(),['action','invitationId','requestId','type']);
const continuation=frame.getByRole('link',{name:"Continuer l'inscription",exact:true});assert.equal(await continuation.getAttribute('target'),'_top');assert.equal(await continuation.getAttribute('href'),'https://www.jouerpourdebon.ca/inscription?jpdbEvent=22222222-2222-4222-8222-222222222222');
await frame.getByRole('button',{name:'English',exact:true}).click();await frame.getByRole('heading',{name:'My invitations',exact:true}).waitFor();
await page.setViewportSize({width:390,height:844});assert.deepEqual(errors,[]);
console.log('PASS additive authenticated notification UI, preserved profile sections, explicit response and FR/EN; mocked bridge only.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
