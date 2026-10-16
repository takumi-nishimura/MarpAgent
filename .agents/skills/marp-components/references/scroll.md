# Scrollable slide bodies

Use `<!-- _scroll: true -->` only on a page the user intends to scroll during
presentation. It works with the shared lab, muji, and toshiba themes. Prefer
splitting material for a static deck; do not enable scrolling automatically to
silence overflow or compensate for an unreadable layout.

```markdown
<!-- _scroll: true -->
## Detailed results

Long table or appendix content.

---

## Next slide

Normal presentation body.
```

The header, first top-level heading, footer, and pagination stay fixed. All
remaining body content shares one vertical viewport; headings inside an HTML
component stay with that component. Keep normal Markdown blank lines in HTML
containers. Do not add your own overflow wrapper or shrink the text.

Wheel/trackpad, touch, and Up/Down/PageUp/PageDown/Home/End scroll an overflowing
body; Left/Right and existing page controls navigate. Focused controls retain
their keys. Open the presenter window from that presentation to synchronize
the current page's position in both directions. Independently opened sessions
and other decks are isolated; this does not synchronize different computers.

The spot directive `_scroll` applies to one page. The unspotted `scroll`
directive follows Marpit inheritance, so use the spot form for selected pages.

PDF/PPTX/images and printing show the initial viewport. A long body produces
the non-blocking `scroll-export-overflow` warning. Report that limit and split
the slide if the static output must include all detail. Rendered validation
visits the full body, including the middle, and still fails actual clipping,
small text, overlaps, broken media, and diagram/math errors. A report screenshot
shows only the initial viewport: inspect the interactive page as well.
