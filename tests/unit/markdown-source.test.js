const test = require("node:test");
const assert = require("node:assert/strict");
const { parseSource } = require("../../src/markdown-source");

test("frontmatter delimiters match Marp without exposing YAML as Markdown", () => {
  for (const prefix of ["", "\uFEFF"]) {
    for (const newline of ["\n", "\r\n"]) {
      for (const closing of ["---", "----", "---  ", "   ----\t"]) {
        const source = [
          `${prefix}---`,
          'description: "![sample](example.png)"',
          closing,
          "![visible](actual.png)",
        ].join(newline);
        const images = parseSource(source).filter((item) => item.type === "image");
        assert.deepEqual(images.map(({ reference, index }) => ({ reference, index })), [
          { reference: "actual.png", index: source.indexOf("![visible]") },
        ]);
      }
    }
  }
});
