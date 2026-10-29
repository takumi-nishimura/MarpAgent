const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");
const YAML = require("yaml");

const repoRoot = path.resolve(__dirname, "../..");
const workflow = YAML.parse(
    fs.readFileSync(
        path.join(repoRoot, ".github/workflows/quality-gate.yml"),
        "utf8",
    ),
);
const job = workflow.jobs["quality-gate"];
const steps = job.steps;
const selector = steps.find((step) => step.id === "changes");
const packageJson = require("../../package.json");

function temporaryDirectory(t) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "marp-ci-"));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    return directory;
}

function run(command, args, cwd, env = {}) {
    return spawnSync(command, args, {
        cwd,
        env: { ...process.env, ...env },
        encoding: "utf8",
        timeout: 30000,
    });
}

function git(cwd, ...args) {
    const result = run(
        "git",
        [
            "-c",
            "user.name=CI Test",
            "-c",
            "user.email=ci@example.invalid",
            "-c",
            "commit.gpgSign=false",
            "-c",
            "core.hooksPath=/dev/null",
            ...args,
        ],
        cwd,
    );
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
}

function write(directory, filename, content = "changed\n") {
    const target = path.join(directory, filename);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
}

function commit(directory) {
    git(directory, "add", ".");
    git(directory, "commit", "-m", "fixture");
    return git(directory, "rev-parse", "HEAD");
}

function repository(t) {
    const directory = temporaryDirectory(t);
    git(directory, "init", "--initial-branch=main");
    write(directory, "src/engine.js", "original\n");
    const base = commit(directory);
    return { directory, base };
}

function context(event, base = "", head = "", engine = "") {
    return {
        github: {
            workflow: "Quality Gate",
            event_name: event,
            event: {
                before: event === "push" ? base : "",
                pull_request: {
                    number: event === "pull_request" ? 64 : "",
                    base: { sha: event === "pull_request" ? base : "" },
                    head: { sha: event === "pull_request" ? head : "" },
                },
            },
            sha: event === "pull_request" ? "checkout-merge-sha" : head,
            ref: "refs/heads/main",
            run_id: "100",
        },
        steps: { changes: { outputs: { engine } } },
    };
}

// These workflow expressions use the common JS/GitHub boolean subset only.
// actionlint separately validates GitHub's expression syntax and contexts.
function evaluate(expression, values) {
    if (expression === undefined) return true;
    return vm.runInNewContext(
        expression.replace(/^\$\{\{\s*|\s*\}\}$/g, ""),
        values,
        { timeout: 1000 },
    );
}

function select(t, directory, event, base, head, env = {}) {
    const output = path.join(temporaryDirectory(t), "output");
    const values = context(event, base, head);
    const resolvedEnv = Object.fromEntries(
        Object.entries(selector.env).map(([key, value]) => [
            key,
            evaluate(value, values),
        ]),
    );
    const result = run(
        "bash",
        ["--noprofile", "--norc", "-eo", "pipefail", "-c", selector.run],
        directory,
        {
            ...resolvedEnv,
            GITHUB_OUTPUT: output,
            ...env,
        },
    );
    return {
        ...result,
        output: fs.existsSync(output) ? fs.readFileSync(output, "utf8") : "",
    };
}

for (const event of ["pull_request", "push"]) {
    for (const [name, files, expected] of [
        ["docs", ["docs/guide.md"], false],
        ["deck", ["decks/demo/assets/a b.txt"], false],
        ["engine", ["src/engine.js"], true],
        ["mixed", ["docs/guide.md", "src/engine.js"], true],
        ["workflow", [".github/workflows/quality-gate.yml"], true],
        ["record tooling", [".github/records.py"], true],
        ["unchanged", [], false],
    ]) {
        test(`${event}: ${name} changes select engine=${expected}`, (t) => {
            const { directory, base } = repository(t);
            for (const filename of files) write(directory, filename);
            const head = files.length ? commit(directory) : base;
            const result = select(t, directory, event, base, head);
            assert.equal(result.status, 0, result.stderr);
            assert.equal(result.output, `engine=${expected}\n`);
        });
    }
}

test("selection uses event endpoints, not checkout HEAD or only its last commit", (t) => {
    const { directory, base } = repository(t);
    write(directory, "src/engine.js");
    commit(directory);
    write(directory, "docs/guide.md");
    const head = commit(directory);
    assert.equal(
        select(t, directory, "push", base, head).output,
        "engine=true\n",
    );
    write(directory, "docs/guide.md", "next\n");
    const docsHead = commit(directory);
    write(directory, "src/engine.js", "checkout-only change\n");
    commit(directory);
    assert.equal(
        select(t, directory, "pull_request", head, docsHead).output,
        "engine=false\n",
    );
});

test("deleted and renamed engine paths cannot hide inside docs", (t) => {
    for (const operation of ["delete", "rename"]) {
        const { directory, base } = repository(t);
        if (operation === "delete")
            fs.unlinkSync(path.join(directory, "src/engine.js"));
        else {
            fs.mkdirSync(path.join(directory, "docs"));
            fs.renameSync(
                path.join(directory, "src/engine.js"),
                path.join(directory, "docs/engine.md"),
            );
        }
        const result = select(
            t,
            directory,
            "pull_request",
            base,
            commit(directory),
        );
        assert.equal(result.status, 0, result.stderr);
        assert.equal(result.output, "engine=true\n");
    }
});

test("diverged endpoint trees conservatively select base-side engine changes", (t) => {
    const { directory, base } = repository(t);
    write(directory, "src/engine.js");
    const advancedBase = commit(directory);
    git(directory, "checkout", "--detach", base);
    write(directory, "docs/guide.md");
    const result = select(
        t,
        directory,
        "pull_request",
        advancedBase,
        commit(directory),
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.output, "engine=true\n");
});

test("manual runs and unknown/initial push bases conservatively select the engine", (t) => {
    for (const [event, base] of [
        ["workflow_dispatch", ""],
        ["push", ""],
        ["push", "0".repeat(40)],
    ]) {
        const result = select(t, temporaryDirectory(t), event, base, "");
        assert.equal(result.status, 0, result.stderr);
        assert.equal(result.output, "engine=true\n");
    }
});

test("shallow checkouts fetch both missing event endpoints from origin", (t) => {
    const { directory: origin, base } = repository(t);
    write(origin, "docs/guide.md");
    const head = commit(origin);
    write(origin, "src/engine.js");
    commit(origin);
    const directory = temporaryDirectory(t);
    git(directory, "clone", "--depth=1", `file://${origin}`, ".");
    for (const revision of [base, head]) {
        assert.notEqual(
            run("git", ["cat-file", "-e", `${revision}^{commit}`], directory)
                .status,
            0,
        );
    }
    const result = select(t, directory, "pull_request", base, head);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.output, "engine=false\n");
});

test("failed endpoint fetches and diff errors fail closed without a selection", (t) => {
    const { directory, base } = repository(t);
    for (const [before, head] of [
        [base, "a".repeat(40)],
        ["a".repeat(40), base],
        [base, ""],
    ]) {
        const missing = select(t, directory, "push", before, head);
        assert.notEqual(missing.status, 0);
        assert.equal(missing.output, "");
    }

    const shim = temporaryDirectory(t);
    write(
        shim,
        "git",
        '#!/bin/bash\nif [[ "$1" == diff ]]; then exit 2; fi\nexec "$REAL_GIT" "$@"\n',
    );
    fs.chmodSync(path.join(shim, "git"), 0o755);
    const realGit = run(
        "bash",
        ["-c", "command -v git"],
        directory,
    ).stdout.trim();
    const failedDiff = select(t, directory, "push", base, base, {
        PATH: `${shim}${path.delimiter}${process.env.PATH}`,
        REAL_GIT: realGit,
    });
    assert.equal(failedDiff.status, 2, failedDiff.stderr);
    assert.equal(failedDiff.output, "");
});

test("record validation blocks duplicate XR IDs on docs-only changes without npm", (t) => {
    const recordStep = steps.find(
        (step) => step.run === "uv run .github/records.py validate",
    );
    assert.ok(
        recordStep,
        "record integrity must run before engine installation",
    );
    assert.equal(recordStep.if, undefined);
    assert.equal(recordStep["continue-on-error"], undefined);
    const uvStep = steps.find((step) =>
        step.uses?.startsWith("astral-sh/setup-uv@"),
    );
    assert.ok(uvStep);
    assert.equal(uvStep.if, undefined);
    assert.ok(steps.indexOf(uvStep) < steps.indexOf(recordStep));
    assert.ok(
        steps.indexOf(recordStep) <
            steps.findIndex((step) => step.run === "npm ci"),
    );

    const { directory } = repository(t);
    for (const kind of ["decisions", "explorations", "issues"]) {
        fs.mkdirSync(path.join(directory, "docs", kind), { recursive: true });
    }
    write(
        directory,
        ".github/records.py",
        fs.readFileSync(path.join(repoRoot, ".github/records.py")),
    );
    const record = fs
        .readFileSync(
            path.join(repoRoot, "docs/explorations/template.md"),
            "utf8",
        )
        .replace("XR-0000", "XR-0003")
        .replace("YYYY-MM-DD", "2026-10-29");
    write(directory, "docs/explorations/XR-0003-original.md", record);
    const base = commit(directory);
    // CI has already resolved the canonical validator's pinned dependencies.
    // Reuse that cache instead of contacting a registry for each fixture copy.
    const validate = () =>
        run("bash", ["-eo", "pipefail", "-c", recordStep.run], directory, {
            UV_OFFLINE: "1",
        });
    const valid = validate();
    assert.equal(valid.status, 0, valid.stderr);
    assert.match(valid.stdout, /Validated 1 record/);

    write(directory, "docs/explorations/XR-0003-duplicate.md", record);
    const result = select(
        t,
        directory,
        "pull_request",
        base,
        commit(directory),
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.output, "engine=false\n");
    assert.equal(fs.existsSync(path.join(directory, "node_modules")), false);
    const duplicate = validate();
    assert.equal(duplicate.status, 1, duplicate.stderr);
    assert.match(duplicate.stdout + duplicate.stderr, /duplicate id XR-0003/);

    fs.unlinkSync(
        path.join(directory, "docs/explorations/XR-0003-duplicate.md"),
    );
    write(
        directory,
        "docs/explorations/XR-0003-original.md",
        record.replace("evaluates: []", "evaluates: [XR-9999]"),
    );
    const dangling = validate();
    assert.equal(dangling.status, 1, dangling.stderr);
    assert.match(dangling.stdout + dangling.stderr, /unknown record XR-9999/);

    write(
        directory,
        "docs/explorations/XR-0003-original.md",
        "---\nid: [\n---\n",
    );
    const malformed = validate();
    assert.equal(malformed.status, 1, malformed.stderr);
    assert.match(
        malformed.stdout + malformed.stderr,
        /expected the node content/,
    );
});

test("automatic checks stay light and manual checks reach every full acceptance command", () => {
    assert.deepEqual(Object.keys(workflow.on).sort(), [
        "pull_request",
        "push",
        "workflow_dispatch",
    ]);
    assert.equal(workflow.on.pull_request, null);
    assert.deepEqual(workflow.on.push, { branches: ["main"] });
    assert.equal(job.if, undefined);
    assert.equal(job["continue-on-error"], undefined);
    for (const step of steps)
        assert.equal(step["continue-on-error"], undefined);

    const commands = (event, engine) =>
        steps
            .filter((step) => evaluate(step.if, context(event, "", "", engine)))
            .map((step) => step.run)
            .filter(Boolean);
    for (const event of ["pull_request", "push"]) {
        const docs = commands(event, "false");
        assert.ok(docs.includes("uv run .github/records.py validate"));
        assert.ok(!docs.some((command) => /npm|npx|curl/.test(command)));
        const nodeSetup = steps.find((step) =>
            step.uses?.startsWith("actions/setup-node@"),
        );
        assert.equal(
            evaluate(nodeSetup.if, context(event, "", "", "false")),
            false,
        );
        assert.equal(
            evaluate(nodeSetup.if, context(event, "", "", "true")),
            true,
        );
        const engine = commands(event, "true");
        assert.ok(engine.includes("npm ci"));
        assert.ok(engine.includes("npm run test:ci"));
        assert.ok(
            !engine.some((command) =>
                /playwright install|test:d2|test:zip:d2|quality:gate:strict/.test(
                    command,
                ),
            ),
        );
    }
    const full = commands("workflow_dispatch", "true");
    for (const command of [
        "uv run .github/records.py validate",
        "npm ci",
        "npx playwright install --with-deps chromium firefox",
        "npm run test:d2",
        "npm run test:zip:d2",
        "npm run quality:gate:strict",
    ]) {
        assert.ok(full.includes(command), command);
    }
    assert.ok(!full.includes("npm run test:ci"));
    const nodeSetup = steps.find((step) =>
        step.uses?.startsWith("actions/setup-node@"),
    );
    assert.equal(
        evaluate(nodeSetup.if, context("workflow_dispatch", "", "", "true")),
        true,
    );
    const preparation = full.find((command) => command.includes("d2.tar.gz"));
    assert.match(preparation, /releases\/download\/v0\.9\.0\//);
    assert.match(
        preparation,
        /5669ddc46b99e942cc96078f4a4e36d5e62103348f4c05179ede27802fdd87a9/,
    );
    assert.match(
        preparation,
        /c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f/,
    );
    assert.match(preparation, /fonttools==4\.60\.1.*wght=400/);
    for (const command of [
        "npm run test:d2",
        "npm run test:zip:d2",
        "npm run quality:gate:strict",
    ]) {
        const step = steps.find((entry) => entry.run === command);
        assert.equal(
            step.env.MARP_AGENT_D2_PATH,
            "${{ runner.temp }}/d2-v0.9.0/bin/d2",
        );
        assert.equal(
            step.env.MARP_AGENT_D2_FONT_PATH,
            "${{ runner.temp }}/NotoSansJP-Regular.ttf",
        );
    }
    assert.equal(
        packageJson.scripts["quality:gate:strict"],
        "MARP_AGENT_REQUIRE_VISUAL=1 MARP_AGENT_STRICT_E2E=1 npm run quality:gate",
    );
    assert.equal(
        packageJson.scripts["quality:gate"],
        "npm test && npm run validate:fixtures && npm run test:e2e",
    );
    assert.equal(packageJson.scripts.test, "node scripts/run-node-tests.js");
    assert.equal(
        packageJson.scripts["ci:full"],
        "uv run .github/records.py validate && npm run test:d2 && npm run test:zip:d2 && npm run quality:gate:strict",
    );
    assert.ok(
        packageJson.scripts["test:ci"].includes(
            "tests/unit/ci-workflow.test.js",
        ),
    );
    const browsers = require("../../playwright.config").projects.map(
        (project) => project.use.browserName,
    );
    assert.deepEqual(browsers, ["chromium", "firefox"]);
});

test("local full acceptance runs every gate in order and stops on each failure", (t) => {
    const directory = temporaryDirectory(t);
    const log = path.join(directory, "commands.log");
    for (const command of ["uv", "npm"]) {
        write(
            directory,
            command,
            '#!/bin/bash\nlabel="${0##*/} $*"\nprintf \'%s\\n\' "$label" >> "$CI_FULL_LOG"\nif [[ "$label" == "$CI_FULL_FAIL" ]]; then exit 23; fi\nexit 0\n',
        );
        fs.chmodSync(path.join(directory, command), 0o755);
    }
    const expected = [
        "uv run .github/records.py validate",
        "npm run test:d2",
        "npm run test:zip:d2",
        "npm run quality:gate:strict",
    ];
    for (const failure of ["", ...expected]) {
        fs.writeFileSync(log, "");
        const result = run(
            "bash",
            ["-c", packageJson.scripts["ci:full"]],
            directory,
            {
                PATH: `${directory}${path.delimiter}${process.env.PATH}`,
                CI_FULL_LOG: log,
                CI_FULL_FAIL: failure,
            },
        );
        assert.equal(result.status, failure ? 23 : 0, result.stderr);
        assert.deepEqual(
            fs.readFileSync(log, "utf8").trim().split("\n"),
            failure
                ? expected.slice(0, expected.indexOf(failure) + 1)
                : expected,
        );
    }
});

test("manual acceptance cannot cancel or be cancelled by an automatic run", () => {
    const group = (values) =>
        workflow.concurrency.group.replace(/\$\{\{.*?\}\}/g, (expression) =>
            evaluate(expression, values),
        );
    const pr = context("pull_request");
    const push = context("push");
    const manual = context("workflow_dispatch");
    const nextManual = structuredClone(manual);
    nextManual.github.run_id = "101";
    assert.equal(new Set([pr, push, manual, nextManual].map(group)).size, 4);
    assert.equal(
        evaluate(workflow.concurrency["cancel-in-progress"], pr),
        true,
    );
    assert.equal(
        evaluate(workflow.concurrency["cancel-in-progress"], push),
        true,
    );
    assert.equal(
        evaluate(workflow.concurrency["cancel-in-progress"], manual),
        false,
    );
});
