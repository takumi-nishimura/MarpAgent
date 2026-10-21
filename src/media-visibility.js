const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { isPathInside } = require("./media-reference-graph");

/** Visibility is a caller policy; the common resolver stays policy-neutral. */
function createMediaVisibility(repoRoot, { includePrivate = false } = {}) {
    const root = path.resolve(repoRoot);
    const cache = new Map();
    const excludedNames = new Set();
    function remember(file, reason) {
        cache.set(file, reason);
        if (reason && reason !== "outside-repo")
            excludedNames.add(path.basename(file));
    }
    const probe = spawnSync(
        "git",
        ["-C", root, "rev-parse", "--is-inside-work-tree"],
        {
            encoding: "utf8",
            timeout: 10000,
            windowsHide: true,
        },
    );
    const git = probe.status === 0 && probe.stdout.trim() === "true";
    if (!git && fs.existsSync(path.join(root, ".git"))) {
        throw new Error(
            "Cannot determine Git ignore policy for this repository.",
        );
    }
    const checkoutLinks = new Set();
    if (git) {
        const index = spawnSync(
            "git",
            ["-C", root, "ls-files", "--stage", "-z", "--", "assets", "decks"],
            {
                encoding: "utf8",
                timeout: 10000,
                maxBuffer: 32 * 1024 * 1024,
                windowsHide: true,
            },
        );
        if (index.status !== 0)
            throw new Error("Cannot inspect media symlink checkout modes.");
        for (const entry of index.stdout.split("\0")) {
            if (entry.startsWith("120000 "))
                checkoutLinks.add(
                    path.resolve(root, entry.slice(entry.indexOf("\t") + 1)),
                );
        }
    }
    function pathReason(filePath) {
        if (!isPathInside(root, filePath)) return "outside-repo";
        const parts = path.relative(root, filePath).split(path.sep);
        if (
            parts.some((part) =>
                /^(?:\.git|\.ssh|\.aws|\.env(?:\..*)?|node_modules)$/i.test(
                    part,
                ),
            )
        )
            return "control-path";
        if (
            !includePrivate &&
            parts.some(
                (part) =>
                    /^(?:[._]?private)(?:[._-]|$)/i.test(part) ||
                    part.startsWith("."),
            )
        )
            return "private-path";
        return null;
    }
    function prime(filePaths) {
        const pending = [
            ...new Set(filePaths.map((file) => path.resolve(file))),
        ].filter((file) => !cache.has(file));
        const eligible = [];
        for (const file of pending) {
            const reason = pathReason(file);
            if (reason || includePrivate || !git) remember(file, reason);
            else eligible.push(file);
        }
        if (eligible.length === 0) return;
        const input =
            eligible
                .map((file) =>
                    path.relative(root, file).split(path.sep).join("/"),
                )
                .join("\0") + "\0";
        const result = spawnSync(
            "git",
            ["-C", root, "check-ignore", "--no-index", "-z", "--stdin"],
            {
                input,
                encoding: "utf8",
                timeout: 10000,
                maxBuffer: 32 * 1024 * 1024,
                windowsHide: true,
            },
        );
        if (![0, 1].includes(result.status))
            throw new Error(
                "Cannot check media visibility against Git ignore rules.",
            );
        const ignored = new Set(
            result.stdout
                .split("\0")
                .filter(Boolean)
                .map((file) => path.resolve(root, file)),
        );
        for (const file of eligible)
            remember(file, ignored.has(file) ? "ignored" : null);
    }
    function classify(filePath) {
        const file = path.resolve(filePath);
        prime([file]);
        return { visible: cache.get(file) === null, reason: cache.get(file) };
    }
    function contextVisible(context) {
        if (includePrivate) return true;
        let text = String(context);
        try {
            text = decodeURIComponent(text);
        } catch {
            /* Inspect the original excerpt. */
        }
        const parts = text.split(/[\/\\\s"'<>()[\]{}]+/);
        if (parts.some((part) => /^(?:[._]?private)(?:[._-]|$)/i.test(part)))
            return false;
        return !parts.some((part) => excludedNames.has(part));
    }
    return {
        classify,
        prime,
        includePrivate,
        ignoreSource: git ? "git" : "path-only",
        checkoutLinks,
        contextVisible,
    };
}

module.exports = { createMediaVisibility };
