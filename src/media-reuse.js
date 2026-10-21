const fs = require("node:fs");
const path = require("node:path");
const { buildMediaCatalog } = require("./media-catalog");
const { inspectAssetPath, isPathInside } = require("./media-reference-graph");
const { createMediaVisibility } = require("./media-visibility");

function lstat(file) {
    try {
        return fs.lstatSync(file);
    } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
    }
}
function relative(root, file) {
    return path.relative(root, file).split(path.sep).join("/");
}
function identity(stats) {
    return {
        dev: stats.dev,
        ino: stats.ino,
        size: stats.size,
        mtimeMs: stats.mtimeMs,
    };
}
function sameIdentity(a, b) {
    return ["dev", "ino", "size", "mtimeMs"].every((key) => a[key] === b[key]);
}

function checkParents(root, destination) {
    let current = root;
    for (const component of path
        .relative(root, path.dirname(destination))
        .split(path.sep)
        .filter(Boolean)) {
        current = path.join(current, component);
        const stats = lstat(current);
        if (stats?.isSymbolicLink())
            throw new Error(
                "Destination parent is a symlink; use the consuming deck's actual assets directory.",
            );
        if (stats && !stats.isDirectory())
            throw new Error("Destination parent is not a directory.");
    }
}

function containingDeck(root, file) {
    let dir = path.dirname(file);
    while (isPathInside(root, dir) && dir !== root) {
        const source = ["slide.md", "paper.md"].some((name) =>
            lstat(path.join(dir, name))?.isFile(),
        );
        if (source) return dir;
        dir = path.dirname(dir);
    }
    return null;
}
function destinationDeck(root, destination) {
    const dir = containingDeck(root, destination);
    if (dir) {
        if (!isPathInside(path.join(dir, "assets"), destination))
            throw new Error(
                "Destination must be a named file inside the consuming deck's assets directory.",
            );
        return dir;
    }
    throw new Error(
        "Destination must belong to a deck with slide.md or paper.md and an assets directory.",
    );
}

/** Validate an explicit source and destination without creating any files. */
function planMediaReuse({
    repoRoot,
    source,
    destination,
    includePrivate = false,
} = {}) {
    if (!source || !destination)
        throw new TypeError("Source and destination are required for reuse.");
    const root = fs.realpathSync.native(
        path.resolve(repoRoot || process.cwd()),
    );
    const sourceFile = path.resolve(root, source);
    const destinationFile = path.resolve(root, destination);
    if (!isPathInside(root, sourceFile) || !isPathInside(root, destinationFile))
        throw new Error(
            "Source and destination must stay inside the repository.",
        );
    if (lstat(destinationFile))
        throw new Error(
            "Destination already exists; refusing to overwrite a file or link.",
        );
    checkParents(root, destinationFile);
    const deckDir = destinationDeck(root, destinationFile);
    const visibility = createMediaVisibility(root, { includePrivate });
    if (!visibility.classify(destinationFile).visible)
        throw new Error(
            "Destination is private or ignored; explicitly select --include-private if intended.",
        );
    const catalog = buildMediaCatalog({
        repoRoot: root,
        includePrivate,
        metadata: false,
    });
    const known = catalog.assets.find(
        (asset) => asset.path === relative(root, sourceFile),
    );
    if (!known?.realPath)
        throw new Error(
            "Source must be a known visible repository media file; private sources require --include-private.",
        );
    const sourceDeck = containingDeck(root, sourceFile) || root;
    const resolution = inspectAssetPath(sourceFile, {
        repoRoot: root,
        deckDir: sourceDeck,
        policy: "bundle",
    });
    if (!resolution.allowed || known.diagnostics.length > 0)
        throw new Error(
            "Source is not a safe regular file; repair its link diagnostics first.",
        );
    const target = relative(path.dirname(destinationFile), sourceFile);
    if (
        !target ||
        path.isAbsolute(target) ||
        path.resolve(path.dirname(destinationFile), target) !== sourceFile
    )
        throw new Error("Cannot construct a safe relative symlink target.");
    const reference = relative(deckDir, destinationFile)
        .split("/")
        .map(encodeURIComponent)
        .join("/");
    return {
        repoRoot: root,
        source: relative(root, sourceFile),
        sourceRealPath: relative(root, resolution.realPath),
        sourceDeck: relative(root, sourceDeck),
        destination: relative(root, destinationFile),
        target,
        reference,
        includePrivate,
        sourceIdentity: identity(fs.statSync(resolution.realPath)),
    };
}

/** Create only the planned relative file link. No overwrite or copy fallback. */
function reuseMediaAsset(
    plan,
    { dryRun = false, createSymlink = fs.symlinkSync } = {},
) {
    const checked = planMediaReuse(plan);
    if (
        checked.target !== plan.target ||
        checked.sourceRealPath !== plan.sourceRealPath ||
        !sameIdentity(checked.sourceIdentity, plan.sourceIdentity)
    )
        throw new Error(
            "Source changed after planning; create and inspect a new reuse plan.",
        );
    if (dryRun) return { ...checked, created: false, dryRun: true };
    const destination = path.join(checked.repoRoot, checked.destination);
    const createdDirectories = [];
    let createdIdentity = null;
    try {
        let current = checked.repoRoot;
        for (const component of path
            .relative(checked.repoRoot, path.dirname(destination))
            .split(path.sep)
            .filter(Boolean)) {
            current = path.join(current, component);
            if (!lstat(current)) {
                try {
                    fs.mkdirSync(current);
                    createdDirectories.push(current);
                } catch (error) {
                    if (error.code !== "EEXIST") throw error;
                }
            }
            const stats = fs.lstatSync(current);
            if (!stats.isDirectory() || stats.isSymbolicLink())
                throw new Error(
                    "Destination parent changed or became a symlink.",
                );
        }
        checkParents(checked.repoRoot, destination);
        const sourceNow = inspectAssetPath(
            path.join(checked.repoRoot, checked.source),
            {
                repoRoot: checked.repoRoot,
                deckDir: path.join(checked.repoRoot, checked.sourceDeck),
                policy: "bundle",
            },
        );
        if (
            !sourceNow.allowed ||
            relative(checked.repoRoot, sourceNow.realPath) !==
                checked.sourceRealPath ||
            !sameIdentity(
                identity(fs.statSync(sourceNow.realPath)),
                checked.sourceIdentity,
            )
        )
            throw new Error("Source changed before creating the symlink.");
        createSymlink(checked.target, destination, "file");
        createdIdentity = identity(fs.lstatSync(destination));
        if (
            fs.realpathSync.native(destination) !== sourceNow.realPath ||
            fs.readlinkSync(destination) !== checked.target
        )
            throw new Error(
                "Created symlink did not resolve to the planned source.",
            );
        return { ...checked, created: true, dryRun: false };
    } catch (error) {
        if (createdIdentity) {
            const stats = lstat(destination);
            if (
                stats?.isSymbolicLink() &&
                sameIdentity(identity(stats), createdIdentity) &&
                fs.readlinkSync(destination) === checked.target
            )
                fs.unlinkSync(destination);
        }
        for (const dir of createdDirectories.reverse()) {
            try {
                fs.rmdirSync(dir);
            } catch {
                /* Keep directories another process has populated. */
            }
        }
        if (["EPERM", "EACCES", "ENOSYS", "ENOTSUP"].includes(error.code))
            throw new Error(
                `Symlink creation is unavailable or needs platform privileges (${error.code}); no file was copied.`,
            );
        throw error;
    }
}

module.exports = { planMediaReuse, reuseMediaAsset };
