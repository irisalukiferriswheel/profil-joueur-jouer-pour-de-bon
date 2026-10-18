const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const context=await browser.newContext({viewport:{width:390,height:900}}),page=await context.newPage();
 const errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()!=='GET')writes.push(r.url());});
 await context.route('https://fixture.test/**',r=>{const file=new URL(r.request().url()).pathname.slice(1);return r.fulfill({body:fs.readFileSync(path.join(__dirname,'..',file)),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html; charset=utf-8'});});
 for(const entry of ['index.html#/preview-profile','journey-preview.html']){
  await page.goto('https://fixture.test/'+entry);await page.locator('#edit').click();
  const names=await page.locator('form input:not([name=games])').evaluateAll(nodes=>nodes.map(n=>n.name));
  assert.deepEqual(names,['alias','city','website','instagram','tiktok','youtube','isPublic']);
  assert.equal(await page.locator('[name=games]:checked').count(),2);
  for(const box of await page.locator('[name=games]').all()) await box.uncheck();await page.locator('[type=submit]').click();assert.match(await page.locator('#form-message').innerText(),/au moins un jeu/);
  await page.locator('[value=chess]').focus();await page.keyboard.press('Space');
  await page.locator('[name=alias]').fill('Local fixture');await page.locator('[type=submit]').click();
  assert.match(await page.locator('.identity').innerText(),/Local fixture/);await page.locator('#edit').click();
  assert.equal(await page.locator('[name=games]:checked').count(),1);assert.equal(await page.locator('[value=chess]').isChecked(),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(process.env.SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,entry.startsWith('index')?'minimal-original-editor.png':'minimal-additive-editor.png'),fullPage:true});
 }
 assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);console.log('PASS original + published additive profile: original fields preserved, canonical game slugs, zero-game validation, keyboard selection, save/re-edit, mobile layout; no network writes/errors.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

