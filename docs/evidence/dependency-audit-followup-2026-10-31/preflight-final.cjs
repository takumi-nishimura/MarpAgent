const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createRequire } = require('node:module');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const localRequire = createRequire(path.join(process.cwd(), 'package.json'));
const tools = '/home/hapticslab/projects/MarpAgent/.cache/backlog-20261030/coordination/tools/full-acceptance-20261030';
const exec = (command, args) => execFileSync(command, args, { encoding: 'utf8' }).trim();
function fileInfo(file) {
  return { path: fs.realpathSync(file), sha256: createHash('sha256').update(fs.readFileSync(file)).digest('hex') };
}
(async () => {
  const fontInfo = JSON.parse(exec('uv', ['run', '--no-project', '--with', 'fonttools==4.60.1', 'python', '-c',
    'import json,sys,fontTools; from fontTools.ttLib import TTFont; f=TTFont(sys.argv[1]); print(json.dumps({"python":sys.version,"fonttools":fontTools.__version__,"weight":f["OS/2"].usWeightClass,"variable":"fvar" in f}))', process.env.MARP_AGENT_D2_FONT_PATH]));
  assert.equal(fontInfo.fonttools, '4.60.1');
  assert.equal(fontInfo.weight, 400);
  assert.equal(fontInfo.variable, false);
  const manifest = {
    observedAt: new Date().toISOString(), revision: exec('git', ['rev-parse', 'HEAD']), status: exec('git', ['status', '--porcelain=v1']),
    host: { name: os.hostname(), platform: os.platform(), arch: os.arch(), release: os.release() },
    node: { version: process.version, executable: process.execPath }, npm: exec('npm', ['--version']),
    uv: { version: exec('uv', ['--version']), ...fileInfo(path.join(tools, 'uv-0.13.1/uv')) },
    d2: { version: exec(process.env.MARP_AGENT_D2_PATH, ['--version']), ...fileInfo(process.env.MARP_AGENT_D2_PATH), archive: fileInfo(path.join(tools, 'd2-v0.9.0-linux-amd64.tar.gz')) },
    font: { ...fontInfo, ...fileInfo(process.env.MARP_AGENT_D2_FONT_PATH), variableSource: fileInfo(path.join(tools, 'NotoSansJP-variable.ttf')) },
    lock: fileInfo('package-lock.json'), package: fileInfo('package.json'), baseline: fileInfo('.github/dependency-audit-baseline.json'), workflow: fileInfo('.github/workflows/quality-gate.yml'),
    playwright: localRequire('playwright/package.json').version, puppeteer: localRequire('puppeteer-core/package.json').version,
    browsers: []
  };
  assert.equal(manifest.revision, 'c89b9146b33c94a3ddbff6536d5c66c844b15143');
  assert.equal(manifest.status, '');
  assert.equal(manifest.baseline.sha256, '181d2718ac3153409387f67d7d29c444b1ba2ad3bf54a608e4e3e5de34712092');
  assert.equal(manifest.lock.sha256, '44f3f12399951b53f092c4ea3d8c3d30899f12de53858c458b87e9dbbb2c66fd');
  assert.equal(manifest.d2.archive.sha256, '5669ddc46b99e942cc96078f4a4e36d5e62103348f4c05179ede27802fdd87a9');
  assert.equal(manifest.font.variableSource.sha256, 'c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f');
  assert.equal(manifest.font.sha256, '6f513200a25f77ccd4388393d973f4c32a3f06fe9145e6a0fab38d16f2dc4819');
  assert.equal(manifest.uv.sha256, 'db919fb9428cc8ad04377ba3c898e0ec5fbee83700da5b982b1c9539f1e1b34f');
  manifest.fontconfig = {
    ...fileInfo(process.env.FONTCONFIG_FILE),
    selectedFont: fileInfo(exec('fc-match', ['-f', '%{file}', 'Noto Sans JP'])),
    japaneseFonts: exec('fc-list', [':lang=ja', 'family', 'file'])
  };
  assert.equal(manifest.fontconfig.selectedFont.sha256, manifest.font.sha256);
  assert.equal(manifest.fontconfig.sha256, '574e1f0a29d91069c15d6f4387c621324e7bb6758d21639a392cd95cac3468b6');
  assert.equal(manifest.node.version, 'v25.6.0');
  assert.match(manifest.uv.version, /^uv 0\.13\.1\b/);
  assert.equal(manifest.d2.version, 'v0.9.0');
  const { registry } = localRequire('playwright-core/lib/server/registry/index');
  const { chromium, firefox } = localRequire('playwright');
  for (const [name, type, executable] of [
    ['chromium-headless-shell', chromium, registry.findExecutable('chromium-headless-shell').executablePath()],
    ['firefox', firefox, firefox.executablePath()]
  ]) {
    const browser = await type.launch();
    try { manifest.browsers.push({ name, version: browser.version(), ...fileInfo(executable) }); }
    finally { await browser.close(); }
  }
  fs.writeFileSync(path.join(__dirname, 'environment.json'), JSON.stringify(manifest, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify(manifest, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
