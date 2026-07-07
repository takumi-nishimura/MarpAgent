const test = require('node:test')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const path = require('node:path')

const { postProcessLineBreaks } = require('../../src/mermaid-render')

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
  const renderScript = path.join(__dirname, '../../src/mermaid-render.js')
  const svg = execFileSync(process.execPath, [renderScript], {
    input: 'flowchart TD\n  A["foo<br/>bar"] --> B[baz]\n',
    encoding: 'utf8',
    timeout: 30000,
  })

  assert.doesNotMatch(svg, /&lt;br/)
  assert.doesNotMatch(svg, /&quot;/)
  assert.match(svg, /<tspan x="[^"]+" dy="-0\.25em">foo<\/tspan>/)
  assert.match(svg, /<tspan x="[^"]+" dy="1\.2em">bar<\/tspan>/)
})
