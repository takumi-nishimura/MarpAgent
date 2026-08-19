# Theme variables

These are lab/shared-theme defaults. Check the active theme before applying an override. Brand-wide values belong in its DESIGN.md; a requested deck-specific logo override need not redesign the theme.

## CSS Variables

Built-in theme variables:

| Variable | Purpose |
| :------- | :------ |
| `--color-deck-gray` | Primary gray for muted text/borders |
| `--text-xs` | Smallest allowed font size |
| `--text-sm` | Small font size |
| `--text-xl` | Large font size |
| `--logos-dark` | URL of dark-variant logo |
| `--logos-light` | URL of light-variant logo |
| `--logo-title-size` | Title-slide logo height used for default sizing and vertical space |
| `--logo-title-background-size` | Title-slide CSS background-size override |
| `--logo-header-size` | Non-title header logo height |

Title slides default to height-based logo sizing so wide wordmarks remain
legible. Override only the background size when a deck needs a different title
logo height:

```yaml
style: |
  section {
    --logos-dark: url(shared/logos/haptics_lab/logo_gray.svg);
    --logo-title-background-size: auto 50px;
  }
```

`--bg-gray-5` is built into the theme for subtle panel backgrounds. Override it
in frontmatter only when the whole deck needs a different panel tint.
