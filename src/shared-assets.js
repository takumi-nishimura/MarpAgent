const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { AsyncLocalStorage } = require("node:async_hooks");

const rendering = new AsyncLocalStorage();

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

/** The source project's nearest marker wins, including Git worktree .git files. */
function findProjectRoot(deckDir) {
  for (let current = path.resolve(deckDir); ; current = path.dirname(current)) {
    if (
      [".git", ".jj", "marp.config.js"].some((name) =>
        fs.existsSync(path.join(current, name)),
      ) ||
      (fs.existsSync(path.join(current, "decks")) &&
        fs.existsSync(path.join(current, "assets")))
    )
      return current;
    if (path.dirname(current) === current) return null;
  }
}

function canonicalPlaceholder(shared, root) {
  if (!root || fs.statSync(shared).size > 4096) return false;
  const target = fs.readFileSync(shared, "utf8");
  if (
    path.isAbsolute(target) ||
    path.resolve(path.dirname(shared), target) !== path.join(root, "assets")
  )
    return false;
  const result = spawnSync(
    "git",
    [
      "-C",
      root,
      "ls-files",
      "--stage",
      "-z",
      "--",
      path.relative(root, shared).split(path.sep).join("/"),
    ],
    {
      encoding: "utf8",
      timeout: 10000,
      windowsHide: true,
    },
  );
  return (
    result.status === 0 &&
    result.stdout
      .split("\0")
      .some(
        (entry) =>
          entry.startsWith("120000 ") &&
          entry.slice(entry.indexOf("\t") + 1) ===
            path.relative(root, shared).split(path.sep).join("/"),
      )
  );
}

/** A physical directory is authoritative; only a verified Git placeholder is ignored. */
function sharedAssets(deckDir, repoRoot = findProjectRoot(deckDir)) {
  const deck = path.resolve(deckDir);
  const local = path.join(deck, "shared");
  const root = repoRoot && path.resolve(repoRoot);
  if (root && !inside(root, deck))
    throw new Error("Deck is outside the shared assets project root.");
  const entry = fs.lstatSync(local, { throwIfNoEntry: false });
  if (entry) {
    let directory = false;
    try {
      directory = fs.statSync(local).isDirectory();
    } catch (error) {
      if (!["ENOENT", "ENOTDIR", "ELOOP"].includes(error.code)) throw error;
    }
    if (directory)
      return { directory: local, virtual: false, projectRoot: root };
    if (!entry.isFile() || !canonicalPlaceholder(local, root))
      throw Object.assign(
        new Error(
          "shared must be a directory or a valid directory link; an ordinary file or broken shared link blocks the alias.",
        ),
        { code: "INVALID_SHARED_ENTRY" },
      );
    return {
      directory: path.join(root, "assets"),
      virtual: true,
      placeholder: true,
      projectRoot: root,
    };
  }
  return root
    ? { directory: path.join(root, "assets"), virtual: true, projectRoot: root }
    : { directory: local, virtual: false, projectRoot: null };
}

/** Resolve the reserved deck-relative namespace without creating filesystem entries. */
function resolveSharedPath(filePath, deckDir, repoRoot) {
  const file = path.resolve(filePath);
  const local = path.join(path.resolve(deckDir), "shared");
  if (!inside(local, file)) return file;
  let shared;
  try {
    shared = sharedAssets(deckDir, repoRoot);
  } catch (error) {
    if (error.code === "INVALID_SHARED_ENTRY") return file;
    throw error;
  }
  return shared.virtual
    ? path.join(shared.directory, path.relative(local, file))
    : file;
}

function rewriteSharedResources(
  source,
  { deckDir, repoRoot, http = false, kind = "html" } = {},
) {
  if (!deckDir || http) return source;
  let shared;
  try {
    shared = sharedAssets(deckDir, repoRoot);
  } catch (error) {
    if (error.code === "INVALID_SHARED_ENTRY") return source;
    throw error;
  }
  if (!shared.virtual) return source;
  return require("./bundle-references").rewriteReferences(source, {
    kind,
    includeLinks: true,
    onReference(reference) {
      const match = /^(?:\.\/)?shared\/([^?#]*)([?#].*)?$/.exec(reference);
      if (!match) return reference;
      let decoded;
      try {
        decoded = decodeURIComponent(match[1]);
      } catch {
        return reference;
      }
      const file = path.resolve(shared.directory, decoded);
      if (
        !inside(shared.directory, file) ||
        decoded.includes("\\") ||
        decoded.includes("\0")
      )
        throw new Error("Shared resource escapes the assets directory.");
      return (
        path
          .relative(deckDir, file)
          .split(path.sep)
          .map(encodeURIComponent)
          .join("/") + (match[2] || "")
      );
    },
  }).content;
}

function withSharedContext(context, operation) {
  return rendering.run(context, operation);
}
function sharedContext(env) {
  return (
    rendering.getStore() ||
    env?.marpagentSharedAssets ||
    (process.env.MARP_AGENT_SHARED_DECK_DIR
      ? {
          deckDir: process.env.MARP_AGENT_SHARED_DECK_DIR,
          http: process.env.MARP_AGENT_SHARED_HTTP === "1",
        }
      : {})
  );
}

module.exports = {
  findProjectRoot,
  sharedAssets,
  resolveSharedPath,
  rewriteSharedResources,
  withSharedContext,
  sharedContext,
};
