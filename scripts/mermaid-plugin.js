// Marp plugin to render ```mermaid``` fence blocks as SVG diagrams.
// Uses beautiful-mermaid for DOM-free SVG rendering (works inside Marp's
// foreignObject context where standard mermaid.js misdetects font metrics).
//
// Rendered SVGs are cached on disk under node_modules/.cache/marpagent-mermaid/
// so unchanged diagrams skip the render subprocess, within one process and
// across processes. The cache key covers the diagram source, a hash of
// src/mermaid-render.js, and the beautiful-mermaid, mathjax, and entities
// versions. MARP_AGENT_MERMAID_CACHE=0 disables the cache;
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
const RENDER_MAX_BUFFER = 32 * 1024 * 1024
// A Mermaid fence that rendered as its source instead of a diagram carries
// these attributes so the browser audit (src/visual-overflow.js) can report it.
const RENDER_ERROR_ATTRIBUTE = 'data-marpagent-render-error'
const RENDER_MESSAGE_ATTRIBUTE = 'data-marpagent-render-message'
const RENDER_MESSAGE_MAX_LENGTH = 200
const DEFAULT_RENDER_MESSAGE = 'Mermaid could not parse or lay out this diagram.'
// Token meta key carrying the subprocess error to the native fallback.
const FAILURE_META_KEY = 'marpagentMermaidError'
const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

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
    entities: resolvePackageVersion('entities'),
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
  const entries = []
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name)
    const temporary = /\.svg\.([1-9]\d*)\.tmp$/.exec(name)
    if (temporary) {
      // A crashed writer leaves its PID in the name. Never remove files
      // belonging to a concurrent live writer or one we cannot inspect.
      try {
        process.kill(Number(temporary[1]), 0)
      } catch (error) {
        if (error.code === 'ESRCH') fs.rmSync(file, { force: true })
      }
      continue
    }
    if (!name.endsWith('.svg')) continue
    try {
      const stat = fs.statSync(file)
      if (stat.isFile()) entries.push({ file, mtimeMs: stat.mtimeMs })
    } catch {
      // Another process may have just evicted the same entry.
    }
  }

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
  const tmp = `${cacheFilePath(dir, key)}.${process.pid}.tmp`
  try {
    fs.mkdirSync(dir, { recursive: true })
    // Write via a per-process temp file so a concurrent reader never sees a
    // partial SVG.
    fs.writeFileSync(tmp, svg)
    fs.renameSync(tmp, cacheFilePath(dir, key))
  } catch (error) {
    console.warn(`[mermaid] cache-write-failed: ${error.message}`)
    return
  } finally {
    try {
      fs.rmSync(tmp, { force: true })
    } catch {
      // A later prune can remove leftovers after this process exits.
    }
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
      maxBuffer: RENDER_MAX_BUFFER,
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
  try {
    // Clean crash leftovers even when this render hits the cache or fails.
    pruneCache(dir)
  } catch {
    // Cache maintenance must not make rendering fail.
  }
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

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char])
}

// First non-empty line of an error message, whitespace-collapsed and capped.
function summarizeRenderError(message) {
  const line = String(message || '')
    .replace(/^Mermaid subprocess failed:\s*/, '')
    .split(/\r?\n/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .find(Boolean)
  if (!line) return DEFAULT_RENDER_MESSAGE
  return line.length > RENDER_MESSAGE_MAX_LENGTH
    ? `${line.slice(0, RENDER_MESSAGE_MAX_LENGTH - 1)}…`
    : line
}

// Keep the visible source fallback and attach one escaped diagnostic to it.
function markRenderFailure(html, message) {
  const attributes =
    `${RENDER_ERROR_ATTRIBUTE}="mermaid" ` +
    `${RENDER_MESSAGE_ATTRIBUTE}="${escapeHtml(summarizeRenderError(message))}"`
  if (/^<pre\b/.test(html)) {
    return html.replace(/^<pre\b/, () => `<pre ${attributes}`)
  }
  return `<div ${attributes}>${html}</div>`
}

const marpMermaidPlugin = (md) => {
  const fence = md.renderer.rules.fence
  const nativeMermaid = md.renderer.rules.marp_mermaid

  const renderNative = (tokens, idx, options, env, self) => {
    const html = nativeMermaid(tokens, idx, options, env, self)
    // Apply the shared slide/paper sizing contract to Core 5's native SVGs.
    return html.replace(
      /^<p>(<svg\b[\s\S]*<\/svg>)<\/p>\s*$/,
      '<div class="mermaid-diagram">$1</div>',
    )
  }
  const renderFailedSource = (message, tokens, idx, options, env, self) =>
    markRenderFailure(fence(tokens, idx, options, env, self), message)
  // Throws when the subprocess fails; the caller chooses the fallback.
  const renderSubprocess = (token) => {
    try {
      const svg = renderMermaidSync(token.content.trim())
      return `<div class="mermaid-diagram">${svg}</div>`
    } catch (err) {
      console.warn(`[mermaid] render-failed: ${err.message}`)
      throw err
    }
  }

  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    // Core 5's native renderer falls back to the fence renderer once it has
    // failed. Show the source with a diagnostic instead of retrying.
    if (token.type === 'marp_mermaid') {
      const message = token.meta && token.meta[FAILURE_META_KEY]
      return renderFailedSource(message, tokens, idx, options, env, self)
    }
    if (token.info.trim() === 'mermaid') {
      try {
        return renderSubprocess(token)
      } catch (err) {
        return renderFailedSource(err.message, tokens, idx, options, env, self)
      }
    }
    return fence(tokens, idx, options, env, self)
  }

  // Core 5 rewrites Mermaid fences before rendering. Plain fences try the
  // subprocess first and fall back to the native renderer; attribute-bearing
  // fences (e.g. interactive) retain upstream behavior.
  if (nativeMermaid) {
    md.renderer.rules.marp_mermaid = (tokens, idx, options, env, self) => {
      const token = tokens[idx]
      if (token.info.trim() === 'mermaid') {
        try {
          return renderSubprocess(token)
        } catch (err) {
          token.meta = { ...token.meta, [FAILURE_META_KEY]: err.message }
        }
      }
      return renderNative(tokens, idx, options, env, self)
    }
  }
}

module.exports = marpMermaidPlugin
// Exported for unit tests.
module.exports.buildCacheKey = buildCacheKey
module.exports.cacheFingerprint = cacheFingerprint
module.exports.pruneCache = pruneCache
