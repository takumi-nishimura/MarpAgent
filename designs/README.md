# MarpAgent Designs

The default design is `lab`:

- Design source: `designs/lab/DESIGN.md`
- Generated Tailwind tokens: `themes/src/_generated/lab-design-tokens.css`

Designs and surfaces are separate concepts:

- A **design** owns visual identity, tokens, and rationale.
- A **canvas family** owns output form and aspect ratio, such as `16:9`, `4:3`,
  A-series paper, or custom pixels.

Paper layout is part of the `lab` design implementation, not a separate design
system or Marp theme.
