#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { compareAudit } = require("../src/dependency-audit");
const { enforceSupportedNodeRuntime } = require("../src/runtime-version");

enforceSupportedNodeRuntime();

function readReport(args) {
    if (args.length === 2 && args[0] === "--report") {
        return JSON.parse(fs.readFileSync(args[1], "utf8"));
    }
    if (args.length)
        throw new Error(
            "Usage: audit-dependencies.js [--report <saved-audit.json>]",
        );
    const npmScript = process.env.npm_execpath;
    const command = npmScript
        ? process.execPath
        : process.platform === "win32"
          ? "npm.cmd"
          : "npm";
    const result = spawnSync(
        command,
        [
            ...(npmScript ? [npmScript] : []),
            "audit",
            "--omit=dev",
            "--json",
            "--fetch-retries=0",
        ],
        {
            cwd: path.resolve(__dirname, ".."),
            encoding: "utf8",
            timeout: 60000,
            maxBuffer: 8 * 1024 * 1024,
            shell: command === "npm.cmd",
        },
    );
    if (result.error || ![0, 1].includes(result.status)) {
        throw new Error(
            `npm audit failed: ${result.error?.message || result.stderr || result.signal || result.status}`,
        );
    }
    return JSON.parse(result.stdout);
}

try {
    const baseline = require("../.github/dependency-audit-baseline.json");
    const report = readReport(process.argv.slice(2));
    const { regressions, resolved } = compareAudit(report, baseline);
    for (const name of resolved)
        console.log(
            `Resolved: ${name}; remove its baseline entry after review.`,
        );
    if (regressions.length) {
        for (const message of regressions) console.error(message);
        console.error(
            "Review the findings and update ISS-0042 before changing the audit baseline.",
        );
        process.exitCode = 1;
    } else {
        console.log(
            `Dependency audit matches the reviewed ISS-0042 baseline (${Object.keys(report.vulnerabilities).length} affected packages).`,
        );
    }
} catch (error) {
    console.error(`Dependency audit failed: ${error.message}`);
    process.exitCode = 1;
}
