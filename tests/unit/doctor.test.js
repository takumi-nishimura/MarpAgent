const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.join(__dirname, "../..");

test("doctor reports checks in json format", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/doctor.js", "--format", "json"],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(Array.isArray(payload.checks), true);
  assert.equal(payload.checks.length > 0, true);
  assert.equal(
    payload.checks.some((check) => check.name === "node-runtime"),
    true,
  );
  const engine = payload.checks.find((check) => check.name === "marp-engine");
  assert.equal(engine?.status, "pass");
  assert.equal(
    engine.version,
    require("@marp-team/marp-core/package.json").version,
  );
  assert.deepEqual(engine.features, [
    "shiki",
    "line-highlight",
    "katex",
    "mathjax",
    "mermaid-math",
    "mermaid-native",
  ]);
});

test("doctor rejects a configured engine that drops rendering features", () => {
  const { checkConfiguredEngine } = require("../../scripts/doctor");
  const { Marp } = require("@marp-team/marp-core/full");
  const marp = new Marp();
  marp.render = () => ({ html: "<p>Fallback</p>" });
  assert.throws(
    () => checkConfiguredEngine({ createMarp: () => marp }),
    /Shiki did not render/,
  );
});

test("doctor rejects a configured engine from another Core installation", () => {
  const { checkConfiguredEngine } = require("../../scripts/doctor");
  assert.throws(
    () => checkConfiguredEngine({ createMarp: () => ({}) }),
    /configured engine is not the installed full Core/,
  );
});
