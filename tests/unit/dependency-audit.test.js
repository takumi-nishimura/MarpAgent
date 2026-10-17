const test = require("node:test");
const assert = require("node:assert/strict");
const { compareAudit } = require("../../src/dependency-audit");

const baseline = {
    accepted: {
        dependency: {
            severity: "moderate",
            advisories: ["https://github.com/advisories/GHSA-known"],
            nodes: ["node_modules/parent/node_modules/dependency"],
            fixAvailable: false,
        },
    },
};
function audit(change = {}) {
    return {
        vulnerabilities: {
            dependency: {
                severity: "moderate",
                via: [{ url: "https://github.com/advisories/GHSA-known" }],
                nodes: ["node_modules/parent/node_modules/dependency"],
                fixAvailable: false,
                ...change,
            },
        },
    };
}

test("the recorded residual audit passes and removed findings are reported", () => {
    assert.deepEqual(compareAudit(audit(), baseline), {
        regressions: [],
        resolved: [],
    });
    assert.deepEqual(compareAudit({ vulnerabilities: {} }, baseline), {
        regressions: [],
        resolved: ["dependency"],
    });
});

test("a new advisory fails even when the affected package count is unchanged", () => {
    const result = compareAudit(
        audit({ via: [{ url: "https://github.com/advisories/GHSA-new" }] }),
        baseline,
    );
    assert.match(
        result.regressions.join("\n"),
        /dependency.*new advisory.*GHSA-new/,
    );
});

test("severity increases, new dependency locations, and newly available fixes require review", () => {
    assert.match(
        compareAudit(audit({ severity: "high" }), baseline).regressions.join(
            "\n",
        ),
        /severity.*moderate.*high/,
    );
    assert.match(
        compareAudit(
            audit({ nodes: ["node_modules/dependency"] }),
            baseline,
        ).regressions.join("\n"),
        /new affected path/,
    );
    assert.match(
        compareAudit(audit({ fixAvailable: true }), baseline).regressions.join(
            "\n",
        ),
        /compatible fix/,
    );
});

test("a new vulnerable package cannot be hidden by a resolved package", () => {
    const result = compareAudit(
        { vulnerabilities: { another: audit().vulnerabilities.dependency } },
        baseline,
    );
    assert.match(
        result.regressions.join("\n"),
        /another.*new vulnerable package/,
    );
});

test("registry errors and malformed audit output never pass as a clean audit", () => {
    for (const input of [
        { error: { message: "registry unavailable" } },
        {},
        { vulnerabilities: [] },
        audit({ severity: "unknown" }),
    ]) {
        assert.throws(
            () => compareAudit(input, baseline),
            /Invalid npm audit report/,
        );
    }
});
