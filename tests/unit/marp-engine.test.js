const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { createConfiguredMarp } = require("../../src/slide-map");

const repoRoot = path.resolve(__dirname, "../..");

function assertCoreFeatures(html, math) {
    assert.match(html, /class="shiki marp-shiki"/);
    assert.match(html, /class="line highlighted"/);
    assert.match(html, /var\(--marp-shiki-token-keyword\)/);
    assert.match(html, math === "katex" ? /class="katex"/ : /<mjx-container/);
    assert.doesNotMatch(html, /data-mjx-error|katex-error/);
    assert.match(html, /class="mermaid-diagram"/);
    assert.match(html, /data-mml-node="math"/);
    assert.doesNotMatch(html, /\$x&lt;y\$/);
}

for (const math of ["katex", "mathjax"]) {
    const markdown = `---
marp: true
math: ${math}
---
# Rendering

Inline $x^2$ and display math:

$$\\frac{1}{2}$$

\`\`\`js {1}
const value = 42;
\`\`\`

\`\`\`mermaid
flowchart LR
A["日本語 $x<y$"] --> B["出力<br/>結果"]
\`\`\`
`;

    test(`configured engine renders Shiki, ${math}, and extended Mermaid`, () => {
        assertCoreFeatures(createConfiguredMarp().render(markdown).html, math);
    });

    test(`CLI renders the same Core 5 features outside the repository (${math})`, (t) => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "marpagent-core5-"));
        t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
        const input = path.join(dir, "slide.md");
        const output = path.join(dir, "slide.html");
        fs.writeFileSync(input, markdown);
        const cli = path.join(
            path.dirname(require.resolve("@marp-team/marp-cli/package.json")),
            "marp-cli.js",
        );
        execFileSync(
            process.execPath,
            [
                cli,
                "--config",
                path.join(repoRoot, "marp.config.js"),
                input,
                "-o",
                output,
            ],
            { cwd: dir, timeout: 30000, stdio: "pipe" },
        );
        assertCoreFeatures(fs.readFileSync(output, "utf8"), math);
    });
}
