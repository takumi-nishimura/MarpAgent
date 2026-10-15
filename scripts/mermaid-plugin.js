// Marp plugin to render ```mermaid``` fence blocks as SVG diagrams.
// Uses beautiful-mermaid for DOM-free SVG rendering (works inside Marp's
// foreignObject context where standard mermaid.js misdetects font metrics).
//
// Rendered SVGs are cached on disk under node_modules/.cache/marpagent-mermaid/
// so unchanged diagrams skip the render subprocess, within one process and
// across processes. The cache key covers the diagram source, a hash of
// src/mermaid-render.js, and the beautiful-mermaid
// and mathjax versions. MARP_AGENT_MERMAID_CACHE=0 disables the cache;
// MARP_AGENT_MERMAID_CACHE_DIR overrides the cache directory (used by tests).
const childProcess = require('child_process')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { findPackageJSON } = require('node:module')
const { pathToFileURL } = require('node:url')

const RENDER_SCRIPT = path.join(__dirname, '..', 'src', 'mermaid-render.js')
const DEFAULT_CACHE_DIR = path.join(
  __dirname,
  '..',
  'node_modules',
  '.cache',
  'marpagent-mermaid',
)
const CACHE_MAX_ENTRIES = 256
const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

function mermaidCacheEnabled() {
  return process.env.MARP_AGENT_MERMAID_CACHE !== '0'
}

function mermaidCacheDir() {
  return process.env.MARP_AGENT_MERMAID_CACHE_DIR || DEFAULT_CACHE_DIR
}

// Resolve ESM-only dependencies without requiring a CJS export condition.
function resolvePackageVersion(packageName) {
  const file = findPackageJSON(packageName, pathToFileURL(__filename))
  return JSON.parse(fs.readFileSync(file, 'utf8')).version
}

function fileSha256(filePath) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(filePath))
    .digest('hex')
}

function cacheFingerprint() {
  return {
    render: fileSha256(RENDER_SCRIPT),
    beautifulMermaid: resolvePackageVersion('beautiful-mermaid'),
    mathjax: resolvePackageVersion('mathjax'),
  }
}

function buildCacheKey(code, fingerprint = cacheFingerprint()) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({ code, ...fingerprint }))
    .digest('hex')
}

function cacheFilePath(dir, key) {
  return path.join(dir, `${key}.svg`)
}

function readCache(dir, key) {
  const file = cacheFilePath(dir, key)
  let svg
  try {
    svg = fs.readFileSync(file, 'utf8')
  } catch {
    return null
  }

  try {
    // Refresh mtime so eviction tracks last use, not first write.
    const now = new Date()
    fs.utimesSync(file, now, now)
  } catch {
    // Best-effort LRU refresh.
  }
  return svg
}

// Evict entries older than maxAgeMs, then oldest-first beyond maxEntries.
function pruneCache(
  dir,
  { maxEntries = CACHE_MAX_ENTRIES, maxAgeMs = CACHE_MAX_AGE_MS } = {},
) {
  const now = Date.now()
  const entries = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.svg'))
    .map((name) => {
      const file = path.join(dir, name)
      return { file, mtimeMs: fs.statSync(file).mtimeMs }
    })

  const fresh = entries.filter((entry) => now - entry.mtimeMs <= maxAgeMs)
  for (const stale of entries.filter(
    (entry) => now - entry.mtimeMs > maxAgeMs,
  )) {
    fs.rmSync(stale.file, { force: true })
  }

  fresh.sort((a, b) => a.mtimeMs - b.mtimeMs)
  for (const extra of fresh.slice(0, Math.max(0, fresh.length - maxEntries))) {
    fs.rmSync(extra.file, { force: true })
  }
}

function writeCache(dir, key, svg) {
  try {
    fs.mkdirSync(dir, { recursive: true })
    // Write via a per-process temp file so a concurrent reader never sees a
    // partial SVG.
    const tmp = `${cacheFilePath(dir, key)}.${process.pid}.tmp`
    fs.writeFileSync(tmp, svg)
    fs.renameSync(tmp, cacheFilePath(dir, key))
  } catch (error) {
    console.warn(`[mermaid] cache-write-failed: ${error.message}`)
    return
  }

  try {
    pruneCache(dir)
  } catch {
    // Eviction is best-effort; a failed prune must not break rendering.
  }
}

function spawnRender(code) {
  try {
    return childProcess.execFileSync(process.execPath, [RENDER_SCRIPT], {
      input: code,
      encoding: 'utf-8',
      timeout: 30000,
    })
  } catch (error) {
    const detail =
      typeof error.stderr === 'string' && error.stderr.trim().length > 0
        ? error.stderr.trim()
        : error.message
    throw new Error(`Mermaid subprocess failed: ${detail}`)
  }
}

function renderMermaidSync(code) {
  if (!mermaidCacheEnabled()) {
    return spawnRender(code)
  }

  const dir = mermaidCacheDir()
  const key = buildCacheKey(code)
  const cached = readCache(dir, key)
  if (cached !== null) {
    return cached
  }

  // Failures throw before writeCache, so they are never cached.
  const svg = spawnRender(code)
  writeCache(dir, key, svg)
  return svg
}

const marpMermaidPlugin = (md) => {
  const extendRenderer = (fallback) => (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    if (token.info.trim() === 'mermaid') {
      const code = token.content.trim()
      try {
        const svg = renderMermaidSync(code)
        return `<div class="mermaid-diagram">${svg}</div>`
      } catch (err) {
        console.warn(`[mermaid] render-failed: ${err.message}`)
        return fallback(tokens, idx, options, env, self)
      }
    }
    return fallback(tokens, idx, options, env, self)
  }

  md.renderer.rules.fence = extendRenderer(md.renderer.rules.fence)
  // Core 5 rewrites Mermaid fences before rendering. Extend that renderer too;
  // attribute-bearing fences (e.g. interactive) retain upstream behavior.
  if (md.renderer.rules.marp_mermaid) {
    md.renderer.rules.marp_mermaid = extendRenderer(md.renderer.rules.marp_mermaid)
  }
}

module.exports = marpMermaidPlugin
// Exported for unit tests.
module.exports.buildCacheKey = buildCacheKey
module.exports.cacheFingerprint = cacheFingerprint
module.exports.pruneCache = pruneCache
