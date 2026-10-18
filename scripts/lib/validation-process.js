const { spawnSync } = require("node:child_process");

function runValidation({
  repoRoot,
  validateScript,
  deckPath,
  strictVisual = false,
  run = spawnSync,
}) {
  const args = [validateScript, deckPath, "--format", "json"];
  if (strictVisual) args.push("--strict-visual");
  const result = run(process.execPath, args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.stderr) process.stderr.write(result.stderr);
  if (
    result.error ||
    result.signal ||
    ![0, 1].includes(result.status) ||
    !result.stdout
  ) {
    const reason =
      result.error?.code || result.signal || `exit ${result.status}`;
    throw new Error(`Validation did not complete for ${deckPath}: ${reason}.`);
  }
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`Invalid validator JSON for ${deckPath}: ${error.message}`);
  }
  if (strictVisual && report?.visualCheck?.status !== "measured") {
    throw new Error(
      `Strict visual validation requires a measured report for ${deckPath}.`,
    );
  }
  return { status: result.status, report };
}

module.exports = { runValidation };
