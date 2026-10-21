const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createConfiguredMarp, buildSlideMap } = require("../../src/slide-map");
const { collectD2RenderDiagnostics } = require("../../src/d2-diagnostics");

test("D2 errors appear in preview HTML and diagnostic carrier with Markdown positions", (t) => {
    const previous = process.env.MARP_AGENT_D2_PATH;
    process.env.MARP_AGENT_D2_PATH = "/does/not/exist/d2";
    t.after(() =>
        previous === undefined
            ? delete process.env.MARP_AGENT_D2_PATH
            : (process.env.MARP_AGENT_D2_PATH = previous),
    );
    const result = createConfiguredMarp().render(
        "---\nmarp: true\n---\n# Visible\n\n```d2\na -> b\n```",
    );
    assert.match(result.html, /data-marpagent-render-error="d2"/);
    assert.match(result.html, /D2 executable not found/);
    assert.equal(result.d2Diagnostics[0].line, 6);
    assert.equal(result.d2Diagnostics[0].slide, 1);
    assert.deepEqual(
        collectD2RenderDiagnostics(result.html),
        result.d2Diagnostics,
    );
});

test("D2 parse-only, hidden slides and normal code never start the executable", (t) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "d2-inert-"));
    const log = path.join(directory, "called");
    const executable = path.join(directory, "d2");
    fs.writeFileSync(
        executable,
        `#!${process.execPath}\nrequire('node:fs').writeFileSync(${JSON.stringify(log)},'called');process.exit(2);\n`,
        { mode: 0o755 },
    );
    const previous = process.env.MARP_AGENT_D2_PATH;
    process.env.MARP_AGENT_D2_PATH = executable;
    t.after(() => {
        fs.rmSync(directory, { recursive: true, force: true });
        if (previous === undefined) delete process.env.MARP_AGENT_D2_PATH;
        else process.env.MARP_AGENT_D2_PATH = previous;
    });
    assert.equal(buildSlideMap("# Parse\n\n```d2\na -> b\n```").length, 1);
    const result = createConfiguredMarp().render(
        "# Hidden\n<!-- hide: true -->\n```d2\nbad input\n```\n\n---\n# Visible\n```text\na -> b\n```",
    );
    assert.deepEqual(result.d2Diagnostics, []);
    assert.equal(fs.existsSync(log), false);
});

test("unsupported D2 fence arguments are explicit errors", () => {
    const result = createConfiguredMarp().render(
        "# Example\n```d2 layout=elk\na -> b\n```",
    );
    assert.equal(result.d2Diagnostics[0].code, "D2_FENCE_ARGUMENTS");
});

test("validation retains browser D2 errors without a carrier and deduplicates known compiler failures", async (t) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "d2-validation-"));
    const deck = path.join(directory, "slide.md");
    fs.writeFileSync(deck, "# Example\n\n```d2\na -> b\n```");
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const { validateDeckWithVisualCheck } = require("../../src/deck-validator");
    for (const withCarrier of [false, true]) {
        const result = await validateDeckWithVisualCheck(deck, {
            measureRenderedSlides: async () => ({
                status: "measured",
                slides: [
                    {
                        slideNumber: 1,
                        clipped: [],
                        renderErrors: [
                            {
                                kind: "diagram",
                                engine: "d2",
                                message: "bad diagram",
                                source: "",
                                count: 1,
                            },
                        ],
                    },
                ],
                ...(withCarrier
                    ? {
                          d2Diagnostics: [
                              {
                                  engine: "d2",
                                  code: "D2_PROCESS_EXIT",
                                  slide: 1,
                                  line: 4,
                                  message: "bad diagram",
                              },
                          ],
                      }
                    : {}),
            }),
        });
        const errors = result.findings.filter(
            (finding) => finding.ruleId === "diagram-render-error",
        );
        assert.equal(errors.length, 1);
        assert.match(errors[0].title, /D2/);
    }
});
