const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const {
  copyDeckForRender,
  findMissingAssets,
} = require("../../src/media-assets");
const { collectDeckReferences } = require("../../src/media-reference-graph");
const { buildMediaCatalog } = require("../../src/media-catalog");
const { planPortableBundle } = require("../../src/portable-bundle");
const toolRoot = path.resolve(__dirname, "../..");

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "shared project # % "));
  const deck = path.join(root, "decks/nested/talk");
  fs.mkdirSync(deck, { recursive: true });
  fs.mkdirSync(path.join(root, "assets/css"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "assets/logo.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect width="120" height="60" fill="blue"/></svg>',
  );
  fs.writeFileSync(
    path.join(root, "assets/css/site.css"),
    "section{background-image:url(../logo.svg)}",
  );
  const file = path.join(deck, "slide.md");
  fs.writeFileSync(
    file,
    "---\nmarp: true\ntheme: lab\nstyle: |\n  section { --logos-dark: url(shared/logo.svg); }\n---\n## Shared assets\n\n![w:120](shared/logo.svg)\n",
  );
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { root, deck, file };
}

test("source diagnostics and the media catalog agree on virtual shared resources", (t) => {
  const { root, file } = fixture(t);
  assert.deepEqual(findMissingAssets(file), []);
  const references = collectDeckReferences(file, undefined, {
    repoRoot: root,
    policy: "bundle",
  });
  assert.ok(references.length > 0);
  assert.ok(
    references.every(
      (ref) =>
        ref.allowed &&
        ref.realPath ===
          fs.realpathSync.native(path.join(root, "assets/logo.svg")),
    ),
  );
  const catalog = buildMediaCatalog({ repoRoot: root, metadata: false });
  const logo = catalog.assets.find((asset) => asset.path === "assets/logo.svg");
  assert.ok(logo.references.length > 0);
});

test("canonical shared directory links accept Windows junction targets", (t) => {
  const { root, deck, file } = fixture(t);
  const alias = `${root}-alias`;
  const linkType = process.platform === "win32" ? "junction" : "dir";
  fs.symlinkSync(root, alias, linkType);
  t.after(() => fs.rmSync(alias, { recursive: true, force: true }));
  fs.symlinkSync(
    path.join(alias, "assets"),
    path.join(deck, "shared"),
    linkType,
  );
  const references = collectDeckReferences(file, undefined, {
    repoRoot: root,
    policy: "bundle",
  });
  assert.ok(references.length > 0);
  assert.ok(
    references.every((ref) => ref.allowed),
    JSON.stringify(references),
  );
});

test("canonical shared links still reject project assets redirected outside the root", (t) => {
  const { root, deck, file } = fixture(t);
  const outside = `${root}-outside`;
  fs.renameSync(path.join(root, "assets"), outside);
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  const linkType = process.platform === "win32" ? "junction" : "dir";
  fs.symlinkSync(outside, path.join(root, "assets"), linkType);
  fs.symlinkSync(
    path.join(root, "assets"),
    path.join(deck, "shared"),
    linkType,
  );
  const references = collectDeckReferences(file, undefined, {
    repoRoot: root,
    policy: "bundle",
  });
  assert.ok(references.length > 0);
  assert.ok(
    references.every(
      (ref) =>
        !ref.allowed &&
        ref.diagnostics.some((item) => item.code === "outside-repo"),
    ),
    JSON.stringify(references),
  );
});

test("temporary render copies materialize shared without ever creating symlinks", (t) => {
  const { root, deck, file } = fixture(t);
  t.mock.method(fs, "symlinkSync", () => {
    throw Object.assign(new Error("denied"), { code: "EPERM" });
  });
  const target = path.join(root, "render");
  copyDeckForRender(file, target);
  assert.equal(fs.lstatSync(path.join(target, "shared")).isDirectory(), true);
  assert.equal(
    fs.lstatSync(path.join(target, "shared")).isSymbolicLink(),
    false,
  );
  assert.equal(fs.existsSync(path.join(deck, "shared")), false);
  assert.deepEqual(findMissingAssets(path.join(target, "slide.md")), []);
});

test("portable bundles collect virtual shared CSS dependencies and relocate ordinary files", (t) => {
  const { root, file } = fixture(t);
  const plan = planPortableBundle({
    repoRoot: root,
    deckPath: file,
    html: '<section><link rel="stylesheet" href="shared/css/site.css"><img src="shared/logo.svg"></section>',
  });
  assert.deepEqual(plan.errors, []);
  assert.ok(
    plan.manifest.files.some(
      (resource) => resource.source === "assets/logo.svg",
    ),
  );
  assert.ok(
    plan.manifest.files.some(
      (resource) => resource.source === "assets/css/site.css",
    ),
  );
});

test("the real HTML CLI resolves shared without modifying the source project", (t) => {
  const { deck, file } = fixture(t);
  const output = path.join(deck, "slide.html");
  execFileSync(
    process.execPath,
    [path.join(toolRoot, "bin/marpx.js"), file, "--html", "--output", output],
    {
      cwd: toolRoot,
      env: process.env,
      stdio: "pipe",
      timeout: 30000,
    },
  );
  const html = fs.readFileSync(output, "utf8");
  assert.match(html, /\.\.\/\.\.\/\.\.\/assets\/logo\.svg/);
  assert.equal(fs.existsSync(path.join(deck, "shared")), false);
});
