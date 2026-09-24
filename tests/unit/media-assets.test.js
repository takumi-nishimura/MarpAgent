const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  copyDeckForRender,
  extractMediaReferences,
  findMissingAssets,
  resolveLocalReference,
} = require("../../src/media-assets");

function makeDeck(files = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "marp-agent-assets-"));
  for (const [name, content] of Object.entries(files)) {
    const filePath = path.join(dir, name);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }
  return dir;
}

function writeSlide(dir, markdown) {
  const deckPath = path.join(dir, "slide.md");
  fs.writeFileSync(deckPath, markdown);
  return deckPath;
}

function missingBySlide(result) {
  return Object.fromEntries(
    result.map((slide) => [
      slide.slideNumber,
      slide.missing.map((item) => [item.reference, item.reason]),
    ]),
  );
}

test("extractMediaReferences reads Markdown, HTML, and CSS media references", () => {
  const raw = `
![bg left:40% w:300](assets/img/bg.png)
![w:200](<assets/img/with space.png> "A title")
![Figure](assets/img/plain.png 'single title')
<img class="face" src="assets/img/face.jpg" />
<video src="assets/video/clip.mp4" poster="assets/img/poster.png" muted></video>
<video muted><source src="assets/video/alt.webm" type="video/webm"></video>
<object data="assets/img/diagram.svg"></object>
<div data-src="not-a-media-attribute.png" style="background-image: url('assets/img/inline.png')"></div>
<style>
section { background: url("assets/img/css.png"); }
</style>
<!-- _backgroundImage: url(assets/img/directive.png) -->
<!-- speaker note mentions ![old](assets/img/note.png) -->

\`\`\`md
![example](assets/img/in-code.png)
\`\`\`

Inline \`<img src="assets/img/inline-code.png">\` is code too.
`;

  const references = extractMediaReferences(raw).map((ref) => ref.reference);

  assert.deepEqual(references.sort(), [
    "assets/img/bg.png",
    "assets/img/css.png",
    "assets/img/diagram.svg",
    "assets/img/directive.png",
    "assets/img/face.jpg",
    "assets/img/inline.png",
    "assets/img/plain.png",
    "assets/img/poster.png",
    "assets/img/with space.png",
    "assets/video/alt.webm",
    "assets/video/clip.mp4",
  ]);
});

test("resolveLocalReference skips remote and inline URLs", () => {
  const deckDir = "/deck";
  for (const reference of [
    "https://example.com/a.png",
    "http://example.com/a.png",
    "//cdn.example.com/a.png",
    "data:image/png;base64,AAAA",
    "#fragment",
    "",
  ]) {
    assert.equal(resolveLocalReference(reference, deckDir), null, reference);
  }
  assert.equal(
    resolveLocalReference("assets/my%20figure.png?v=2#frag", deckDir),
    path.resolve(deckDir, "assets/my figure.png"),
  );
  assert.equal(
    resolveLocalReference("/abs/figure.png", deckDir),
    path.resolve("/abs/figure.png"),
  );
});

test("findMissingAssets reports a missing image on its slide", () => {
  const dir = makeDeck({ "assets/img/present.png": "png" });
  try {
    const deckPath = writeSlide(
      dir,
      `---
marp: true
---

# One

![Present](assets/img/present.png)

---

# Two

<img src="assets/img/missing.png" />
![Missing too](assets/img/also-missing.png "Title")
`,
    );

    const result = findMissingAssets(deckPath);

    assert.deepEqual(missingBySlide(result), {
      2: [
        ["assets/img/missing.png", "not found"],
        ["assets/img/also-missing.png", "not found"],
      ],
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("findMissingAssets names the target of a broken symlink", () => {
  const dir = makeDeck();
  try {
    fs.mkdirSync(path.join(dir, "assets/img"), { recursive: true });
    fs.symlinkSync(
      "../../../other-deck/assets/img/gone.png",
      path.join(dir, "assets/img/linked.png"),
    );
    fs.symlinkSync("../missing-shared", path.join(dir, "shared"));
    const deckPath = writeSlide(
      dir,
      `# Linked

<img src="assets/img/linked.png" />
<img src="shared/img/logo.png" />
`,
    );

    const [slide] = findMissingAssets(deckPath);

    assert.equal(slide.slideNumber, 1);
    assert.equal(slide.missing.length, 2);
    assert.equal(slide.missing[0].reason, "broken symlink");
    assert.equal(slide.missing[0].link, undefined);
    assert.equal(
      slide.missing[0].target,
      "../../../other-deck/assets/img/gone.png",
    );
    assert.equal(slide.missing[1].reason, "broken symlink");
    assert.equal(slide.missing[1].link, "shared");
    assert.equal(slide.missing[1].target, "../missing-shared");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("findMissingAssets reports missing background images and CSS urls", () => {
  const dir = makeDeck({ "assets/img/logo.svg": "<svg/>" });
  try {
    const deckPath = writeSlide(
      dir,
      `---
marp: true
style: |
  section { --logos-dark: url(assets/img/logo.svg); }
  section.cover { background-image: url("assets/img/cover.png"); }
---

![bg right:40%](assets/img/missing-bg.png)

# Background

---

<!-- _backgroundImage: url('assets/img/missing-directive.png') -->

<style scoped>
section { background: url(assets/img/missing-scoped.png); }
</style>

# Scoped
`,
    );

    assert.deepEqual(missingBySlide(findMissingAssets(deckPath)), {
      1: [
        ["assets/img/cover.png", "not found"],
        ["assets/img/missing-bg.png", "not found"],
      ],
      2: [
        ["assets/img/missing-directive.png", "not found"],
        ["assets/img/missing-scoped.png", "not found"],
      ],
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("findMissingAssets reports missing video sources and posters", () => {
  const dir = makeDeck({ "assets/video/present.mp4": "mp4" });
  try {
    const deckPath = writeSlide(
      dir,
      `# Video

<video src="assets/video/missing.mp4" poster="assets/img/poster.png" muted></video>

<video muted>
  <source src="assets/video/present.mp4" type="video/mp4">
  <source src="assets/video/missing.webm" type="video/webm">
</video>
`,
    );

    assert.deepEqual(missingBySlide(findMissingAssets(deckPath)), {
      1: [
        ["assets/video/missing.mp4", "not found"],
        ["assets/img/poster.png", "not found"],
        ["assets/video/missing.webm", "not found"],
      ],
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("findMissingAssets ignores remote URLs and hidden slides", () => {
  const dir = makeDeck();
  try {
    const deckPath = writeSlide(
      dir,
      `# Remote

![Remote](https://example.com/figure.png)
<img src="http://example.com/figure.png">
<video src="//cdn.example.com/clip.mp4"></video>
<img src="data:image/png;base64,iVBORw0KGgo=">

---

<!-- hide: true -->

![Draft](assets/img/draft-only.png)
`,
    );

    assert.deepEqual(findMissingAssets(deckPath), []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("findMissingAssets reports nothing when every asset exists", () => {
  const dir = makeDeck({
    "assets/img/my figure.png": "png",
    "assets/img/図.png": "png",
    "assets/img/target.png": "png",
    "assets/video/clip.mp4": "mp4",
  });
  try {
    fs.symlinkSync("target.png", path.join(dir, "assets/img/link.png"));
    const deckPath = writeSlide(
      dir,
      `# Everything loads

![w:300](assets/img/my%20figure.png)
![](<assets/img/my figure.png> "Title")
![](assets/img/%E5%9B%B3.png)
<img src="assets/img/図.png">
<img src="assets/img/link.png">
<video src="assets/video/clip.mp4#t=5"></video>
`,
    );

    assert.deepEqual(findMissingAssets(deckPath), []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("copyDeckForRender skips export artifacts the render does not need", () => {
  const dir = makeDeck({
    "assets/img/a.png": "png",
    "assets/video/clip.mp4": "mp4",
    "report/out.pdf": "exported report",
    "slide.pdf": "exported",
    ".slide.overview.html": "<html></html>",
    "brief.md": "brief",
  });
  const destination = `${dir}-copy`;

  try {
    const deckPath = writeSlide(
      dir,
      "# One\n\n![](assets/img/a.png)\n<video src=\"assets/video/clip.mp4\"></video>\n",
    );
    copyDeckForRender(deckPath, destination);

    assert.deepEqual(fs.readdirSync(destination).sort(), [
      "assets",
      "brief.md",
      "report",
      "slide.md",
    ]);
    assert.deepEqual(fs.readdirSync(path.join(destination, "assets/img")), [
      "a.png",
    ]);
    assert.deepEqual(
      fs.readdirSync(path.join(destination, "assets/video")),
      ["clip.mp4"],
    );
    assert.deepEqual(fs.readdirSync(path.join(destination, "report")), []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(destination, { recursive: true, force: true });
  }
});

test("copyDeckForRender keeps a PDF the deck embeds", () => {
  const dir = makeDeck({
    "assets/doc.pdf": "pdf",
    "assets/other.pdf": "pdf",
  });
  const destination = `${dir}-copy`;

  try {
    const deckPath = writeSlide(
      dir,
      "# One\n\n<object data=\"assets/doc.pdf\"></object>\n",
    );
    copyDeckForRender(deckPath, destination);

    assert.equal(
      fs.existsSync(path.join(destination, "assets/doc.pdf")),
      true,
    );
    assert.equal(
      fs.existsSync(path.join(destination, "assets/other.pdf")),
      false,
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(destination, { recursive: true, force: true });
  }
});
