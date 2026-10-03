---
name: slide-new
description: Create a new MarpAgent presentation from a topic or source material by developing a rough slide.md into a finished, validated deck.
disable-model-invocation: true
argument-hint: <deck-name>
---

# New slide deck

Create the requested presentation under `decks/<name>/`. Keep context in `brief.md` and develop the presentation directly in `slide.md`, from rough structure through finished pages. Do not create or synchronize `outline.md` by default. Honor an explicitly requested outline or approval stage; otherwise continue to the requested finished draft without mandatory pauses.

## Establish context

Read the supplied material, inspect figures and data, and identify the audience, intended outcome, delivery format, time, and actual constraints. Use reference decks or the user's existing slides to understand their voice and visual preferences. Ask only for missing information that materially changes the deck; state consequential assumptions and mark unsupported claims for resolution.

Inspect the destination before scaffolding. The command refuses to overwrite existing template files without `--force`; use [slide-edit](../slide-edit/SKILL.md) when the task is to revise an existing deck.

```sh
npm run marpx -- -n decks/<name>
```

Write a short `brief.md` with the purpose, audience, constraints, and source/asset references needed for this task. Omit unused fields. Required coverage belongs here only when it is a genuine requirement; slide order and wording belong in `slide.md`. A target count is not a hard limit unless specified as one.

## Develop the deck in place

1. Sketch the sequence as rough headings and content in `slide.md`. Add brief drafting notes only where they help track missing evidence or an unresolved transition. Use the argument and available material to decide the sequence; an agenda, recap, and fixed number of points are not automatic requirements.
2. Try the important or uncertain pages with actual figures, data, or examples early. Render enough to check the proposed visual treatment, readable density, and fit. Do not polish every page before testing whether the central material works. For a short, simple deck this can happen while drafting the whole file.
3. Expand, trim, reorder, or split within the same file. Read affected neighbors after changes so a local improvement still fits the argument. Update the brief only when the requirements or source context change, not to mirror each page edit.

Use [marp-slide-types](../marp-slide-types/SKILL.md) to choose visual structure from the content and supporting material. Read [marp-components](../marp-components/SKILL.md) only for components being used. Follow the requested theme, preserve coherent headers/pagination, and keep repository media-ownership conventions. Do not invent data or fill missing evidence with decorative visuals.

## Check and deliver

Inspect both rendered pages and the sequence; `--overview` is useful for the latter. Check whether each page earns its place, the evidence supports its heading, and the next page follows naturally. Match the requested balance of spoken explanation and standalone reading.

Validate with [marp-validator](../marp-validator/SKILL.md), fix actual issues, and inspect the rendered deck. Prefer trimming, splitting, or resizing a figure over making text unreadable; respect any fixed slide-count constraint. Recheck after substantive corrections, not after every unrelated small edit.

Replace scaffold placeholders and resolve or clearly disclose missing source material. Remove temporary drafting comments before delivery, or convert them into intentional speaker notes: ordinary comments can appear in Marp presenter notes. Deliver the requested formats and report remaining findings or unavailable checks accurately. Do not start a persistent preview server unless needed or requested.
