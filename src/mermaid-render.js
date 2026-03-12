// Subprocess script: reads Mermaid source from stdin, renders SVG,
// post-processes $...$ / $$...$$ math via MathJax, outputs final SVG.

// Patch beautiful-mermaid in-process to support CJK character width estimation.
// Replaces the patch-package approach: transforms the source before it enters
// the require cache so no on-disk modification is needed.
;(function patchBeautifulMermaid() {
  const filepath = require.resolve('beautiful-mermaid')
  if (require.cache[filepath]) return // already loaded

  let src = require('node:fs').readFileSync(filepath, 'utf8')
  if (src.includes('_effectiveLength')) return // already patched or fix landed upstream

  const CJK_FN =
    'function _effectiveLength(text) {\n' +
    '  let len = 0\n' +
    '  for (const ch of text) {\n' +
    '    const cp = ch.codePointAt(0)\n' +
    '    if ((cp >= 0x2E80 && cp <= 0x9FFF) || (cp >= 0xF900 && cp <= 0xFAFF) ||\n' +
    '        (cp >= 0xFE30 && cp <= 0xFFEF) || (cp >= 0x20000 && cp <= 0x2FA1F))\n' +
    '      len += 1.8\n' +
    '    else\n' +
    '      len += 1\n' +
    '  }\n' +
    '  return len\n' +
    '}\n'

  src = src
    .replace('function estimateTextWidth(', CJK_FN + 'function estimateTextWidth(')
    .replace(
      'return text.length * fontSize * widthRatio;',
      'return _effectiveLength(text) * fontSize * widthRatio;',
    )
    .replace(
      'return text.length * fontSize * 0.6;',
      'return _effectiveLength(text) * fontSize * 0.6;',
    )

  const Module = require('node:module')
  const m = new Module(filepath, module)
  m.filename = filepath
  m.paths = Module._nodeModulePaths(require('node:path').dirname(filepath))
  m._compile(src, filepath)
  require.cache[filepath] = m
})()

const { renderMermaid, THEMES } = require('beautiful-mermaid')

// Match <text ...>...$...$...</text> or $$...$$ with optional &quot; wrappers
const MATH_TEXT_RE =
  /<text([^>]*)>(?:&quot;)?\$(\$?)(.*?)\$\2(?:&quot;)?<\/text>/g

function parseAttr(attrStr, name) {
  const m = attrStr.match(new RegExp(`${name}="([^"]*)"` ))
  return m ? m[1] : null
}

async function postProcessMath(svg) {
  // Quick check — skip MathJax init if no math delimiters present
  if (!svg.includes('$')) return svg

  const hits = []
  let m
  const re = new RegExp(MATH_TEXT_RE.source, MATH_TEXT_RE.flags)
  while ((m = re.exec(svg)) !== null) {
    hits.push({ full: m[0], attrs: m[1], tex: m[3] })
  }
  if (hits.length === 0) return svg

  // Lazy-init MathJax (disable inline linebreaks to get single SVG output)
  const { init } = require('mathjax')
  const MathJax = await init({
    loader: { load: ['input/tex', 'output/svg'] },
    svg: { linebreaks: { inline: false } },
  })
  const adaptor = MathJax.startup.adaptor

  // Collect all MathJax <defs> to merge into the root SVG
  const allDefs = []

  for (const hit of hits) {
    const node = MathJax.tex2svg(hit.tex, { display: false })
    const mjSvg = adaptor.innerHTML(node)

    // Extract viewBox, width/height (in ex units) from the inner <svg>
    const vbMatch = mjSvg.match(/viewBox="([^"]*)"/)
    const wMatch = mjSvg.match(/width="([^"]*)"/)
    const hMatch = mjSvg.match(/height="([^"]*)"/)
    if (!vbMatch) continue

    const vb = vbMatch[1].split(' ').map(Number) // [minX, minY, w, h]
    const wEx = parseFloat(wMatch[1]) // width in ex
    const hEx = parseFloat(hMatch[1]) // height in ex

    // Original <text> attributes
    const x = parseFloat(parseAttr(hit.attrs, 'x') || '0')
    const y = parseFloat(parseAttr(hit.attrs, 'y') || '0')
    const dy = parseFloat(parseAttr(hit.attrs, 'dy') || '0')
    const fontSize = parseFloat(parseAttr(hit.attrs, 'font-size') || '16')
    const anchor = parseAttr(hit.attrs, 'text-anchor') || 'start'
    const fill = parseAttr(hit.attrs, 'fill') || 'currentColor'

    // 1ex ≈ 0.5em; scale MathJax ex-based dims to px at the target font-size
    const exToPx = fontSize * 0.5
    const pxW = wEx * exToPx
    const pxH = hEx * exToPx

    // Scale factor from viewBox units to px
    const scaleX = pxW / vb[2]
    const scaleY = pxH / vb[3]

    // Horizontal offset based on text-anchor
    let dx = 0
    if (anchor === 'middle') dx = -pxW / 2
    else if (anchor === 'end') dx = -pxW

    // Vertical offset: centre the math bounding box at the node centre (y).
    // Note: dy is a text-specific baseline shift for centering glyphs and does
    // not apply to the pre-rendered MathJax SVG bounding box.
    const cy = y - (vb[1] + vb[3] / 2) * scaleY

    // Extract <defs> from MathJax SVG
    const defsMatch = mjSvg.match(/<defs>([\s\S]*?)<\/defs>/)
    if (defsMatch) allDefs.push(defsMatch[1])

    // Extract the <g> content (everything except <defs> and outer <svg> wrapper)
    const innerG = mjSvg
      .replace(/<svg[^>]*>/, '')
      .replace(/<\/svg>/, '')
      .replace(/<defs>[\s\S]*?<\/defs>/, '')
      .trim()

    const replacement =
      `<g transform="translate(${x + dx},${cy}) scale(${scaleX},${scaleY})"` +
      ` fill="${fill}">${innerG}</g>`

    svg = svg.replace(hit.full, replacement)
  }

  // Merge collected MathJax <defs> into the root SVG <defs>
  if (allDefs.length > 0) {
    const mergedDefs = allDefs.join('\n')
    if (svg.includes('</defs>')) {
      svg = svg.replace('</defs>', mergedDefs + '\n</defs>')
    } else {
      // Insert <defs> right after the opening <svg ...>
      svg = svg.replace(/(<svg[^>]*>)/, `$1\n<defs>${mergedDefs}</defs>`)
    }
  }

  return svg
}

async function main() {
  let input = ''
  for await (const chunk of process.stdin) input += chunk
  const svg = await renderMermaid(input, {
    ...THEMES['github-light'],
    transparent: true,
  })
  const result = await postProcessMath(svg)
  process.stdout.write(result)
}

main().catch((e) => {
  process.stderr.write(e.message)
  process.exit(1)
})
