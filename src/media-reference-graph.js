const fs = require("node:fs");
const path = require("node:path");
const {
    extractDeckMediaReferences,
    resolveLocalReference,
} = require("./media-assets");
const { buildSlideMap } = require("./slide-map");

/** Lexical containment; callers comparing real paths must canonicalize first. */
function isPathInside(root, candidate) {
    const relative = path.relative(path.resolve(root), path.resolve(candidate));
    return (
        relative === "" ||
        (relative !== ".." &&
            !relative.startsWith(`..${path.sep}`) &&
            !path.isAbsolute(relative))
    );
}

function policyOptions(options) {
    if (!options.repoRoot) throw new TypeError("repoRoot is required");
    const policy = options.policy || "permissive";
    if (!["permissive", "bundle"].includes(policy)) {
        throw new TypeError(`Unknown media policy: ${policy}`);
    }
    const repoRoot = path.resolve(options.repoRoot);
    return {
        ...options,
        repoRoot,
        realRoot: fs.realpathSync.native(repoRoot),
        deckDir: path.resolve(options.deckDir || repoRoot),
        policy,
    };
}

/**
 * Inspect links component by component, including parent directories. Never
 * read file contents. The permissive policy allows existing files regardless
 * of link conventions; bundle rejects every diagnostic. Directory targets are
 * never copy candidates. A repo root alias is canonicalized before walking.
 */
function inspectAssetPath(filePath, options) {
    const { repoRoot, realRoot, deckDir, policy } = policyOptions(options);
    const absolutePath = path.resolve(filePath);
    const diagnostics = [];
    const symlinks = [];
    const add = (code, message, details = {}) => {
        if (
            !diagnostics.some(
                (item) => item.code === code && item.link === details.link,
            )
        ) {
            diagnostics.push({ code, message, path: absolutePath, ...details });
        }
    };
    const lexicalInside = isPathInside(repoRoot, absolutePath);
    let candidate = lexicalInside
        ? path.resolve(realRoot, path.relative(repoRoot, absolutePath))
        : absolutePath;
    const realDeckDir = isPathInside(repoRoot, deckDir)
        ? path.resolve(realRoot, path.relative(repoRoot, deckDir))
        : deckDir;
    if (!lexicalInside)
        add("outside-repo", "Reference path is outside the repository.");
    if (
        lexicalInside &&
        !isPathInside(deckDir, absolutePath) &&
        !isPathInside(path.join(repoRoot, "assets"), absolutePath)
    ) {
        add(
            "cross-deck-reference",
            "Use a named relative file symlink in the consuming deck.",
        );
    }

    const visited = new Set();
    let stats = null;
    let realPath = null;
    let failure = false;
    let hops = 0;
    // Preserve dot segments in link targets: "link/.." must follow the link
    // before walking to its parent, rather than normalizing it lexically.
    let current = path.parse(candidate).root;
    const pending = candidate
        .slice(current.length)
        .split(path.sep)
        .filter(Boolean);
    while (pending.length > 0) {
        const part = pending.shift();
        if (part === ".") continue;
        if (part === "..") {
            current = path.dirname(current);
            continue;
        }
        const next = path.join(current, part);
        try {
            stats = fs.lstatSync(next);
        } catch (error) {
            const link = symlinks.at(-1);
            const code =
                error.code === "ENOENT" || error.code === "ENOTDIR"
                    ? link && link.directory === null
                        ? "broken-symlink"
                        : "missing"
                    : error.code === "ELOOP"
                      ? "symlink-cycle"
                      : "unreadable";
            add(
                code,
                `Cannot resolve media path (${error.code}).`,
                link ? { link: link.path, target: link.target } : {},
            );
            failure = true;
            break;
        }
        if (!stats.isSymbolicLink()) {
            current = next;
            if (!stats.isDirectory() && pending.length > 0) {
                add("missing", "A path component is not a directory.");
                failure = true;
                break;
            }
            if (
                !isPathInside(realRoot, current) &&
                !isPathInside(current, realRoot)
            ) {
                add(
                    "outside-repo",
                    "Resolved path traverses outside the repository.",
                );
            }
            continue;
        }
        let target;
        try {
            target = fs.readlinkSync(next);
        } catch (error) {
            add("unreadable", `Cannot read symlink (${error.code}).`, {
                link: next,
            });
            failure = true;
            break;
        }
        const resolvedPath = path.resolve(current, target);
        const state = next + "\0" + pending.join(path.sep);
        if (visited.has(state) || ++hops > 40) {
            add("symlink-cycle", "Symlink cycle or excessive link depth.", {
                link: next,
                target,
            });
            failure = true;
            break;
        }
        visited.add(state);
        let directory = null;
        try {
            directory = fs.statSync(next).isDirectory();
        } catch {
            /* Diagnosed during traversal. */
        }
        const shared =
            next === path.join(realDeckDir, "shared") &&
            resolvedPath === path.join(realRoot, "assets");
        const link = {
            path: next,
            target,
            resolvedPath,
            absolute: path.isAbsolute(target),
            directory,
            shared,
        };
        symlinks.push(link);
        if (link.absolute)
            add("absolute-symlink", "Use a relative symlink target.", {
                link: next,
                target,
            });
        if (!isPathInside(realRoot, resolvedPath))
            add("outside-repo", "Symlink target is outside the repository.", {
                link: next,
                target,
            });
        if (
            directory &&
            !shared &&
            isPathInside(realDeckDir, next) &&
            !isPathInside(realDeckDir, resolvedPath)
        ) {
            add(
                "directory-reuse",
                "Reuse individual files instead of another directory.",
                { link: next, target },
            );
        }
        if (link.absolute) current = path.parse(target).root;
        pending.unshift(
            ...target
                .slice(link.absolute ? current.length : 0)
                .split(path.sep)
                .filter(Boolean),
        );
    }
    if (!failure) {
        try {
            // The filesystem is authoritative if a path changes during inspection.
            realPath = fs.realpathSync.native(absolutePath);
            stats = fs.statSync(absolutePath);
            if (current !== realPath)
                add("unreadable", "Media path changed while being inspected.");
        } catch (error) {
            add("unreadable", `Cannot verify media path (${error.code}).`);
            realPath = null;
            failure = true;
        }
    }
    const exists = !failure && stats !== null;
    const fileType = !exists
        ? null
        : stats.isFile()
          ? "file"
          : stats.isDirectory()
            ? "directory"
            : "other";
    const insideRepo =
        realPath === null ? null : isPathInside(realRoot, realPath);
    if (insideRepo === false)
        add("outside-repo", "Resolved media is outside the repository.");
    if (exists && fileType !== "file")
        add("not-file", "Media must resolve to a regular file.");
    return {
        path: absolutePath,
        realPath,
        exists,
        fileType,
        insideRepo,
        symlinks,
        diagnostics,
        allowed:
            exists &&
            fileType === "file" &&
            (policy === "permissive" || diagnostics.length === 0),
    };
}

/** Resolve a URL without fetching remote resources or reading file contents. */
function resolveAssetReference(reference, options) {
    const value = String(reference || "").trim();
    const filePath = resolveLocalReference(
        value,
        options.deckDir || options.repoRoot,
    );
    if (filePath) {
        const result = inspectAssetPath(filePath, options);
        const status = result.allowed
            ? "safe"
            : result.diagnostics.some((item) =>
                    ["missing", "broken-symlink"].includes(item.code),
                )
              ? "missing"
              : "unsafe";
        return { reference: value, kind: "local", status, ...result };
    }
    const kind = value.startsWith("#")
        ? "fragment"
        : /^data:/i.test(value)
          ? "data"
          : /^(?:https?:|\/\/)/i.test(value)
            ? "remote"
            : "unsupported";
    return {
        reference: value,
        kind,
        status: kind,
        path: null,
        realPath: null,
        exists: null,
        fileType: null,
        insideRepo: null,
        symlinks: [],
        diagnostics: [],
        allowed: false,
    };
}

/**
 * Return every source reference with a stable source origin and policy result.
 * Hidden slides are retained by default. Frontmatter applies globally and has
 * null slide/page identity. options.slideMap reuses the configured Marp map.
 */
function collectDeckReferences(
    deckPath,
    markdown = fs.readFileSync(deckPath, "utf8"),
    options = {},
) {
    const file = path.resolve(deckPath);
    const slideMap = options.slideMap || buildSlideMap(markdown);
    const lineStarts = [0];
    for (const match of markdown.matchAll(/\r\n|\r|\n/g))
        lineStarts.push(match.index + match[0].length);
    const lines = markdown.split(/\r\n|\r|\n/);
    return extractDeckMediaReferences(markdown).flatMap(
        ({ reference, index, scope }) => {
            let lo = 0;
            let hi = lineStarts.length;
            while (lo + 1 < hi) {
                const mid = (lo + hi) >> 1;
                if (lineStarts[mid] <= index) lo = mid;
                else hi = mid;
            }
            const line = lo + 1;
            const slide =
                scope === "frontmatter"
                    ? null
                    : slideMap.find(
                          (entry) =>
                              line >= entry.line && line <= entry.endLine,
                      );
            if (slide?.hidden && options.includeHidden === false) return [];
            return [
                {
                    ...resolveAssetReference(reference, {
                        ...options,
                        deckDir: path.dirname(file),
                    }),
                    origin: {
                        file,
                        index,
                        line,
                        column: index - lineStarts[lo] + 1,
                        scope,
                        slide: slide?.slide ?? null,
                        renderedSlide: slide?.renderedSlide ?? null,
                        page: slide?.page ?? null,
                        hidden: slide?.hidden ?? false,
                        context: lines
                            .slice(Math.max(0, lo - 2), lo + 3)
                            .join("\n"),
                    },
                },
            ];
        },
    );
}

module.exports = {
    collectDeckReferences,
    resolveAssetReference,
    inspectAssetPath,
    isPathInside,
};
