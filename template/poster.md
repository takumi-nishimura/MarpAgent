---
marp: true
theme: poster
size: a0
paginate: false
style: |
  section {
    --accent: #0969da;        /* section bars, borders, links */
  }
---

<!--
  A0 poster (841 x 1189 mm, portrait). One slide = the whole poster.

  Landscape: set `size: a0-landscape` above. Column count follows the number
  of <div class="poster-col"> blocks — use 3 for portrait, 4 for landscape.

  Structure: <header> band, a <div class="poster-columns"> with <div
  class="poster-col"> children, and a <footer> band. Each topic is a
  <section class="poster-section"> whose first <h2> becomes the title bar.
  Add the `highlight` class for a key-result card.

  Preview / validate / export (run from repo root):
    npx marpx decks/<name>/poster.md        # live preview
    npx marpx decks/<name>/poster.md -v      # validate (overflow check)
    npx marpx decks/<name>/poster.md --pdf   # export A0 PDF for printing
-->

<header class="poster-header">

<div class="poster-logo">

![logo](shared/logos/marp-logo.svg)

</div>

<div class="poster-title">

# Poster Title Goes Here

<p class="poster-authors">First Author, Second Author, Third Author</p>
<p class="poster-affil">Laboratory / Department, Institution — {{DATE}}</p>

</div>

<div class="poster-logo">

![logo](shared/logos/marp-logo.svg)

</div>

</header>

<div class="poster-columns">
<div class="poster-col">

<section class="poster-section">

## Introduction

- Motivation and context
- The gap this work addresses

</section>

<section class="poster-section">

## Research Question

<div class="important">

State the central question or hypothesis in one sentence.

</div>

</section>

<section class="poster-section">

## Method

- Study design
- Participants / materials
- Procedure

</section>

</div>
<div class="poster-col">

<section class="poster-section">

## Approach

![w:100%](shared/img/fig.png)

Brief description of the system or pipeline.

</section>

<section class="poster-section highlight">

## Key Result

<div class="poster-stat">

The headline number or finding — make it **bold**.

</div>

</section>

<section class="poster-section">

## Results

| Condition | Metric A | Metric B |
| :-------- | :------: | :------: |
| Baseline | 0.0 | 0.0 |
| Proposed | 0.0 | 0.0 |

</section>

</div>
<div class="poster-col">

<section class="poster-section">

## Discussion

- Interpretation of the findings
- Limitations

</section>

<section class="poster-section">

## Conclusion

- Take-home message
- Why it matters

</section>

<section class="poster-section">

## Future Work

1. Next step one
2. Next step two

</section>

</div>
</div>

<footer class="poster-footer">

<div class="poster-refs">

**References** [1] Author et al., *Title*, Venue Year. [2] Author et al., *Title*, Venue Year.

</div>

<div class="poster-contact">

📧 you@example.com
🔗 lab.example.edu

</div>

</footer>
