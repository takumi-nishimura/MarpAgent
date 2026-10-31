const fs = require('node:fs');
const path = require('node:path');
const { spawnSync, spawn } = require('node:child_process');
const { createHash } = require('node:crypto');
const [label, command, ...args] = process.argv.slice(2);
if (!/^[a-z0-9-]+$/.test(label || '') || !command) throw new Error('Expected label and command');
const runDir = __dirname;
const logPath = path.join(runDir, `${label}.log`);
const resultPath = path.join(runDir, `${label}.json`);
if (fs.existsSync(logPath) || fs.existsSync(resultPath)) throw new Error('Existing run evidence must not be overwritten');
function git(...args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0 || result.error) throw result.error || new Error(result.stderr);
  return result.stdout.trim();
}
function hash(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
const before = { revision: git('rev-parse', 'HEAD'), branch: git('branch', '--show-current'), status: git('status', '--porcelain=v1'), lockSha256: hash('package-lock.json') };
if (before.branch !== 'codex/audit-followup-20261031' || hash('.github/dependency-audit-baseline.json') !== '181d2718ac3153409387f67d7d29c444b1ba2ad3bf54a608e4e3e5de34712092') throw new Error(`Unexpected checkout: ${JSON.stringify(before)}`);
const record = {
  label, command, args, cwd: process.cwd(), startedAt: new Date().toISOString(), before,
  environment: Object.fromEntries(['FONTCONFIG_FILE', 'FONTCONFIG_PATH', 'MARP_AGENT_TEST_JAPANESE_FONT_PATH', 'PATH', 'CI', 'MARP_AGENT_D2_PATH', 'MARP_AGENT_D2_FONT_PATH', 'MARP_AGENT_ZIP_D2_ARTIFACT_DIR', 'CHROME_NO_SANDBOX', 'MARP_AGENT_REQUIRE_VISUAL', 'MARP_AGENT_STRICT_E2E', 'NODE_OPTIONS', 'PLAYWRIGHT_BROWSERS_PATH'].map(key => [key, process.env[key] ?? null]))
};
fs.writeFileSync(resultPath, JSON.stringify(record, null, 2) + '\n');
const log = fs.createWriteStream(logPath);
const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { log.write(chunk); process.stdout.write(chunk); });
child.on('error', error => { record.error = error.message; });
child.on('close', (exitCode, signal) => {
  log.end(() => {
    record.exitCode = exitCode;
    record.signal = signal;
    record.finishedAt = new Date().toISOString();
    record.after = { revision: git('rev-parse', 'HEAD'), branch: git('branch', '--show-current'), status: git('status', '--porcelain=v1'), lockSha256: hash('package-lock.json') };
    record.log = { path: logPath, sha256: hash(logPath) };
    fs.writeFileSync(resultPath, JSON.stringify(record, null, 2) + '\n');
    console.log(`Recorded ${label}: exit ${exitCode}; ${resultPath}`);
    process.exitCode = exitCode ?? 1;
    if (record.after.revision !== before.revision || hash('.github/dependency-audit-baseline.json') !== '181d2718ac3153409387f67d7d29c444b1ba2ad3bf54a608e4e3e5de34712092') process.exitCode = 1;
  });
});
