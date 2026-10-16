# Figures, video, and Mermaid

Keep media ownership and per-file cross-deck symlinks consistent with repository AGENTS.md. Verify local paths, captions, and source attribution. For PDF output, check a useful static representation of video when the user needs printable content.

## Figures and Media

```markdown
<figure>
<img src="assets/img/example.png" />
<figcaption>Caption text</figcaption>
</figure>
```

With width control:

```markdown
<figure style="width: 75%;">
<img src="assets/img/example.png" />
<figcaption>Caption</figcaption>
</figure>
```

Video:

```markdown
<figure>
<video src="assets/video/demo.mp4" autoplay loop muted></video>
<figcaption>Demo video</figcaption>
</figure>
```

## Mermaid Diagrams

Plain `mermaid` fences use MarpAgent's cached renderer and support `$...$` math in diagram labels. Attribute-bearing fences such as `mermaid interactive` use Core 5's renderer; diagram math and the MarpAgent cache apply only to plain fences. Choose the plain fence for printable research diagrams with formulas. Check the intended HTML and static output when using interactive diagrams.

Both renderers use the active theme's Shiki palette and the same `--mermaid-*` sizing controls below. For a needed local color change, set `--marp-mermaid-foreground`, `--marp-mermaid-line`, or `--marp-mermaid-accent` on the wrapper instead of rewriting generated SVG elements. Cached diagrams follow these CSS overrides without rerendering.

Wrap in a width-constrained div:

````markdown
<div style="width: 90%">

```mermaid
graph LR
    A[Input] --> B[Process] --> C[Output]
```

</div>
````

Use `<br/>` or `\n` inside a quoted label when a node label needs a line break:

````markdown
```mermaid
flowchart TD
    A["Long first line<br/>Short second line"] --> B[Output]
```
````

Sizing note: Mermaid is laid out before slide CSS is applied. Scoped CSS such
as `.my-flow svg text { font-size: 20px }` changes visible text only and does
not resize node boxes. To make a diagram larger, scale the SVG/container:

````markdown
<div style="width: 90%; --mermaid-width: 115%; --mermaid-max-width: none; --mermaid-overflow: visible">

```mermaid
graph LR
    A[Input] --> B[Process] --> C[Output]
```

</div>
````
