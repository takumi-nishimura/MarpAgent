const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const localRequire = createRequire(path.join(process.cwd(), 'package.json'));
const hash = data => createHash('sha256').update(data).digest('hex');
const { createConfiguredMarp } = localRequire('./src/slide-map');
const before = JSON.parse(fs.readFileSync(path.join(__dirname,'math-before.json')));
const after = {installedGlob:localRequire('glob/package.json').version,cases:{}};
for (const [name, value] of Object.entries(before.cases)) {
  const {html, css} = createConfiguredMarp().render('---\nmath: mathjax\n---\n'+value.markdown);
  const actual = {markdown:value.markdown,htmlSha256:hash(html),cssSha256:hash(css),glyphs:[...html.matchAll(/data-c="([^"]+)"/g)].map(m=>m[1]),hasError:/data-mjx-error|data-mml-node="merror"|<text\b/.test(html)};
  assert.deepEqual(actual,value,name+' rendered output changed');
  after.cases[name] = actual;
}
fs.writeFileSync(path.join(__dirname,'math-after.json'), JSON.stringify(after,null,2)+'\n', {flag:'wx'});
const artifacts = path.join(__dirname,'math-export-artifacts');
const source = path.join(artifacts,'source');
const relocated = path.join(artifacts,'relocated');
fs.mkdirSync(source,{recursive:true});fs.mkdirSync(relocated);
const input = path.join(source,'slide.md');
fs.writeFileSync(input, '---\nmarp: true\ntheme: default\nmath: mathjax\n---\n# Math dependency acceptance\n\n'+Object.values(before.cases).map(x=>x.markdown).join('\n\n')+'\n');
const commands=[];
for(const [flag,name] of [['--html','math.html'],['--pdf','math.pdf'],['--images','math.png'],['--zip','math.zip']]) {
  const args = [path.join(process.cwd(),'bin/marpx.js'),input,flag];
  if (flag==='--images') args.push('png');
  if (flag==='--zip') args.push('--strict-offline','--bundle-root',source);
  args.push('--output',path.join(artifacts,name));
  const output=execFileSync(process.execPath,args,{encoding:'utf8',timeout:120000,env:process.env});
  commands.push({command:process.execPath,args,exitCode:0,stdout:output});
}
assert.equal(fs.readFileSync(path.join(artifacts,'math.pdf')).subarray(0,5).toString(),'%PDF-');
const pngs=fs.readdirSync(artifacts).filter(n=>/^math\.\d+\.png$/.test(n));
assert.equal(pngs.length,1);
const png=fs.readFileSync(path.join(artifacts,pngs[0]));
assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
assert.equal(png.readUInt32BE(16),1280);assert.equal(png.readUInt32BE(20),720);
const {unzipSync}=localRequire('fflate');
const entries=unzipSync(fs.readFileSync(path.join(artifacts,'math.zip')));
for(const [name,bytes] of Object.entries(entries)) {
 const destination=path.resolve(relocated,name);assert.ok(destination.startsWith(relocated+path.sep));
 fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,bytes);
}
const bundleManifest=JSON.parse(Buffer.from(entries['manifest.json']).toString());
assert.deepEqual(bundleManifest.remoteDependencies,[]);assert.deepEqual(bundleManifest.unsupported,[]);
fs.renameSync(source, source+'-unavailable');
(async()=>{
 const {chromium}=localRequire('playwright');
 const browser=await chromium.launch();
 const seenRemote=[];const pages=[];
 try {
  for(const file of [path.join(artifacts,'math.html'),path.join(relocated,'index.html')]) {
   const context=await browser.newContext({offline:true});
   await context.route(/^https?:/,route=>{seenRemote.push(route.request().url());return route.abort();});
   const page=await context.newPage();await page.goto(pathToFileURL(file).href);
   const glyphs={};
   for(const code of ['1D7D9','211D','2115','E402']) {
    const loc=page.locator('mjx-container path[data-c="'+code+'"]').first();
    assert.equal(await loc.count(),1,code);
    const box=await loc.evaluate(p=>{const b=p.getBBox();return {width:b.width,height:b.height};});
    assert.ok(box.width>0&&box.height>0,code);glyphs[code]=box;
   }
   assert.equal(await page.locator('[data-mjx-error],[data-mml-node="merror"]').count(),0);
   pages.push({file,glyphs,containers:await page.locator('mjx-container').count()});await context.close();
  }
 } finally {await browser.close();}
 assert.deepEqual(seenRemote,[]);
 const files=Object.fromEntries(fs.readdirSync(artifacts).filter(n=>fs.statSync(path.join(artifacts,n)).isFile()).map(n=>{const b=fs.readFileSync(path.join(artifacts,n));return[n,{bytes:b.length,sha256:hash(b)}]}));
 const report={revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),status:execFileSync('git',['status','--porcelain=v1'],{encoding:'utf8'}).trim(),observedAt:new Date().toISOString(),commands,mathCaseCount:6,htmlCssUnchanged:true,png:{width:1280,height:720},pages,seenRemote,files};
 fs.writeFileSync(path.join(__dirname,'math-export-results.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
