---
id: ADR-0015
title: "Select presentation starters by audience task"
type: decision
status: proposed
date: "2026-11-20"
authors:
  - Codex
scope:
  - slide scaffolding and rendering
tags:
  - authoring
depends_on: []
supersedes: []
issues: []
artifacts:
  revisions: []
  manifests: []
  results: []
  commands: []
---

# Select presentation starters by audience task

## Context and Problem Statement

A new deck previously offered a title and one working heading. Authors needed to choose a visual theme and then invent a useful page sequence for the occasion.

## Decision Drivers

The audience may need to evaluate a claim, approve a decision, or complete an activity. Authors should be able to inspect a working example before copying it and edit its sections in a single source.

## Considered Options

### Audience-specific themes

Independent themes could replace the visual treatment across a whole deck. They would still need examples that teach the author what to put on the page.

### Editable presentation starters

Each starter can show a complete short talk and reuse the existing theme's type scale, spacing and rendering support. The author owns the copy after scaffolding.

## Decision Outcome

### Chosen Option

Offer three opt-in Markdown starters. Pair evidence with conditions for a conference, align alternatives on common criteria for a decision, and give participants a timed action and deliverable for a workshop. An agenda derives its labels from the first heading on each visible marked section slide.

### Scope

The CLI selects the starter for a new slide deck. The shared rendering engine computes contents for both existing and new decks.

### Non-goals

Paper layouts and institutional branding have separate authoring workflows.

## Consequences

### Positive

An author can preview the templates with real content and revise the copied Markdown directly.

### Negative

Updates to a starter do not propagate to decks already created from it. Authors must choose their section boundaries.

### Neutral

A blank starter remains available for other contexts.

## Validation

The scaffold and contents tests exercise selection, heading changes and hidden slides. The fixture gate checks the three decks with the repository's validator.

## Related Records

Design references: [Digital Agency design foundations](https://design.digital.go.jp/dads/foundations/) for shared type, color and spacing, and [スライド作成入門](https://home.riise.hiroshima-u.ac.jp/~ten/slide_20240328.pdf) for alignment, grouping and visual emphasis.
