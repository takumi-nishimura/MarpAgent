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

test("media extraction follows Markdown destinations, references, entities, and code rules", () => {
  const source = [
    "![figure](fig(1).svg)",
    "![escaped](fig\\(2\\).svg)",
    '<img title="a > b" src="a&amp;b.svg">',
    '<img title=" src=\'not-an-attribute.svg\'" src="real.svg">',
    "![ref][image]",
    '[image]: missing.svg "Title"',
    "",
    "    ![sample](code.png)",
    "",
    "```md\n```html\n![sample](fenced.png)\n```",
    "",
    "``literal ` ![sample](inline.png)``",
    "",
    "<script>const sample = '<img src=\"script.png\">';</script>",
  ].join("\n\n");
  assert.deepEqual(
    extractMediaReferences(source).map((item) => item.reference),
    ["fig(1).svg", "fig(2).svg", "a&b.svg", "real.svg", "missing.svg"],
  );
});

test("reference definitions on later or hidden slides resolve at the image's slide", (t) => {
  const dir = makeDeck({ "fig(1).svg": "svg", "a&b.svg": "svg" });
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const deckPath = writeSlide(
    dir,
    '# One\n\n![ok](fig(1).svg)\n<img src="a&amp;b.svg">\n\n---\n\n# Two\n\n![missing][ref]\n\n---\n\n<!-- _hide: true -->\n\n[ref]: absent.svg\n',
  );
  assert.deepEqual(missingBySlide(findMissingAssets(deckPath)), {
    2: [["absent.svg", "not found"]],
  });
});

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

test("frontmatter CSS assets are checked with BOM and longer closing delimiters", (t) => {
  const dir = makeDeck();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const deckPath = writeSlide(
    dir,
    '\uFEFF---\nmarp: true\nstyle: |\n  section { background-image: url(missing-cover.png); }\n  ----  \n\n# Cover\n',
  );
  assert.deepEqual(missingBySlide(findMissingAssets(deckPath)), {
    1: [["missing-cover.png", "not found"]],
  });
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

test("findMissingAssets skips media on slides hidden with _hide", () => {
  const dir = makeDeck();
  try {
    const deckPath = writeSlide(
      dir,
      `# Visible

---

<!--
_class: lead
_hide: true
-->
![Hidden](assets/img/hidden-missing.png)

---

# Still visible

![Missing](assets/img/missing.png)
`,
    );

    assert.deepEqual(missingBySlide(findMissingAssets(deckPath)), {
      3: [["assets/img/missing.png", "not found"]],
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("findMissingAssets does not hide a slide over a fenced hide comment", () => {
  const dir = makeDeck();
  try {
    const deckPath = writeSlide(
      dir,
      `# Visible

\`\`\`md
<!-- hide: true -->
\`\`\`

![Missing](assets/img/missing.png)
`,
    );

    assert.deepEqual(missingBySlide(findMissingAssets(deckPath)), {
      1: [["assets/img/missing.png", "not found"]],
    });
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

test("Windows render copies load shared and reused media without symlink privilege", (t) => {
  const root = makeDeck({
    "assets/css/nested/theme.css": '@import "../base.css";',
    "assets/css/base.css":
      'section { background: url("../img/図 with space.svg"); }',
    "assets/img/図 with space.svg": "shared image",
    "assets/fonts/font.woff2": "shared font",
    "decks/owner/assets/img/original.svg": "owner image",
    "decks/consumer/assets/css/local.css":
      'section { background: url("../img/reused.svg"); }',
  });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dir = path.join(root, "decks/consumer");
  fs.mkdirSync(path.join(dir, "assets/img"));
  fs.symlinkSync("../../assets", path.join(dir, "shared"), "dir");
  fs.symlinkSync(
    "../../../owner/assets/img/original.svg",
    path.join(dir, "assets/img/reused.svg"),
    "file",
  );
  const markdown =
    "# Linked\n\n![](shared/img/%E5%9B%B3%20with%20space.svg)\n![](assets/img/reused.svg)\n";
  const deckPath = writeSlide(dir, markdown);
  const destination = path.join(root, "render");

  t.mock.property(process, "platform", "win32");
  const cpSync = fs.cpSync;
  t.mock.method(fs, "cpSync", (source, target, options) => {
    if (!options?.dereference) {
      throw Object.assign(new Error("symlink privilege unavailable"), {
        code: "EPERM",
        syscall: "symlink",
      });
    }
    return cpSync(source, target, options);
  });

  copyDeckForRender(deckPath, destination);

  for (const [name, expected] of [
    ["shared/css/nested/theme.css", '@import "../base.css";'],
    [
      "shared/css/base.css",
      'section { background: url("../img/図 with space.svg"); }',
    ],
    ["shared/img/図 with space.svg", "shared image"],
    ["shared/fonts/font.woff2", "shared font"],
    [
      "assets/css/local.css",
      'section { background: url("../img/reused.svg"); }',
    ],
    ["assets/img/reused.svg", "owner image"],
  ]) {
    assert.equal(
      fs.readFileSync(path.join(destination, name), "utf8"),
      expected,
      name,
    );
  }
  assert.equal(
    fs.lstatSync(path.join(destination, "shared")).isSymbolicLink(),
    false,
  );
  assert.equal(
    fs
      .lstatSync(path.join(destination, "assets/img/reused.svg"))
      .isSymbolicLink(),
    false,
  );
  assert.equal(fs.readlinkSync(path.join(dir, "shared")), "../../assets");
  assert.equal(
    fs.readlinkSync(path.join(dir, "assets/img/reused.svg")),
    "../../../owner/assets/img/original.svg",
  );
  assert.equal(fs.readFileSync(deckPath, "utf8"), markdown);
  assert.equal(
    fs.readFileSync(
      path.join(root, "decks/owner/assets/img/original.svg"),
      "utf8",
    ),
    "owner image",
  );
  assert.deepEqual(findMissingAssets(path.join(destination, "slide.md")), []);
});

test("Windows render copies leave broken links missing and preserve source diagnoses", (t) => {
  const root = makeDeck({
    "deck/assets/present.svg": "image",
    "shared/present.svg": "shared image",
  });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dir = path.join(root, "deck");
  fs.symlinkSync("gone.svg", path.join(dir, "assets/broken.svg"), "file");
  fs.symlinkSync("../absent", path.join(dir, "broken-shared"), "dir");
  fs.symlinkSync("../shared", path.join(dir, "shared"), "dir");
  fs.symlinkSync("gone.svg", path.join(root, "shared/broken.svg"), "file");
  const deckPath = writeSlide(
    dir,
    "# Missing\n\n![](assets/broken.svg)\n![](broken-shared/img.svg)\n![](shared/broken.svg)\n![](assets/absent.svg)\n",
  );
  const before = findMissingAssets(deckPath);
  const destination = path.join(root, "render");
  t.mock.property(process, "platform", "win32");

  copyDeckForRender(deckPath, destination);

  assert.deepEqual(findMissingAssets(deckPath), before);
  assert.deepEqual(
    before[0].missing.map(({ reason, target, link }) => ({
      reason,
      target,
      link,
    })),
    [
      { reason: "broken symlink", target: "gone.svg", link: undefined },
      { reason: "broken symlink", target: "../absent", link: "broken-shared" },
      { reason: "broken symlink", target: "gone.svg", link: undefined },
      { reason: "not found", target: undefined, link: undefined },
    ],
  );
  assert.deepEqual(
    missingBySlide(findMissingAssets(path.join(destination, "slide.md"))),
    {
      1: [
        ["assets/broken.svg", "not found"],
        ["broken-shared/img.svg", "not found"],
        ["shared/broken.svg", "not found"],
        ["assets/absent.svg", "not found"],
      ],
    },
  );
  assert.equal(
    fs.readFileSync(path.join(destination, "assets/present.svg"), "utf8"),
    "image",
  );
  assert.equal(
    fs.readFileSync(path.join(destination, "shared/present.svg"), "utf8"),
    "shared image",
  );
});

test("Windows render copies stop directory cycles without dropping independent aliases", (t) => {
  const root = makeDeck({ "deck/assets/image.svg": "image" });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dir = path.join(root, "deck");
  fs.symlinkSync("..", path.join(dir, "assets/parent"), "dir");
  fs.symlinkSync("assets", path.join(dir, "alias"), "dir");
  fs.symlinkSync("self", path.join(dir, "self"), "dir");
  const deckPath = writeSlide(dir, "# Linked\n\n![](alias/image.svg)\n");
  const destination = path.join(root, "render");
  t.mock.property(process, "platform", "win32");

  copyDeckForRender(deckPath, destination);

  assert.deepEqual(fs.readdirSync(path.join(destination, "assets")), [
    "image.svg",
  ]);
  assert.deepEqual(fs.readdirSync(path.join(destination, "alias")), [
    "image.svg",
  ]);
  assert.equal(
    fs.readFileSync(path.join(destination, "alias/image.svg"), "utf8"),
    "image",
  );
  assert.equal(fs.existsSync(path.join(destination, "self")), false);
});

test("Windows render copies propagate permission errors when reading link targets", (t) => {
  const root = makeDeck({ "deck/slide.md": "# Deck\n", "target.svg": "image" });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dir = path.join(root, "deck");
  const link = path.join(dir, "linked.svg");
  fs.symlinkSync("../target.svg", link, "file");
  const denied = Object.assign(new Error("target unreadable"), {
    code: "EACCES",
  });
  const statSync = fs.statSync;
  t.mock.property(process, "platform", "win32");
  t.mock.method(fs, "statSync", (source, ...args) => {
    if (source === link) throw denied;
    return statSync(source, ...args);
  });

  assert.throws(
    () =>
      copyDeckForRender(path.join(dir, "slide.md"), path.join(root, "render")),
    (error) => error === denied,
  );
});

test("non-Windows render copies preserve links to their original source bases", (t) => {
  const root = makeDeck({
    "deck/slide.md": "# Deck\n",
    "assets/image.svg": "image",
  });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dir = path.join(root, "deck");
  fs.symlinkSync("../assets", path.join(dir, "shared"), "dir");
  const destination = path.join(root, "render");
  t.mock.property(process, "platform", "linux");

  copyDeckForRender(path.join(dir, "slide.md"), destination);

  assert.equal(
    fs.lstatSync(path.join(destination, "shared")).isSymbolicLink(),
    true,
  );
  assert.equal(
    fs.readFileSync(path.join(destination, "shared/image.svg"), "utf8"),
    "image",
  );
});

for (const platform of ["linux", "win32"]) {
  test(`copyDeckForRender skips unused export artifacts on ${platform}`, (t) => {
    t.mock.property(process, "platform", platform);
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
        '# One\n\n![](assets/img/a.png)\n<video src="assets/video/clip.mp4"></video>\n',
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
      assert.deepEqual(fs.readdirSync(path.join(destination, "assets/video")), [
        "clip.mp4",
      ]);
      assert.deepEqual(fs.readdirSync(path.join(destination, "report")), []);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      fs.rmSync(destination, { recursive: true, force: true });
    }
  });

  test(`copyDeckForRender keeps an embedded PDF on ${platform}`, (t) => {
    t.mock.property(process, "platform", platform);
    const dir = makeDeck({
      "assets/doc.pdf": "pdf",
      "assets/other.pdf": "pdf",
    });
    const destination = `${dir}-copy`;

    try {
      const deckPath = writeSlide(
        dir,
        '# One\n\n<object data="assets/doc.pdf"></object>\n',
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
}
