// Subprocess script: reads Mermaid source from stdin, renders SVG,
// post-processes $...$ / $$...$$ math via MathJax, outputs final SVG.

const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
const {
  applyBeautifulMermaidPatch,
  assertSupportedBeautifulMermaidVersion,
} = require('./mermaid-patch')

// Patch beautiful-mermaid in-process to support CJK character width estimation.
// Replaces the patch-package approach: transforms the source before it enters
// the require cache so no on-disk modification is needed.
function patchBeautifulMermaid() {
  const filepath = require.resolve('beautiful-mermaid')
  if (require.cache[filepath]) return

  const packageJsonPath = resolvePackageJsonPath(filepath)
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  assertSupportedBeautifulMermaidVersion(packageJson.version)

  const source = fs.readFileSync(filepath, 'utf8')
  const patched = applyBeautifulMermaidPatch(source)

  if (!patched.patched) {
    return
  }

  const compiled = new Module(filepath, module)
  compiled.filename = filepath
  compiled.paths = Module._nodeModulePaths(path.dirname(filepath))
  compiled._compile(patched.source, filepath)
  require.cache[filepath] = compiled
}

function resolvePackageJsonPath(entryPath) {
  let dir = path.dirname(entryPath)
  const root = path.parse(dir).root

  while (dir !== root) {
    const candidate = path.join(dir, 'package.json')
    if (fs.existsSync(candidate)) {
      const parsed = JSON.parse(fs.readFileSync(candidate, 'utf8'))
      if (parsed.name === 'beautiful-mermaid') {
        return candidate
      }
    }
    dir = path.dirname(dir)
  }

  throw new Error('Could not resolve beautiful-mermaid package.json from module entry path.')
}

function parseAttr(attrStr, name) {
  const m = attrStr.match(new RegExp(`${name}="([^"]*)"` ))
  return m ? m[1] : null
}

// Estimate text width with CJK-aware character widths.
function estimateTextWidth(text, fontSize) {
  let len = 0
  for (const ch of text) {
    const cp = ch.codePointAt(0)
    if (
      (cp >= 0x2e80 && cp <= 0x9fff) ||
      (cp >= 0xf900 && cp <= 0xfaff) ||
      (cp >= 0xfe30 && cp <= 0xffef) ||
      (cp >= 0x20000 && cp <= 0x2fa1f)
    )
      len += 1.0
    else len += 0.6
  }
  return len * fontSize
}

async function postProcessMath(svg) {
  // Quick check — skip MathJax init if no math delimiters present
  if (!svg.includes('$')) return svg

  // Find all <text> elements whose content contains $...$
  const TEXT_EL_RE = /<text([^>]*)>([^<]+)<\/text>/g
  const hits = []
  let m
  while ((m = TEXT_EL_RE.exec(svg)) !== null) {
    if (m[2].includes('$')) {
      hits.push({ full: m[0], attrs: m[1], rawContent: m[2] })
    }
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

  // Helper: render a TeX string to MathJax SVG components.
  // Uses tex2svgPromise to support fonts loaded on demand (e.g. \mathcal).
  async function renderTex(tex) {
    const node = await MathJax.tex2svgPromise(tex, { display: false })
    const mjSvg = adaptor.innerHTML(node)
    const vbMatch = mjSvg.match(/viewBox="([^"]*)"/)
    const wMatch = mjSvg.match(/width="([^"]*)"/)
    const hMatch = mjSvg.match(/height="([^"]*)"/)
    if (!vbMatch) return null
    const vb = vbMatch[1].split(' ').map(Number)
    const wEx = parseFloat(wMatch[1])
    const hEx = parseFloat(hMatch[1])
    const defsMatch = mjSvg.match(/<defs>([\s\S]*?)<\/defs>/)
    if (defsMatch) allDefs.push(defsMatch[1])
    const innerG = mjSvg
      .replace(/<svg[^>]*>/, '')
      .replace(/<\/svg>/, '')
      .replace(/<defs>[\s\S]*?<\/defs>/, '')
      .trim()
    return { vb, wEx, hEx, innerG }
  }

  for (const hit of hits) {
    // Strip optional &quot; wrappers added by Mermaid for ["..."] labels
    let content = hit.rawContent
    if (content.startsWith('&quot;') && content.endsWith('&quot;')) {
      content = content.slice(6, -6)
    }

    // Parse attributes.
    // dy may carry a unit (e.g. "0.35em"); preserve the raw string for <text>
    // output and convert to px for math positioning.
    const x = parseFloat(parseAttr(hit.attrs, 'x') || '0')
    const y = parseFloat(parseAttr(hit.attrs, 'y') || '0')
    const dyRaw = parseAttr(hit.attrs, 'dy') || '0'
    const fontSize = parseFloat(parseAttr(hit.attrs, 'font-size') || '16')
    const dyPx = dyRaw.endsWith('em')
      ? parseFloat(dyRaw) * fontSize
      : parseFloat(dyRaw)
    const anchor = parseAttr(hit.attrs, 'text-anchor') || 'start'
    const fill = parseAttr(hit.attrs, 'fill') || 'currentColor'

    // Split content into text and math segments
    const segments = []
    let lastIdx = 0
    const DOLLAR_RE = /\$(\$?)(.*?)\$\1/g
    let dm
    while ((dm = DOLLAR_RE.exec(content)) !== null) {
      if (dm.index > lastIdx) {
        segments.push({ type: 'text', value: content.slice(lastIdx, dm.index) })
      }
      segments.push({ type: 'math', tex: dm[2] })
      lastIdx = dm.index + dm[0].length
    }
    if (lastIdx < content.length) {
      segments.push({ type: 'text', value: content.slice(lastIdx) })
    }
    if (!segments.some((s) => s.type === 'math')) continue

    // 1ex ≈ 0.5em; scale MathJax ex-based dims to px at the target font-size
    const exToPx = fontSize * 0.5

    // Pure-math fast path: entire content is a single $...$
    if (segments.length === 1 && segments[0].type === 'math') {
      const info = await renderTex(segments[0].tex)
      if (!info) continue
      const pxW = info.wEx * exToPx
      const scaleX = pxW / info.vb[2]
      const scaleY = (info.hEx * exToPx) / info.vb[3]
      let dx = 0
      if (anchor === 'middle') dx = -pxW / 2
      else if (anchor === 'end') dx = -pxW
      const cy = y - (info.vb[1] + info.vb[3] / 2) * scaleY
      const replacement =
        `<g transform="translate(${x + dx},${cy}) scale(${scaleX},${scaleY})"` +
        ` fill="${fill}">${info.innerG}</g>`
      svg = svg.replace(hit.full, replacement)
      continue
    }

    // Inline math: compute widths for each segment
    const rendered = []
    let totalWidth = 0
    for (const seg of segments) {
      if (seg.type === 'text') {
        const w = estimateTextWidth(seg.value, fontSize)
        rendered.push({ type: 'text', value: seg.value, width: w })
        totalWidth += w
      } else {
        const info = await renderTex(seg.tex)
        if (!info) {
          // Fallback: keep raw $...$ as plain text
          const fallback = '$' + seg.tex + '$'
          const w = estimateTextWidth(fallback, fontSize)
          rendered.push({ type: 'text', value: fallback, width: w })
          totalWidth += w
          continue
        }
        const pxW = info.wEx * exToPx
        rendered.push({
          type: 'math',
          width: pxW,
          vb: info.vb,
          scaleX: pxW / info.vb[2],
          scaleY: (info.hEx * exToPx) / info.vb[3],
          innerG: info.innerG,
        })
        totalWidth += pxW
      }
    }

    // Anchor offset so the combined group is positioned correctly
    let anchorOff = 0
    if (anchor === 'middle') anchorOff = -totalWidth / 2
    else if (anchor === 'end') anchorOff = -totalWidth

    // Build replacement SVG group with positioned text + math
    const fontFamily = parseAttr(hit.attrs, 'font-family')
    const domBaseline = parseAttr(hit.attrs, 'dominant-baseline')
    let commonAttrs = ` y="${y}"`
    if (dyPx) commonAttrs += ` dy="${dyRaw}"`
    commonAttrs += ` font-size="${fontSize}"`
    if (fontFamily) commonAttrs += ` font-family="${fontFamily}"`
    if (domBaseline) commonAttrs += ` dominant-baseline="${domBaseline}"`
    commonAttrs += ` fill="${fill}"`

    let parts = ''
    let curX = x + anchorOff
    for (const seg of rendered) {
      if (seg.type === 'text') {
        parts += `<text x="${curX}"${commonAttrs} text-anchor="start">${seg.value}</text>`
      } else {
        // Align math baseline (MathJax y=0) with text baseline (y + dyPx).
        // The inner scale(1,-1) flips the y-axis but leaves y=0 at the origin,
        // so translate y = text baseline gives correct alignment.
        const ty = y + dyPx
        parts += `<g transform="translate(${curX},${ty}) scale(${seg.scaleX},${seg.scaleY})" fill="${fill}">${seg.innerG}</g>`
      }
      curX += seg.width
    }
    svg = svg.replace(hit.full, `<g>${parts}</g>`)
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
  patchBeautifulMermaid()
  const { renderMermaid, THEMES } = require('beautiful-mermaid')

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
