import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('./i18n.js',import.meta.url),'utf8');
const catalog=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('all extracted authored profile labels have English entries',()=>{
 for(const file of ['app.js','dashboard-view.js'])for(const match of fs.readFileSync(new URL(file,import.meta.url),'utf8').matchAll(/\bt\(("(?:[^"\\]|\\.)*")\)/g))assert.ok(Object.hasOwn(catalog.en,JSON.parse(match[1])),`${file}: ${match[1]}`);
});
test('transient authored labels translate back; unknown content stays original',()=>{
 catalog.setLocale('en');assert.equal(catalog.t('Alias public'),'Public alias');assert.equal(catalog.t('Nom utilisateur original'),'Nom utilisateur original');catalog.setLocale('fr');assert.equal(catalog.t('Public alias'),'Alias public');
});
