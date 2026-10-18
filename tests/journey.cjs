const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base='https://irisalukiferriswheel.github.io',profile='/profil-joueur-jouer-pour-de-bon/',organizer='/espace-organisateur-jouer-pour-de-bon/';
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{
 const context=await browser.newContext({viewport:{width:1100,height:900}}),page=await context.newPage(),writes=[],errors=[];
 page.on('request',r=>{if(r.method()!=='GET')writes.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
 await context.route(base+'/**',r=>{const u=new URL(r.request().url()),isProfile=u.pathname.startsWith(profile),prefix=isProfile?profile:organizer,file=u.pathname.slice(prefix.length)||'index.html',root=isProfile?path.join(__dirname,'..'):path.join(__dirname,'../../organizer-eligibility');return r.fulfill({body:fs.readFileSync(path.join(root,file)),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html; charset=utf-8'});});
 await context.route('https://jouer-pour-de-bon-api.onrender.com/**',r=>r.fulfill({json:{success:true,data:[]}}));
 await page.goto(base+profile+'index.html#/preview-profile');
 const original=await page.locator('.identity,.stats,.causes,.grid,.note').allTextContents();
 await page.locator('#edit').click();const fields=await page.locator('#profile-form input').evaluateAll(ns=>ns.map(n=>n.name));
 await page.goto(base+profile+'journey-preview.html');assert.deepEqual(await page.locator('.identity,.stats,.causes,.grid,.note').allTextContents(),original);
 await page.locator('#edit').click();assert.deepEqual(await page.locator('#profile-form input').evaluateAll(ns=>ns.map(n=>n.name)),fields);
 await page.locator('[name=alias]').fill('LocalFixture');await page.locator('[type=submit]').click();assert.match(await page.locator('.identity').innerText(),/LocalFixture/);
 await page.locator('#journey-organizer').click();await page.locator('[name=title]').fill('PRIVATE_TITLE_MUST_NOT_TRANSFER');await page.locator('[name=capacity]').fill('2');
 const child=page.frameLocator('#workflowFrame');await child.locator('#enableJourney').click();await child.locator('#simulatePublish').click();
 const raw=await page.evaluate(()=>sessionStorage.getItem('jpdb-fictional-journey-v1'));assert.ok(!raw.includes('PRIVATE'));assert.deepEqual(Object.keys(JSON.parse(raw)),['capacity','open','invites','registered']);
 // The currently published organizer still links to its working old test page.
 // Navigate explicitly to the proposed additive target until publication is approved.
 await page.goto(base+profile+'journey-preview.html');await page.locator('#acceptTest').click();assert.match(await page.locator('.journey-count').innerText(),/1 \/ 2/);
 await page.locator('#journeyPerson').selectOption('1');await page.locator('#declineTest').click();assert.match(await page.locator('#journeyPanel').innerText(),/Invitation refusée/);
 await page.locator('#journey-calendar').click();await page.locator('#journeyPerson').selectOption('2');await page.locator('#openTestEvent').click();await page.locator('#joinTest').click();await page.locator('#joinTest').click();assert.match(await page.locator('#journeyStatus').innerText(),/déjà inscrit/);
 await page.locator('#journeyPerson').selectOption('3');await page.locator('#joinTest').click();assert.match(await page.locator('#journeyStatus').innerText(),/Complet/);
 await page.goto(base+profile+'journey-preview.html?lang=en');await page.locator('#profileBracket').click();assert.equal(await page.locator('#profileTestBracket li').count(),1);assert.match(await page.locator('#journeyPanel').innerText(),/My test events/);
 if(process.env.SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'existing-profile-desktop.png'),fullPage:true});
 await page.reload();assert.match(await page.locator('.journey-count').innerText(),/2 \/ 2/);await page.locator('#journeyPerson').selectOption('1');assert.match(await page.locator('#journeyPanel').innerText(),/Invitation declined/);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('body').evaluate(n=>n.scrollWidth<=innerWidth),true);
 if(process.env.SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'existing-profile-mobile.png'),fullPage:true});
 await page.locator('#resetJourney').click();assert.equal(await page.evaluate(()=>sessionStorage.getItem('jpdb-fictional-journey-v1')),null);
 // Forced preview also stays local when embedded: no private Wix bridge messages.
 await page.route('https://wix-fixture.test/**',r=>r.fulfill({body:'<iframe src="'+base+profile+'journey-preview.html"></iframe><script>window.received=[];addEventListener("message",e=>received.push(e.data))</script>',contentType:'text/html'}));
 await page.goto('https://wix-fixture.test/');const frame=page.frameLocator('iframe');await frame.locator('#edit').click();await frame.locator('[name=alias]').fill('IframeFixture');await frame.locator('[type=submit]').click();assert.deepEqual(await page.evaluate(()=>received),[]);assert.match(await frame.locator('#journeyPanel').innerText(),/Aucun événement/);assert.equal(await frame.locator('#journey-calendar').getAttribute('target'),'_top');
 assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);console.log('PASS original profile sections/editor preserved; local edits; organizer -> existing profile -> calendar state; accept/decline; duplicate/full; bracket; FR/EN; mobile; reset; iframe privacy and zero writes.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
