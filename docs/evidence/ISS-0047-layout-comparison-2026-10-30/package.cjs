// Save a bounded, inspectable subset without rewriting any previous capture.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { gzipSync } = require("node:zlib");
const { spawnSync } = require("node:child_process");
const { parseArgs } = require("node:util");
const { values: args } = parseArgs({ options: { run: { type: "string" }, output: { type: "string" } } });
assert(args.run && args.output, "Pass --run COMPLETED_RUN --output NEW_DIRECTORY");
assert(!fs.existsSync(args.output), "Never overwrite archived evidence");
const bytes = fs.readFileSync(path.join(args.run, "result.json"));
const result = JSON.parse(bytes);
assert.equal(result.trials.length, 993);
assert.equal(result.comparisons.length, 63);
assert(result.comparisons.every((row) => row.legacy?.fits && row.body.fits));
fs.mkdirSync(path.join(args.output, "figures"), { recursive: true });
fs.mkdirSync(path.join(args.output, "inputs"));
fs.writeFileSync(path.join(args.output, "all-trials.json.gz"), gzipSync(bytes, { level: 9 }));
const summary = {
    conditions: result.conditions,
    fontUse: result.fontUse,
    trialCount: result.trials.length,
    comparisons: result.comparisons.map((row) => {
        const candidates = result.trials.filter((trial) => trial.theme === row.theme && trial.case === row.case);
        const compact = (id) => {
            const trial = candidates.find((trial) => trial.id === id);
            if (!trial) return null;
            const { typography, ...metrics } = trial.metrics;
            return { id, counts: trial.counts, inputSha256: trial.inputSha256, metrics };
        };
        return { ...row, measurements: {
            natural: compact(candidates[0].id), legacy: compact(row.legacy.candidate), bodyDefault: compact("body"),
            body: compact(row.body.candidate), heightAlternative: compact("height-460"),
        } };
    }),
    images: [],
};
for (const theme of ["lab", "muji", "toshiba"]) {
    for (const method of ["legacy", "body"]) fs.copyFileSync(path.join(args.run, "inputs", `${theme}-${method}.md`), path.join(args.output, "inputs", `${theme}-${method}.md.txt`));
    const diff = spawnSync("diff", ["-u", "--label", `legacy/${theme}`, "--label", `body/${theme}`,
        path.join(args.output, "inputs", `${theme}-legacy.md.txt`), path.join(args.output, "inputs", `${theme}-body.md.txt`)], { encoding: "utf8" });
    assert(!diff.error && [0, 1].includes(diff.status), diff.error?.message || diff.stderr);
    fs.writeFileSync(path.join(args.output, "inputs", `${theme}.patch`), diff.stdout);
    const selected = ["columns-portrait--heading", "columns-portrait--caption"];
    if (theme === "lab") selected.push("figure-standard--base", "columns-standard--base", "stack-standard--base", "results-standard--base", "results-footnote-wrap--caption");
    if (theme === "muji") selected.push("figure-standard--caption", "stack-standard--caption", "results-footnote-wrap--caption");
    if (theme === "toshiba") selected.push("figure-standard--caption", "columns-standard--caption", "results-standard--caption", "stack-taller-media--heading");
    for (const id of selected) for (const method of ["legacy", "body"]) {
        const filename = `${theme}--${id}--${method}.png`;
        fs.copyFileSync(path.join(args.run, "figures", filename), path.join(args.output, "figures", filename));
        summary.images.push({ theme, case: id, method, file: `figures/${filename}` });
    }
}
fs.writeFileSync(path.join(args.output, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(`Archived ${summary.images.length} PNGs, 63 comparisons, 993 trials, and six sources.`);
