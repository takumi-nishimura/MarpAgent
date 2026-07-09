# MarpAgent Designs

Available designs:

| Design | Source | Generated tokens | Theme |
| :----- | :----- | :--------------- | :---- |
| `lab` | `designs/lab/DESIGN.md` | `themes/src/_generated/lab-design-tokens.css` | `theme: lab` |
| `muji` | `designs/muji/DESIGN.md` | `themes/src/_generated/muji-design-tokens.css` | `theme: muji` |
| `bil` | `designs/bil/DESIGN.md` | `themes/src/_generated/bil-design-tokens.css` | `theme: bil` |

Create another design with:

```bash
marpx --theme-new <name> --source-url <url> --no-build
```

Then replace the scaffolded `designs/<name>/DESIGN.md` notes with the extracted
design rationale and token values before compiling the theme.

Designs and surfaces are separate concepts:

- A **design** owns visual identity, tokens, and rationale.
- A **canvas family** owns output form and aspect ratio, such as `16:9`, `4:3`,
  A-series paper, or custom pixels.

Paper layout is part of the `lab` design implementation, not a separate design
system or Marp theme.
