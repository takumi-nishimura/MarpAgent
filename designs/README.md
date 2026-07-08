# MarpAgent Designs

The default design is `lab`:

- Design source: `designs/lab/DESIGN.md`
- Generated Tailwind tokens: `themes/src/_generated/lab-design-tokens.css`

Designs and surfaces are separate concepts:

- A **design** owns visual identity, tokens, and rationale.
- A **surface** owns output form and layout model, such as slides or posters.

The current `poster` implementation is a surface of the `lab` design, not a
separate design system.
