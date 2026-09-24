// Marp plugin to hide slides with the `<!-- hide: true -->` directive.
// https://github.com/orgs/marp-team/discussions/162#discussioncomment-11599733
//
// Hiding applies only to the slide whose own directive comment sets it, in
// either the local form (`hide: true`) or the spot form (`_hide: true`).
// Marpit local directives inherit to every following slide, so the directive
// contributes nothing to the inherited directive state; the slide's own
// comments decide instead. Hidden slides are removed after directives are
// applied, so the following slides keep the inherited directives (class,
// header, paginate, ...) they would have without hiding. A hidden slide does
// not take a page number or count toward the page total.

const HIDE_DIRECTIVE_KEYS = ['hide', '_hide']

// Return true/false when the parsed comment sets the hide directive, or
// undefined when it does not mention it.
function hideValueOf(token) {
  if (token.type !== 'marpit_comment') return undefined
  const parsed = token.meta?.marpitParsedDirectives
  if (!parsed) return undefined

  let value
  for (const key of HIDE_DIRECTIVE_KEYS) {
    if (Object.hasOwn(parsed, key)) value = parsed[key] === 'true'
  }
  return value
}

// Scan a slide's block and inline comments in source order; the last hide
// directive on the slide wins.
function slideHidesItself(tokens, startIdx, endIdx) {
  let hidden = false

  for (let i = startIdx; i < endIdx; i += 1) {
    const token = tokens[i]
    const candidates = token.type === 'inline' ? token.children || [] : [token]

    for (const candidate of candidates) {
      const value = hideValueOf(candidate)
      if (value !== undefined) hidden = value
    }
  }
  return hidden
}

const marpHideSlidesPlugin = (md) => {
  // Register the directive so Marpit recognizes `hide` and `_hide` comments,
  // but keep it out of the inherited directive state.
  md.marpit.customDirectives.local.hide = () => ({})

  // Before pagination is computed, give each hidden slide `paginate: skip`
  // so it neither takes a page number nor counts toward the page total.
  // Only the hidden slide's own directives change; later slides keep their
  // inherited values and Marpit's skip/hold semantics.
  md.core.ruler.before(
    'marpit_directives_apply',
    'marpit_hide_slides_pagination',
    (state) => {
      if (state.inlineMode) return

      let slideOpenIdx = -1

      for (let i = 0; i < state.tokens.length; i += 1) {
        const token = state.tokens[i]

        if (token.type === 'marpit_slide_open') {
          slideOpenIdx = i
        } else if (token.type === 'marpit_slide_close' && slideOpenIdx >= 0) {
          if (slideHidesItself(state.tokens, slideOpenIdx, i)) {
            const slideOpen = state.tokens[slideOpenIdx]
            slideOpen.meta.marpitDirectives = {
              ...slideOpen.meta.marpitDirectives,
              paginate: 'skip',
            }
          }
          slideOpenIdx = -1
        }
      }
    }
  )

  md.core.ruler.after(
    'marpit_directives_apply',
    'marpit_hide_slides',
    (state) => {
      if (state.inlineMode) return

      let slideStartIdx = -1

      for (let i = 0; i < state.tokens.length; i += 1) {
        const token = state.tokens[i]

        if (slideStartIdx < 0 && token.meta?.marpitSlideElement === 1) {
          slideStartIdx = i
        } else if (
          slideStartIdx >= 0 &&
          token.meta?.marpitSlideElement === -1
        ) {
          // Remove the whole slide element, including its closing token.
          if (slideHidesItself(state.tokens, slideStartIdx, i)) {
            state.tokens.splice(slideStartIdx, i - slideStartIdx + 1)
            i = slideStartIdx - 1
          }
          slideStartIdx = -1
        }
      }
    }
  )
}

module.exports = marpHideSlidesPlugin
