const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const {
  findProjectRoot,
  sharedAssets,
  resolveSharedPath,
  rewriteSharedResources,
} = require("../../src/shared-assets");

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "marpx-shared-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const deck = path.join(root, "decks", "nested", "talk");
  fs.mkdirSync(deck, { recursive: true });
  fs.mkdirSync(path.join(root, "assets", "logos"), { recursive: true });
  fs.writeFileSync(path.join(root, "assets/logos/logo.svg"), "global");
  return { root, deck };
}

test("an absent shared directory resolves to project assets at any deck depth", (t) => {
  const { root, deck } = fixture(t);
  assert.equal(findProjectRoot(deck), root);
  assert.equal(sharedAssets(deck).directory, path.join(root, "assets"));
  assert.equal(
    resolveSharedPath(path.join(deck, "shared/logos/logo.svg"), deck),
    path.join(root, "assets/logos/logo.svg"),
  );
  assert.equal(fs.existsSync(path.join(deck, "shared")), false);
});

test("a materialized shared directory is authoritative including missing files", (t) => {
  const { root, deck } = fixture(t);
  fs.mkdirSync(path.join(deck, "shared/logos"), { recursive: true });
  fs.writeFileSync(path.join(deck, "shared/logos/local.svg"), "local");
  assert.equal(sharedAssets(deck).directory, path.join(deck, "shared"));
  const result = resolveSharedPath(
    path.join(deck, "shared/logos/logo.svg"),
    deck,
    root,
  );
  assert.equal(result, path.join(deck, "shared/logos/logo.svg"));
  assert.equal(fs.existsSync(result), false);
});

test("legacy directory links remain usable and broken links remain errors", (t) => {
  const { root, deck } = fixture(t);
  try {
    fs.symlinkSync(
      path.relative(deck, path.join(root, "assets")),
      path.join(deck, "shared"),
      "dir",
    );
  } catch (error) {
    if (process.platform === "win32" && error.code === "EPERM") {
      t.skip(
        "Native symlink creation is unavailable; the alias tests require no links.",
      );
      return;
    }
    throw error;
  }
  assert.equal(sharedAssets(deck).virtual, false);
  assert.equal(
    fs.readFileSync(
      resolveSharedPath(path.join(deck, "shared/logos/logo.svg"), deck),
      "utf8",
    ),
    "global",
  );
  fs.unlinkSync(path.join(deck, "shared"));
  fs.symlinkSync("missing", path.join(deck, "shared"), "dir");
  assert.throws(() => sharedAssets(deck), /shared.*directory|broken.*shared/i);
});

test("an ordinary shared file is never guessed to be an alias", (t) => {
  const { deck } = fixture(t);
  fs.writeFileSync(path.join(deck, "shared"), "../../../assets");
  assert.throws(() => sharedAssets(deck), /shared.*directory|shared.*file/i);
});

test("a Git symlink placeholder is recognized only for canonical project assets", (t) => {
  const { root, deck } = fixture(t);
  execFileSync("git", ["init", "-q", root]);
  const link = path.join(deck, "shared");
  const target = path
    .relative(deck, path.join(root, "assets"))
    .split(path.sep)
    .join("/");
  const blob = execFileSync(
    "git",
    ["-C", root, "hash-object", "-w", "--stdin"],
    { input: target, encoding: "utf8" },
  ).trim();
  execFileSync("git", ["-C", root, "config", "core.symlinks", "false"]);
  execFileSync("git", [
    "-C",
    root,
    "update-index",
    "--add",
    "--cacheinfo",
    "120000",
    blob,
    path.relative(root, link).split(path.sep).join("/"),
  ]);
  fs.writeFileSync(link, target);
  assert.equal(sharedAssets(deck).virtual, true);
  assert.equal(
    resolveSharedPath(path.join(deck, "shared/logos/logo.svg"), deck),
    path.join(root, "assets/logos/logo.svg"),
  );
  fs.writeFileSync(link, "../../../other-assets");
  assert.throws(() => sharedAssets(deck), /shared.*directory|shared.*file/i);
});

test("shared rendering rewrites media and CSS without changing code or citations", (t) => {
  const { deck } = fixture(t);
  const source =
    '<img src="shared/logos/a%20%23.svg?version=1#icon"><style>section{background:url(shared/logos/logo.svg)}</style><pre>shared/logos/logo.svg</pre><script>const x="shared/logos/logo.svg";</script><a href="https://example.com/shared/a">Source</a>';
  const result = rewriteSharedResources(source, { deckDir: deck });
  assert.match(
    result,
    /src="\.\.\/\.\.\/\.\.\/assets\/logos\/a%20%23\.svg\?version=1#icon"/,
  );
  assert.match(result, /url\("\.\.\/\.\.\/\.\.\/assets\/logos\/logo\.svg"\)/);
  assert.ok(result.includes("<pre>shared/logos/logo.svg</pre>"));
  assert.ok(result.includes('const x="shared/logos/logo.svg";'));
  assert.ok(result.includes('href="https://example.com/shared/a"'));
  assert.equal(
    rewriteSharedResources(source, { deckDir: deck, http: true }),
    source,
  );
});

test("rendering leaves materialized shared references relative for plain Marp", (t) => {
  const { deck } = fixture(t);
  fs.mkdirSync(path.join(deck, "shared"));
  const source = '<img src="shared/logos/logo.svg">';
  assert.equal(rewriteSharedResources(source, { deckDir: deck }), source);
});
