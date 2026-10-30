const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const toolsDir = '/home/hapticslab/projects/MarpAgent/.cache/backlog-20261030/coordination/tools/full-acceptance-20261030';
const fontDir = path.join(toolsDir, 'browser-fonts');
const cacheDir = path.join(toolsDir, 'fontconfig-cache');
const configDir = path.join(toolsDir, 'fontconfig');
const config = path.join(configDir, 'fonts.conf');
const font = path.join(fontDir, 'NotoSansJP-Regular.ttf');
const source = path.join(toolsDir, 'NotoSansJP-Regular.ttf');
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const expectedHash = '6f513200a25f77ccd4388393d973f4c32a3f06fe9145e6a0fab38d16f2dc4819';
if (hash(source) !== expectedHash) throw new Error('Unexpected prepared font');
function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { encoding: 'utf8', env });
  if (result.error || result.status !== 0) throw result.error || new Error(result.stderr);
  return result.stdout.trim();
}
const before = {
  match: run('fc-match', ['-f', '%{file}\n%{family}\n', 'Noto Sans JP']),
  japaneseFonts: run('fc-list', [':lang=ja', 'family', 'file'])
};
for (const directory of [fontDir, cacheDir, configDir]) fs.mkdirSync(directory, { recursive: true });
fs.copyFileSync(source, font, fs.constants.COPYFILE_EXCL);
fs.writeFileSync(config, '<?xml version="1.0"?>\n<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">\n<fontconfig>\n  <cachedir>' + cacheDir + '</cachedir>\n  <include>/etc/fonts/fonts.conf</include>\n  <dir>' + fontDir + '</dir>\n</fontconfig>\n', { flag: 'wx' });
const env = { ...process.env, FONTCONFIG_FILE: config };
run('fc-cache', ['-f', fontDir], env);
const after = {
  match: run('fc-match', ['-f', '%{file}\n%{family}\n', 'Noto Sans JP'], env),
  japaneseFonts: run('fc-list', [':lang=ja', 'family', 'file'], env)
};
if (!after.match.startsWith(font + '\n') || !after.japaneseFonts.includes(font)) throw new Error('Pinned font not selected');
const manifest = {
  observedAt: new Date().toISOString(), before, after,
  font: { path: font, sha256: hash(font) },
  fontconfig: { path: config, sha256: hash(config), cacheDir },
  scope: 'Per-process FONTCONFIG_FILE; tracked files, tests and global font directories unchanged'
};
fs.writeFileSync(path.join(__dirname, 'browser-font-setup.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(manifest, null, 2));
