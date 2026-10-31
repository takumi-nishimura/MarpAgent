#!/usr/bin/env bash
set -euo pipefail
acceptance_tools=/home/hapticslab/projects/MarpAgent/.cache/backlog-20261030/coordination/tools/full-acceptance-20261030
curl --fail --location --retry 3 https://github.com/terrastruct/d2/releases/download/v0.9.0/d2-v0.9.0-linux-amd64.tar.gz -o "$acceptance_tools/d2-v0.9.0-linux-amd64.tar.gz"
printf '%s  %s\n' 5669ddc46b99e942cc96078f4a4e36d5e62103348f4c05179ede27802fdd87a9 "$acceptance_tools/d2-v0.9.0-linux-amd64.tar.gz" > "$acceptance_tools/d2.sha256"
sha256sum --check "$acceptance_tools/d2.sha256"
tar -xzf "$acceptance_tools/d2-v0.9.0-linux-amd64.tar.gz" -C "$acceptance_tools"
cp /home/hapticslab/projects/MarpAgent/.cache/backlog-20261030/layout/.cache/layout-inputs/NotoSansJP.ttf "$acceptance_tools/NotoSansJP-variable.ttf"
printf '%s  %s\n' c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f "$acceptance_tools/NotoSansJP-variable.ttf" > "$acceptance_tools/font-source.sha256"
sha256sum --check "$acceptance_tools/font-source.sha256"
curl --fail --location --retry 3 https://github.com/astral-sh/uv/releases/download/0.13.1/uv-x86_64-unknown-linux-gnu.tar.gz -o "$acceptance_tools/uv-0.13.1.tar.gz"
curl --fail --location --retry 3 https://github.com/astral-sh/uv/releases/download/0.13.1/uv-x86_64-unknown-linux-gnu.tar.gz.sha256 -o "$acceptance_tools/uv-0.13.1.upstream.sha256"
node - "$acceptance_tools" <<'JS'
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const dir = process.argv[2];
const expected = fs.readFileSync(path.join(dir, 'uv-0.13.1.upstream.sha256'), 'utf8').trim().split(/\s+/)[0];
const actual = createHash('sha256').update(fs.readFileSync(path.join(dir, 'uv-0.13.1.tar.gz'))).digest('hex');
if (!/^[a-f0-9]{64}$/.test(expected) || actual !== expected) throw new Error('uv archive checksum mismatch');
console.log(`uv 0.13.1 archive SHA-256 verified: ${actual}`);
JS
mkdir -p "$acceptance_tools/uv-0.13.1"
tar -xzf "$acceptance_tools/uv-0.13.1.tar.gz" --strip-components=1 -C "$acceptance_tools/uv-0.13.1"
"$acceptance_tools/uv-0.13.1/uv" --version
"$acceptance_tools/uv-0.13.1/uv" run --no-project --with fonttools==4.60.1 python -m fontTools.varLib.instancer "$acceptance_tools/NotoSansJP-variable.ttf" wght=400 --output "$acceptance_tools/NotoSansJP-Regular.ttf"
"$acceptance_tools/uv-0.13.1/uv" run --no-project --with fonttools==4.60.1 python -c 'import fontTools; print("fonttools", fontTools.__version__)'
"$acceptance_tools/d2-v0.9.0/bin/d2" --version
sha256sum "$acceptance_tools/NotoSansJP-Regular.ttf" "$acceptance_tools/d2-v0.9.0/bin/d2" "$acceptance_tools/uv-0.13.1/uv"
