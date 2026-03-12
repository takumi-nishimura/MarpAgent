const fs = require('node:fs')
const path = require('node:path')
const marpHideSlidesPlugin = require('./scripts/hide-slides-plugin')
const marpMermaidPlugin = require('./scripts/mermaid-plugin')

const cursorScript = fs.readFileSync(
  path.join(__dirname, 'scripts/presenter-cursor.js'),
  'utf8',
)

// Collect only the compiled theme CSS files at themes/*.css (not subdirectories).
const themeSet = fs
  .readdirSync(path.join(__dirname, 'themes'))
  .filter((f) => f.endsWith('.css'))
  .map((f) => `./themes/${f}`)

module.exports = {
  allowLocalFiles: true,
  themeSet,
  html: true,
  engine: ({ marp }) => {
    const base = marp.use(marpHideSlidesPlugin).use(marpMermaidPlugin)
    const _render = base.render.bind(base)
    base.render = (markdown, env) => {
      const result = _render(markdown, env)
      return { ...result, html: result.html + `\n<script>${cursorScript}</script>` }
    }
    return base
  },
}
