// Marp plugin: GitHub-flavored alert syntax for callouts.
//
//   > [!NOTE]
//   > Body text.
//
// becomes
//
//   <div class="note">
//   <p>Body text.</p>
//   </div>
//
// The plugin is type-agnostic: any uppercase identifier between `[!` and `]`
// is lowercased and emitted as the div's class. The five GFM types
// (NOTE, TIP, IMPORTANT, WARNING, CAUTION) are already styled in
// themes/src/_shared/_callouts.css; additional types can be styled by
// extending that file.

const ALERT_LINE_RE = /^\[!([A-Z][A-Z0-9_-]*)\]\s*$/

function findMatchingBlockquoteClose(tokens, openIdx) {
  let depth = 0
  for (let i = openIdx; i < tokens.length; i += 1) {
    const t = tokens[i]
    if (t.type === 'blockquote_open') {
      depth += 1
    } else if (t.type === 'blockquote_close') {
      depth -= 1
      if (depth === 0) return i
    }
  }
  return -1
}

const marpGithubAlertsPlugin = (md) => {
  md.core.ruler.after('block', 'github_alerts', (state) => {
    const tokens = state.tokens
    for (let i = 0; i < tokens.length; i += 1) {
      const open = tokens[i]
      if (open.type !== 'blockquote_open') continue

      const pOpen = tokens[i + 1]
      const pInline = tokens[i + 2]
      const pClose = tokens[i + 3]
      if (
        !pOpen ||
        pOpen.type !== 'paragraph_open' ||
        !pInline ||
        pInline.type !== 'inline' ||
        !pClose ||
        pClose.type !== 'paragraph_close'
      ) {
        continue
      }

      const lines = pInline.content.split('\n')
      const match = ALERT_LINE_RE.exec(lines[0])
      if (!match) continue

      const closeIdx = findMatchingBlockquoteClose(tokens, i)
      if (closeIdx < 0) continue

      const type = match[1].toLowerCase()
      const restContent = lines.slice(1).join('\n').replace(/^\n+/, '')

      open.type = 'github_alert_open'
      open.tag = 'div'
      open.attrSet('class', type)

      const close = tokens[closeIdx]
      close.type = 'github_alert_close'
      close.tag = 'div'

      if (restContent === '') {
        tokens.splice(i + 1, 3)
      } else {
        pInline.content = restContent
        if (Array.isArray(pInline.children)) pInline.children.length = 0
      }
    }
  })

  md.renderer.rules.github_alert_open = (tokens, idx, _options, _env, self) =>
    `<div${self.renderAttrs(tokens[idx])}>\n`
  md.renderer.rules.github_alert_close = () => '</div>\n'
}

module.exports = marpGithubAlertsPlugin
