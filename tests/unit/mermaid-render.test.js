const test = require('node:test')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const path = require('node:path')

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
