const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "../..");
const cliEntry = fs.realpathSync(
  path.join(repoRoot, "node_modules/@marp-team/marp-cli/marp-cli.js"),
);
const browser = String.raw`C:\Program Files\Chrome & Edge (test)\chrome.exe`;

function setup(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "marpx-launch-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const deckDir = path.join(root, "deck & (literal) ^ %PATH% $;");
  fs.mkdirSync(deckDir);
  const deck = path.join(deckDir, "slide & (one).md");
  fs.writeFileSync(deck, "---\nmarp: true\n---\n# One\n");
  const override = path.join(root, "custom marp & (literal) ^ %PATH% $.exe");
  fs.writeFileSync(override, "");
  const capture = path.join(root, "launch.json");
  const preload = path.join(root, "capture.cjs");
  // Exercise the real async runner and sync supervisor, stopping only at the
  // Marp spawn boundary so no installed browser or Windows shell is needed.
  fs.writeFileSync(
    preload,
    `const fs = require("node:fs");
const path = require("node:path");
const { EventEmitter } = require("node:events");
require(${JSON.stringify(path.join(repoRoot, "src/marp-browser"))}).marpBrowserArgs =
  () => ["--browser-path", ${JSON.stringify(browser)}];
require("node:child_process").spawn = (file, args, options) => {
  fs.writeFileSync(${JSON.stringify(capture)}, JSON.stringify({
    file, args, options: { ...options, env: options.env || process.env },
  }));
  if (args.includes("--images") && !args.includes("-o")) {
    const deck = args.find(arg => arg.endsWith(".md"));
    fs.writeFileSync(deck.replace(/\\.md$/, ".001.png"), "image");
  } else if (args.includes("-o")) {
    fs.writeFileSync(args[args.indexOf("-o") + 1], "<section>One</section>");
  }
  const child = new EventEmitter();
  process.nextTick(() => child.emit("close", 0));
  return child;
};
`,
  );
  const env = {
    ...process.env,
    MARP_AGENT_MARP_BIN: "",
    NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --require ${JSON.stringify(preload)}`,
  };
  return {
    root,
    deck,
    override,
    env,
    run(args, extraEnv = {}) {
      const result = spawnSync(process.execPath, args, {
        cwd: repoRoot,
        env: { ...env, ...extraEnv },
        encoding: "utf8",
        timeout: 10000,
      });
      assert.equal(result.error, undefined, result.error?.message);
      assert.equal(result.status, 0, result.stderr);
      return JSON.parse(fs.readFileSync(capture, "utf8"));
    },
  };
}

function assertCommand(launch, override) {
  assert.equal(launch.file, override || process.execPath);
  if (!override) assert.equal(launch.args[0], cliEntry);
  assert.ok(!launch.options.shell, "Marp must launch without a shell");
}

for (const mode of ["pdf", "pptx", "html", "images", "preview"]) {
  for (const custom of [false, true]) {
    test(`${mode} launches ${custom ? "the configured executable" : "Node plus the JS CLI"} with literal arguments`, (t) => {
      const fixture = setup(t);
      const deck = String.raw`C:\slides with spaces\a & (b) ^ %PATH% $;.md`;
      const output = path.join(fixture.root, "out & (one) ^ %PATH% $.html");
      const args = ["bin/marpx.js", deck, `--${mode}`];
      if (mode === "images") args.push("png");
      if (mode !== "preview") args.push("--output", output);
      const launch = fixture.run(
        args,
        custom ? { MARP_AGENT_MARP_BIN: fixture.override } : {},
      );
      assertCommand(launch, custom && fixture.override);
      assert.deepEqual(launch.args.slice(custom ? 0 : 1), [
        ...(mode === "html" ? [] : ["--browser-path", browser]),
        "--config",
        path.join(repoRoot, "marp.config.js"),
        ...(mode === "html" ? [] : [`--${mode}`]),
        ...(mode === "images" ? ["png"] : []),
        ...(mode === "preview" ? [] : ["--allow-local-files", "-o", output]),
        deck,
      ]);
    });
  }
}

for (const custom of [false, true]) {
  test(`render validation launches ${custom ? "its environment override" : "Node plus the JS CLI"} and cleans temporary HTML`, (t) => {
    const fixture = setup(t);
    const launch = fixture.run([
      "-e",
      `const fs = require("node:fs");
const { renderToHtml } = require("./src/visual-overflow");
const rendered = renderToHtml(process.argv[1], {
  env: { ...process.env, MARP_AGENT_MARP_BIN: process.argv[2] },
});
try { fs.readFileSync(rendered.htmlPath); }
finally { fs.rmSync(rendered.tempRoot, { recursive: true, force: true }); }`,
      fixture.deck,
      custom ? fixture.override : "",
    ]);
    assertCommand(launch, custom && fixture.override);
    const copiedDeck = launch.args.at(-3);
    assert.equal(path.basename(copiedDeck), path.basename(fixture.deck));
    assert.equal(
      path.basename(path.dirname(copiedDeck)),
      path.basename(path.dirname(fixture.deck)),
    );
    assert.ok(launch.args.includes("bare"));
    assert.equal(fs.existsSync(launch.options.cwd), false);
  });

  test(`validation image export launches ${custom ? "the configured executable" : "Node plus the JS CLI"} and preserves screenshot mapping`, (t) => {
    const fixture = setup(t);
    const report = path.join(fixture.root, "report & (one)");
    const launch = fixture.run(
      [
        "-e",
        `require("./src/deck-validator").defaultImageExporter({
  deckPath: process.argv[1], reportDir: process.argv[2], slideNumbers: [1],
  slideMap: [{ slide: 1, renderedSlide: 1 }],
});`,
        fixture.deck,
        report,
      ],
      custom ? { MARP_AGENT_MARP_BIN: fixture.override } : {},
    );
    assertCommand(launch, custom && fixture.override);
    assert.deepEqual(launch.args.slice(-3), [
      "--browser-path",
      browser,
      path.join(launch.options.cwd, path.basename(fixture.deck)),
    ]);
    assert.equal(
      fs.readFileSync(path.join(report, "screenshots/slide-001.png"), "utf8"),
      "image",
    );
    assert.equal(fs.existsSync(launch.options.cwd), false);
  });

  test(`portable export launches ${custom ? "its environment override" : "Node plus the JS CLI"} and cleans the render stage`, (t) => {
    const fixture = setup(t);
    const output = path.join(fixture.root, "out & (one).zip");
    const launch = fixture.run([
      "-e",
      `require("./src/portable-export").exportPortableBundle({
  deckPath: process.argv[1], outputPath: process.argv[2], dryRun: true,
  repoRoot: require("node:path").dirname(process.argv[1]),
  env: { ...process.env, MARP_AGENT_MARP_BIN: process.argv[3] },
});`,
      fixture.deck,
      output,
      custom ? fixture.override : "",
    ]);
    assertCommand(launch, custom && fixture.override);
    assert.equal(launch.args.at(-1), fixture.deck);
    assert.equal(launch.options.env.MARP_AGENT_D2_STRICT, "1");
    const temporary = launch.args[launch.args.indexOf("-o") + 1];
    assert.equal(fs.existsSync(path.dirname(temporary)), false);
    assert.equal(fs.existsSync(output), false);
  });
}
