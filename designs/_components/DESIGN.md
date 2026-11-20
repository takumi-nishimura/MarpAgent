---
version: alpha
name: Shared components
description: Color defaults for optional MarpAgent components and named schemes.
colors:
  primary: "#182536"
  surface: "#FFFFFF"
  muted-invert: "#AAAAAA"
  highlight-invert: "#FDBA74"
  table-border: "#999999"
  table-header: "#F0F0F0"
  table-stripe: "#FAFAFA"
  note: "#316DCA"
  note-strong: "#3282EF"
  tip: "#347D39"
  tip-strong: "#009606"
  important: "#8256D0"
  important-strong: "#602FB6"
  warning: "#CC9D35"
  warning-strong: "#D78722"
  caution: "#C93C37"
  caution-strong: "#E5534B"
  red: "#FF5555"
  blue: "#3388FF"
  light-blue: "#61DBFB"
  green: "#2EAB7F"
  yellow: "#D1C600"
  orange: "#FF8800"
  cyan: "#00CCCC"
  pink: "#FF55AA"
  purple: "#673AB8"
  dracula-bg: "#282A36"
  dracula-fg: "#F8F8F2"
  dracula-muted: "#6272A4"
  dracula-highlight: "#BD93F9"
  dracula-emphasis: "#F1FA8C"
  dracula-strong: "#FF79C6"
  one-dark-bg: "#282C34"
  one-dark-fg: "#ABB2BF"
  one-dark-muted: "#5C6370"
  one-dark-highlight: "#61AFEF"
  one-dark-emphasis: "#E5C07B"
  one-dark-strong: "#E06C75"
  nord-bg: "#2E3440"
  nord-fg: "#ECEFF4"
  nord-muted: "#4C566A"
  nord-highlight: "#88C0D0"
  nord-emphasis: "#EBCB8B"
  nord-strong: "#BF616A"
  neogaia-dark-bg: "#455A64"
  neogaia-dark-fg: "#FFF8E1"
  neogaia-dark-muted: "#B0BEC5"
  neogaia-dark-highlight: "#D1E8FF"
  neogaia-dark-emphasis: "#FFFF66"
  neogaia-dark-strong: "#FFEB3B"
  neogaia-light-bg: "#FFF8E1"
  neogaia-light-fg: "#455A64"
  neogaia-light-muted: "#607D8B"
  neogaia-light-highlight: "#0288D1"
  neogaia-light-emphasis: "#BF8700"
  neogaia-light-strong: "#D97706"
  github-light-bg: "#FFFFFF"
  github-light-fg: "#24292F"
  github-light-muted: "#57606A"
  github-light-highlight: "#0969DA"
  github-light-emphasis: "#BF8700"
  github-light-strong: "#CF222E"
  code-inline-bg: rgba(128, 128, 128, 0.2)
  code-block-bg: rgba(128, 128, 128, 0.15)
  code-comment: "#6A737D"
  code-keyword: "#D73A49"
  code-string: "#032F62"
  code-number: "#005CC5"
  code-function: "#6F42C1"
  code-dark-comment: "#7F848E"
  code-dark-keyword: "#C678DD"
  code-dark-string: "#98C379"
  code-dark-number: "#D19A66"
  code-dark-function: "#61AFEF"
typography:
  header-label:
    fontFamily: Noto Sans JP
    fontSize: 26px
    lineHeight: "1.3"
components:
  ink:
    textColor: "{colors.primary}"
  content-surface:
    backgroundColor: "{colors.surface}"
  header-band:
    backgroundColor: "{colors.surface}"
    typography: "{typography.header-label}"
  inverted-muted-text:
    textColor: "{colors.muted-invert}"
  inverted-highlight:
    backgroundColor: "{colors.highlight-invert}"
  table-cell:
    backgroundColor: "{colors.surface}"
  table-border:
    backgroundColor: "{colors.table-border}"
  table-header:
    backgroundColor: "{colors.table-header}"
  table-stripe:
    backgroundColor: "{colors.table-stripe}"
  callout-note:
    backgroundColor: "{colors.note}"
  callout-note-label:
    textColor: "{colors.note-strong}"
  callout-tip:
    backgroundColor: "{colors.tip}"
  callout-tip-label:
    textColor: "{colors.tip-strong}"
  callout-important:
    backgroundColor: "{colors.important}"
  callout-important-label:
    textColor: "{colors.important-strong}"
  callout-warning:
    backgroundColor: "{colors.warning}"
  callout-warning-label:
    textColor: "{colors.warning-strong}"
  callout-caution:
    backgroundColor: "{colors.caution}"
  callout-caution-label:
    textColor: "{colors.caution-strong}"
  utility-red:
    textColor: "{colors.red}"
  utility-blue:
    textColor: "{colors.blue}"
  utility-light-blue:
    textColor: "{colors.light-blue}"
  utility-green:
    textColor: "{colors.green}"
  utility-yellow:
    textColor: "{colors.yellow}"
  utility-orange:
    textColor: "{colors.orange}"
  utility-cyan:
    textColor: "{colors.cyan}"
  utility-pink:
    textColor: "{colors.pink}"
  utility-purple:
    textColor: "{colors.purple}"
  scheme-dracula-bg:
    backgroundColor: "{colors.dracula-bg}"
  scheme-dracula-fg:
    textColor: "{colors.dracula-fg}"
  scheme-dracula-muted:
    textColor: "{colors.dracula-muted}"
  scheme-dracula-highlight:
    backgroundColor: "{colors.dracula-highlight}"
  scheme-dracula-emphasis:
    backgroundColor: "{colors.dracula-emphasis}"
  scheme-dracula-strong:
    textColor: "{colors.dracula-strong}"
  scheme-one-dark-bg:
    backgroundColor: "{colors.one-dark-bg}"
  scheme-one-dark-fg:
    textColor: "{colors.one-dark-fg}"
  scheme-one-dark-muted:
    textColor: "{colors.one-dark-muted}"
  scheme-one-dark-highlight:
    backgroundColor: "{colors.one-dark-highlight}"
  scheme-one-dark-emphasis:
    backgroundColor: "{colors.one-dark-emphasis}"
  scheme-one-dark-strong:
    textColor: "{colors.one-dark-strong}"
  scheme-nord-bg:
    backgroundColor: "{colors.nord-bg}"
  scheme-nord-fg:
    textColor: "{colors.nord-fg}"
  scheme-nord-muted:
    textColor: "{colors.nord-muted}"
  scheme-nord-highlight:
    backgroundColor: "{colors.nord-highlight}"
  scheme-nord-emphasis:
    backgroundColor: "{colors.nord-emphasis}"
  scheme-nord-strong:
    textColor: "{colors.nord-strong}"
  scheme-neogaia-dark-bg:
    backgroundColor: "{colors.neogaia-dark-bg}"
  scheme-neogaia-dark-fg:
    textColor: "{colors.neogaia-dark-fg}"
  scheme-neogaia-dark-muted:
    textColor: "{colors.neogaia-dark-muted}"
  scheme-neogaia-dark-highlight:
    backgroundColor: "{colors.neogaia-dark-highlight}"
  scheme-neogaia-dark-emphasis:
    backgroundColor: "{colors.neogaia-dark-emphasis}"
  scheme-neogaia-dark-strong:
    textColor: "{colors.neogaia-dark-strong}"
  scheme-neogaia-light-bg:
    backgroundColor: "{colors.neogaia-light-bg}"
  scheme-neogaia-light-fg:
    textColor: "{colors.neogaia-light-fg}"
  scheme-neogaia-light-muted:
    textColor: "{colors.neogaia-light-muted}"
  scheme-neogaia-light-highlight:
    backgroundColor: "{colors.neogaia-light-highlight}"
  scheme-neogaia-light-emphasis:
    backgroundColor: "{colors.neogaia-light-emphasis}"
  scheme-neogaia-light-strong:
    textColor: "{colors.neogaia-light-strong}"
  scheme-github-light-bg:
    backgroundColor: "{colors.github-light-bg}"
  scheme-github-light-fg:
    textColor: "{colors.github-light-fg}"
  scheme-github-light-muted:
    textColor: "{colors.github-light-muted}"
  scheme-github-light-highlight:
    backgroundColor: "{colors.github-light-highlight}"
  scheme-github-light-emphasis:
    backgroundColor: "{colors.github-light-emphasis}"
  scheme-github-light-strong:
    textColor: "{colors.github-light-strong}"
  code-inline-bg:
    backgroundColor: "{colors.code-inline-bg}"
  code-block-bg:
    backgroundColor: "{colors.code-block-bg}"
  code-comment:
    textColor: "{colors.code-comment}"
  code-keyword:
    textColor: "{colors.code-keyword}"
  code-string:
    textColor: "{colors.code-string}"
  code-number:
    textColor: "{colors.code-number}"
  code-function:
    textColor: "{colors.code-function}"
  code-dark-comment:
    textColor: "{colors.code-dark-comment}"
  code-dark-keyword:
    textColor: "{colors.code-dark-keyword}"
  code-dark-string:
    textColor: "{colors.code-dark-string}"
  code-dark-number:
    textColor: "{colors.code-dark-number}"
  code-dark-function:
    textColor: "{colors.code-dark-function}"
---

# Shared component defaults

New themes inherit these tokens for tables, alerts, named color schemes and syntax highlighting. Override an individual role in the theme DESIGN.md when needed.
