const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const code=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
function exercise(values={},profile={}) {
 const sent=[],listeners={},nodes=new Map(),app={innerHTML:'',querySelector:selector=>{if(!nodes.has(selector))nodes.set(selector,{addEventListener(){}});return nodes.get(selector);}},parent={postMessage:m=>sent.push(m)};
 const context={window:{parent,addEventListener:(name,fn)=>listeners[name]=fn},document:{querySelector:()=>app},location:{hash:'#/my-profile'},Intl,setTimeout:()=>1,clearTimeout(){},FormData:class {get(key){return values[key]??'';}}};
 vm.runInNewContext(code+'\nglobalThis.submit=saveProfile;globalThis.edit=renderEditor;',context);
 listeners.message({source:parent,data:{type:'JPDB_PROFILE_EDITOR_DATA',payload:{profile:{alias:'Fixture',city:'Fixture',games:['chess'],...profile},games:[]}}});
 context.edit();const editor=app.innerHTML;
 context.submit({preventDefault(){},currentTarget:{}});
 const payload=JSON.parse(JSON.stringify(sent.find(m=>m.type==='JPDB_PROFILE_EDITOR_SAVE').payload));
 return {payload,editor};
}
for(const [field,max]of [['alias',100],['city',150]]){
 test(`${field}: trims surrounding whitespace and preserves Unicode`,()=>{assert.equal(exercise({[field]:'  Élodie 東京 🏆  '}).payload[field],'Élodie 東京 🏆');});
 test(`${field}: empty and whitespace normalize empty for backend validation`,()=>{assert.equal(exercise({[field]:''}).payload[field],'');assert.equal(exercise({[field]:'   '}).payload[field],'');});
 test(`${field}: current client truncates at ${max} UTF-16 code units`,()=>{assert.equal(exercise({[field]:'a'.repeat(max+1)}).payload[field].length,max);});
}
for(const platform of ['website','instagram','tiktok','youtube']){
 test(`${platform}: HTTPS Unicode URL maps to its correct social key`,()=>{assert.deepEqual(exercise({[platform]:'  https://example.invalid/été?name=東京  '}).payload.socials,[{platform,url:'https://example.invalid/été?name=東京'}]);});
 test(`${platform}: blank and non-HTTPS URLs are silently omitted by current handler`,()=>{for(const value of ['', '   ', 'http://example.invalid', 'javascript:alert(1)', 'not a URL'])assert.deepEqual(exercise({[platform]:value}).payload.socials,[]);});
 test(`${platform}: current handler truncates URL at 500 code units`,()=>{const value='https://example.invalid/'+ 'a'.repeat(600);assert.equal(exercise({[platform]:value}).payload.socials[0].url.length,500);});
}
test('rendered attributes escape aliases, cities, and social URL quotes',()=>{const hostile='\"><img src=x onerror=alert(1)>',r=exercise({}, {alias:hostile,city:hostile,socials:[{platform:'website',url:'https://example.invalid/'+hostile}]});assert.doesNotMatch(r.editor,/<img src=x/);assert.match(r.editor,/&quot;&gt;&lt;img/);});
test('documents URL-validation gap: handler accepts a bare https prefix if browser validation is bypassed',()=>{assert.deepEqual(exercise({website:'https://'}).payload.socials,[{platform:'website',url:'https://'}]);});
test('documents markup validation: alias required, city optional, URLs use native URL input',()=>{const {editor}=exercise();assert.match(editor,/<input name="alias"[^>]* required>/);assert.match(editor,/<input name="city"[^>]*>/);assert.doesNotMatch(editor,/<input name="city"[^>]*required/);for(const platform of ['website','instagram','tiktok','youtube'])assert.match(editor,new RegExp('<input name="'+platform+'" type="url"'));});
