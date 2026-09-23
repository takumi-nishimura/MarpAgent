const test = require('node:test')
const assert = require('node:assert/strict')
const childProcess = require('node:child_process')
const { execFileSync } = childProcess
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const MarkdownIt = require('markdown-it')

const marpMermaidPlugin = require('../../scripts/mermaid-plugin')
const { postProcessLineBreaks } = require('../../src/mermaid-render')

function renderMermaid(input) {
  const renderScript = path.join(__dirname, '../../src/mermaid-render.js')
  return execFileSync(process.execPath, [renderScript], {
    input,
    encoding: 'utf8',
    timeout: 30000,
  })
}

function firstNodeRect(svg) {
  const rects = [...svg.matchAll(/<rect\b([^>]*)\/>/g)].map((match) => {
    const attrs = match[1]
    return {
      x: Number.parseFloat(attr(attrs, 'x')),
      y: Number.parseFloat(attr(attrs, 'y')),
      width: Number.parseFloat(attr(attrs, 'width')),
      height: Number.parseFloat(attr(attrs, 'height')),
    }
  })
  return rects.sort((a, b) => a.y - b.y || a.x - b.x)[0]
}

function attr(attrs, name) {
  const match = attrs.match(new RegExp(`${name}="([^"]*)"`))
  assert.ok(match, `missing ${name} in ${attrs}`)
  return match[1]
}

test('postProcessLineBreaks converts escaped br labels into tspans', () => {
  const svg =
    '<svg><text x="24" y="16" text-anchor="middle" dy="0.35em" font-size="13">&quot;foo&lt;br/&gt;bar&quot;</text></svg>'

  const result = postProcessLineBreaks(svg)

  assert.doesNotMatch(result, /&lt;br/)
  assert.doesNotMatch(result, /&quot;/)
  assert.match(result, /<tspan x="24" dy="-0\.25em">foo<\/tspan>/)
  assert.match(result, /<tspan x="24" dy="1\.2em">bar<\/tspan>/)
})

test('postProcessLineBreaks converts literal newline markers into tspans', () => {
  const svg =
    '<svg><text x="24" y="16" text-anchor="middle" dy="0.35em" font-size="13">&quot;foo\\nbar&quot;</text></svg>'

  const result = postProcessLineBreaks(svg)

  assert.doesNotMatch(result, /\\n/)
  assert.match(result, /<tspan x="24" dy="-0\.25em">foo<\/tspan>/)
  assert.match(result, /<tspan x="24" dy="1\.2em">bar<\/tspan>/)
})

test('postProcessLineBreaks strips Mermaid quote wrappers from simple labels', () => {
  const svg =
    '<svg><text x="24" y="16" font-size="13">&quot;foo&quot;</text></svg>'

  const result = postProcessLineBreaks(svg)

  assert.equal(
    result,
    '<svg><text x="24" y="16" font-size="13">foo</text></svg>',
  )
})

test('postProcessLineBreaks leaves math labels for MathJax processing', () => {
  const svg =
    '<svg><text x="24" y="16" font-size="13">$x&lt;br/&gt;y$</text></svg>'

  const result = postProcessLineBreaks(svg)

  assert.equal(result, svg)
})

test('mermaid render emits multiline labels as tspans', () => {
  const svg = renderMermaid('flowchart TD\n  A["foo<br/>bar"] --> B[baz]\n')

  assert.doesNotMatch(svg, /&lt;br/)
  assert.doesNotMatch(svg, /&quot;/)
  assert.match(svg, /<tspan x="[^"]+" dy="-0\.25em">foo<\/tspan>/)
  assert.match(svg, /<tspan x="[^"]+" dy="1\.2em">bar<\/tspan>/)
})

test('mermaid render sizes explicit multiline node labels before layout', () => {
  const noBreak = renderMermaid(
    'flowchart TD\n  A["リアルタイム協調エージェント"] --> B[Output]\n',
  )
  const htmlBreak = renderMermaid(
    'flowchart TD\n  A["リアルタイム<br/>協調エージェント"] --> B[Output]\n',
  )
  const escapedNewline = renderMermaid(
    'flowchart TD\n  A["リアルタイム\\n協調エージェント"] --> B[Output]\n',
  )

  const noBreakRect = firstNodeRect(noBreak)
  const htmlBreakRect = firstNodeRect(htmlBreak)
  const escapedNewlineRect = firstNodeRect(escapedNewline)

  assert.ok(
    htmlBreakRect.height > noBreakRect.height,
    `expected <br/> height ${htmlBreakRect.height} to exceed ${noBreakRect.height}`,
  )
  assert.ok(
    escapedNewlineRect.height > noBreakRect.height,
    `expected \\n height ${escapedNewlineRect.height} to exceed ${noBreakRect.height}`,
  )
  assert.ok(
    htmlBreakRect.width < noBreakRect.width,
    `expected <br/> width ${htmlBreakRect.width} to be less than ${noBreakRect.width}`,
  )
  assert.ok(
    escapedNewlineRect.width < noBreakRect.width,
    `expected \\n width ${escapedNewlineRect.width} to be less than ${noBreakRect.width}`,
  )
})

function useTempCacheDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'marpagent-mermaid-'))
  process.env.MARP_AGENT_MERMAID_CACHE_DIR = dir
  t.after(() => {
    delete process.env.MARP_AGENT_MERMAID_CACHE_DIR
    fs.rmSync(dir, { recursive: true, force: true })
  })
  return dir
}

function stubExecFileSync(t, impl) {
  const original = childProcess.execFileSync
  let calls = 0
  childProcess.execFileSync = (...args) => {
    calls += 1
    return impl(...args)
  }
  t.after(() => {
    childProcess.execFileSync = original
  })
  return () => calls
}

function renderFence(code, plugin = marpMermaidPlugin) {
  const md = new MarkdownIt()
  md.use(plugin)
  return md.render(`\`\`\`mermaid\n${code}\n\`\`\``)
}

test('mermaid cache reuses the rendered SVG without a second subprocess', (t) => {
  useTempCacheDir(t)
  const calls = stubExecFileSync(t, () => '<svg><text>ok</text></svg>')
  const code = 'flowchart TD\n  A --> B\n'

  const first = renderFence(code)
  const second = renderFence(code)

  assert.equal(calls(), 1)
  assert.match(first, /<div class="mermaid-diagram"><svg>/)
  assert.equal(second, first)
})

test('mermaid cache persists across plugin module instances', (t) => {
  useTempCacheDir(t)
  const calls = stubExecFileSync(t, () => '<svg><text>ok</text></svg>')
  const code = 'flowchart TD\n  A --> B\n'

  renderFence(code)

  // A fresh module instance approximates a separate Marp process: no
  // in-process state survives, so a hit proves the cache lives on disk.
  const pluginPath = require.resolve('../../scripts/mermaid-plugin')
  delete require.cache[pluginPath]
  const freshPlugin = require(pluginPath)
  const html = renderFence(code, freshPlugin)

  assert.equal(calls(), 1)
  assert.match(html, /<div class="mermaid-diagram"><svg>/)
})

test('mermaid cache does not store failed renders', (t) => {
  useTempCacheDir(t)
  let shouldFail = true
  const calls = stubExecFileSync(t, () => {
    if (shouldFail) {
      shouldFail = false
      const error = new Error('boom')
      error.stderr = 'parse error'
      throw error
    }
    return '<svg><text>ok</text></svg>'
  })
  const code = 'flowchart TD\n  A --> B\n'

  const failed = renderFence(code)
  assert.match(failed, /language-mermaid/)

  const retried = renderFence(code)
  assert.match(retried, /<div class="mermaid-diagram"><svg>/)

  const cached = renderFence(code)
  assert.equal(calls(), 2)
  assert.equal(cached, retried)
})

test('MARP_AGENT_MERMAID_CACHE=0 disables the mermaid cache', (t) => {
  const dir = useTempCacheDir(t)
  process.env.MARP_AGENT_MERMAID_CACHE = '0'
  t.after(() => {
    delete process.env.MARP_AGENT_MERMAID_CACHE
  })
  const calls = stubExecFileSync(t, () => '<svg><text>ok</text></svg>')
  const code = 'flowchart TD\n  A --> B\n'

  renderFence(code)
  renderFence(code)

  assert.equal(calls(), 2)
  assert.deepEqual(fs.readdirSync(dir), [])
})

test('mermaid cache key covers source, renderer files, and package versions', () => {
  const fingerprint = {
    render: 'render-hash',
    patch: 'patch-hash',
    beautifulMermaid: '0.1.3',
    mathjax: '4.1.1',
  }
  const code = 'flowchart TD\n  A --> B\n'
  const key = marpMermaidPlugin.buildCacheKey(code, fingerprint)

  assert.match(key, /^[0-9a-f]{64}$/)
  assert.notEqual(marpMermaidPlugin.buildCacheKey(`${code} `, fingerprint), key)
  for (const field of Object.keys(fingerprint)) {
    const changed = { ...fingerprint, [field]: 'changed' }
    assert.notEqual(marpMermaidPlugin.buildCacheKey(code, changed), key)
  }
})

test('mermaid cache fingerprint resolves renderer hashes and dependency versions', () => {
  const fingerprint = marpMermaidPlugin.cacheFingerprint()
  const beautifulMermaid = require('../../node_modules/beautiful-mermaid/package.json')
  const mathjax = require('../../node_modules/mathjax/package.json')

  assert.match(fingerprint.render, /^[0-9a-f]{64}$/)
  assert.match(fingerprint.patch, /^[0-9a-f]{64}$/)
  assert.equal(fingerprint.beautifulMermaid, beautifulMermaid.version)
  assert.equal(fingerprint.mathjax, mathjax.version)
})

test('pruneCache evicts by age first, then oldest entries beyond the limit', (t) => {
  const dir = useTempCacheDir(t)
  const now = Date.now()
  const files = []
  for (let i = 0; i < 4; i += 1) {
    const file = path.join(dir, `entry-${i}.svg`)
    fs.writeFileSync(file, '<svg/>')
    const mtime = new Date(now - (i + 1) * 1000)
    fs.utimesSync(file, mtime, mtime)
    files.push(file)
  }
  const stale = path.join(dir, 'stale.svg')
  fs.writeFileSync(stale, '<svg/>')
  const staleTime = new Date(now - 60 * 1000)
  fs.utimesSync(stale, staleTime, staleTime)

  marpMermaidPlugin.pruneCache(dir, { maxEntries: 2, maxAgeMs: 30 * 1000 })

  const remaining = fs.readdirSync(dir).sort()
  assert.deepEqual(remaining, ['entry-0.svg', 'entry-1.svg'])
})
