const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "../../..");

function createThemeRepo({
  paths = ["bin", "scripts", "src", "themes/src", "designs/lab", ".mise.toml"],
  linkDependencies = true,
} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "marpx-theme-test-"));
  for (const name of paths) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.cpSync(path.join(repoRoot, name), path.join(root, name), {
      recursive: true,
    });
  }
  if (linkDependencies) {
    fs.symlinkSync(
      path.join(repoRoot, "node_modules"),
      path.join(root, "node_modules"),
      "dir",
    );
  }
  return root;
}

module.exports = { createThemeRepo };
