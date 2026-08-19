---
name: slide-new
description: Create a new MarpAgent presentation from a brief or topic, including the outline, authored slides, and validation.
disable-model-invocation: true
argument-hint: <deck-name>
---

# New slide deck

Create the requested presentation under `decks/<name>/`. Use the supplied audience, duration, message, sources, and assets; ask only for missing information that materially changes the deck. If the user requests brief/outline approval stages, honor them. Otherwise use stated assumptions and continue to the requested finished draft without mandatory approval pauses.

Inspect the target before scaffolding: the current scaffolder overwrites files in an existing directory. Choose a new destination or preserve the existing work rather than rerunning it blindly.

```sh
npm run marpx -- -n decks/<name>
```

Complete the eight brief sections: Audience, Duration, Core Message, Audience Action, Required Sections, Must-Use Assets, Forbidden Patterns, and References. Use verified source paths/URLs, mark consequential assumptions, and use “none specified” where appropriate instead of inventing requirements.

```sh
npm run marpx -- decks/<name>/brief.md --outline
```

Use the generated outline as an editable plan; inspect it before authoring and preserve intentional human edits when regenerating. The generator deduplicates Title/Agenda and carries variant hints, but the narrative and evidence still need review. Do not stop at the scaffold or outline when the request is for a deck.

Read [marp-slide-types](../marp-slide-types/SKILL.md) for the chosen layouts and [marp-components](../marp-components/SKILL.md) only for components used. Replace scaffold placeholders in `slide.md`, preserve a coherent section-header/pagination flow, and use the requested theme. `two-column` is a template label using `.col`, not a theme class. Keep existing shared components and repository media-ownership conventions.

Validate with [marp-validator](../marp-validator/SKILL.md), fix actual issues, and inspect the rendered deck. Prefer trimming, splitting, or resizing a figure over making text unreadable; respect any fixed slide-count constraint. Recheck after substantive corrections, not after every unrelated small edit.

Complete when the requested content is source-backed, placeholders are replaced, narrative and assets are checked, and validation plus visual inspection support the delivered deck. Report any remaining findings or unavailable checks accurately. Deliver the requested formats; export PDF when included in the request, and do not start a persistent preview server unless needed or requested.
