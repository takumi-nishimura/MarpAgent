const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const {
    collectDeckReferences,
    inspectAssetPath,
    isPathInside,
} = require("./media-reference-graph");
const { createMediaVisibility } = require("./media-visibility");
const { mediaKind, readMediaMetadata } = require("./media-metadata");

function relativePath(root, file) {
    return path.relative(root, file).split(path.sep).join("/");
}

function assetLocation(root, file, decks) {
    if (!file) return { scope: "unknown", deck: null };
    if (isPathInside(path.join(root, "assets"), file))
        return { scope: "shared", deck: null };
    const deck = decks.find((entry) => isPathInside(entry.dir, file));
    return {
        scope: deck ? "deck" : "other",
        deck: deck ? relativePath(root, deck.dir) : null,
    };
}

function unmeasured(reason) {
    return {
        bytes: null,
        hash: null,
        dimensions: { width: null, height: null, reason },
        metadataError: reason,
    };
}

/**
 * Read-only inventory of repo/assets and decks with slide.md or paper.md.
 * Directory links are never traversed; referenced file aliases are added from
 * the common source resolver. Private/external files are never opened.
 */
function buildMediaCatalog({
    repoRoot,
    includePrivate = false,
    includeHidden = true,
    metadata = true,
} = {}) {
    const root = fs.realpathSync.native(
        path.resolve(repoRoot || process.cwd()),
    );
    const visibility = createMediaVisibility(root, { includePrivate });
    const decks = [];
    const discovered = new Set();
    const diagnostics = [];
    const excludedPaths = new Set();
    function isVisible(file) {
        const classification = visibility.classify(file);
        if (!classification.visible && classification.reason !== "outside-repo")
            excludedPaths.add(file);
        return classification.visible;
    }
    function walk(dir, deckScan = false) {
        if (!isVisible(dir)) return;
        let entries;
        try {
            if (fs.lstatSync(dir).isSymbolicLink()) {
                discovered.add(dir);
                return;
            }
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch (error) {
            if (error.code !== "ENOENT")
                diagnostics.push({
                    code: "unreadable-directory",
                    path: relativePath(root, dir),
                    message: `Cannot list directory (${error.code}).`,
                });
            return;
        }
        entries.sort((a, b) => a.name.localeCompare(b.name, "en"));
        visibility.prime(entries.map((entry) => path.join(dir, entry.name)));
        for (const entry of entries) {
            const file = path.join(dir, entry.name);
            if (!isVisible(file)) continue;
            if (entry.isSymbolicLink()) {
                discovered.add(file);
                continue;
            }
            if (entry.isDirectory()) {
                walk(file, deckScan);
                continue;
            }
            if (!entry.isFile()) continue;
            if (deckScan && ["slide.md", "paper.md"].includes(entry.name))
                decks.push({ file, dir: path.dirname(file) });
            if (
                visibility.checkoutLinks.has(file) ||
                ((!deckScan ||
                    relativePath(root, file).split("/").includes("assets")) &&
                    !["slide.md", "paper.md"].includes(entry.name))
            )
                discovered.add(file);
        }
    }
    walk(path.join(root, "assets"));
    walk(path.join(root, "decks"), true);
    decks.sort(
        (a, b) => b.dir.length - a.dir.length || a.file.localeCompare(b.file),
    );
    const records = new Map();
    function inspect(file) {
        const deck = decks.find((entry) => isPathInside(entry.dir, file));
        const result = inspectAssetPath(file, {
            repoRoot: root,
            deckDir: deck?.dir || root,
            policy: "bundle",
        });
        if (
            visibility.checkoutLinks.has(file) &&
            !result.symlinks.some((link) => link.path === file)
        ) {
            result.diagnostics.push({
                code: "symlink-checkout",
                path: file,
                message:
                    "Git symlink is checked out as a regular file; enable symlink checkout on this platform.",
            });
            result.allowed = false;
        }
        return result;
    }
    function resolutionVisible(resolution) {
        const paths = [
            resolution.path,
            resolution.realPath,
            ...resolution.symlinks.flatMap((link) => [
                link.path,
                link.resolvedPath,
            ]),
        ].filter((file) => file && isPathInside(root, file));
        visibility.prime(paths);
        return paths.every(isVisible);
    }
    function addResolution(resolution, reference = null) {
        if (
            !resolution.path ||
            !isPathInside(root, resolution.path) ||
            !resolutionVisible(resolution)
        )
            return false;
        if (
            visibility.checkoutLinks.has(resolution.path) &&
            !resolution.symlinks.some(
                (link) => link.path === resolution.path,
            ) &&
            !resolution.diagnostics.some(
                (item) => item.code === "symlink-checkout",
            )
        ) {
            resolution.diagnostics.push({
                code: "symlink-checkout",
                path: resolution.path,
                message:
                    "Git symlink is checked out as a regular file; enable symlink checkout on this platform.",
            });
            resolution.allowed = false;
        }
        if (!records.has(resolution.path))
            records.set(resolution.path, { resolution, references: [] });
        if (reference) records.get(resolution.path).references.push(reference);
        return true;
    }
    for (const file of discovered) {
        const resolution = inspect(file);
        // Shared is an approved directory link, not an individual media entry.
        if (
            resolution.fileType === "directory" &&
            resolution.symlinks.some((link) => link.shared) &&
            resolution.diagnostics.every((item) => item.code === "not-file")
        )
            continue;
        if (
            resolution.fileType === "directory" &&
            resolution.symlinks.length === 0
        )
            continue;
        addResolution(resolution);
    }
    for (const deck of decks) {
        // Do not read a source whose parent chain resolves outside/private.
        const source = inspect(deck.file);
        if (!source.insideRepo || !resolutionVisible(source)) continue;
        let references;
        try {
            references = collectDeckReferences(deck.file, undefined, {
                repoRoot: root,
                policy: "bundle",
                includeHidden: true,
            });
        } catch (error) {
            diagnostics.push({
                code: "source-unreadable",
                path: relativePath(root, deck.file),
                message: `Cannot inspect source (${error.code || "parse error"}).`,
            });
            continue;
        }
        const redactContext =
            !includePrivate &&
            (references.some(
                (ref) =>
                    ref.path &&
                    (!isPathInside(root, ref.path) ||
                        ref.insideRepo === false ||
                        !resolutionVisible(ref)),
            ) ||
                references.some(
                    (ref) => !visibility.contextVisible(ref.origin.context),
                ));
        for (const reference of references) {
            if (!includeHidden && reference.origin.hidden) continue;
            if (!reference.path) continue;
            if (!isPathInside(root, reference.path)) {
                diagnostics.push({
                    code: "outside-repo",
                    path: relativePath(root, deck.file),
                    line: reference.origin.line,
                    hidden: reference.origin.hidden,
                    message:
                        "Media reference is outside the repository; inspect this source line locally.",
                });
                continue;
            }
            const origin = {
                ...reference.origin,
                file: relativePath(root, reference.origin.file),
            };
            if (redactContext) origin.context = "";
            else
                origin.context = origin.context
                    .replace(/data:[^\s"')>]+/gi, "[embedded media]")
                    .slice(0, 4096);
            addResolution(reference, {
                reference: reference.reference,
                origin,
            });
        }
    }
    const metadataCache = new Map();
    const assets = [];
    for (const [file, { resolution, references }] of records) {
        if (!resolutionVisible(resolution)) continue;
        const real = resolution.insideRepo ? resolution.realPath : null;
        let details = unmeasured(
            metadata
                ? "File is missing, external, or not a regular file."
                : "Metadata not requested.",
        );
        if (
            metadata &&
            real &&
            resolution.fileType === "file" &&
            !resolution.diagnostics.some(
                (item) => item.code === "symlink-checkout",
            )
        ) {
            if (!metadataCache.has(real)) {
                let measured;
                try {
                    if (
                        fs.realpathSync.native(real) !== real ||
                        !isVisible(real)
                    )
                        throw new Error("Media changed before metadata read.");
                    measured = readMediaMetadata(real, {
                        expectedStat: fs.lstatSync(real),
                    });
                } catch {
                    measured = unmeasured(
                        "Cannot verify media before reading metadata.",
                    );
                }
                metadataCache.set(real, measured);
            }
            details = metadataCache.get(real);
        }
        const cleanPath = (value) =>
            value && isPathInside(root, value)
                ? relativePath(root, value)
                : null;
        const cleanLink = (link) => ({
            ...link,
            path: cleanPath(link.path),
            resolvedPath: cleanPath(link.resolvedPath),
            target:
                link.absolute || !cleanPath(link.resolvedPath)
                    ? "[external or absolute target]"
                    : link.target,
        });
        const cleanDiagnostic = (diagnosis) => ({
            ...diagnosis,
            path: cleanPath(diagnosis.path),
            ...(diagnosis.link ? { link: cleanPath(diagnosis.link) } : {}),
            ...(diagnosis.target ? { target: "[inspect link locally]" } : {}),
        });
        assets.push({
            path: relativePath(root, file),
            realPath: cleanPath(real),
            kind: mediaKind(file),
            format: path.extname(file).slice(1).toLowerCase() || null,
            ...details,
            location: assetLocation(root, real, decks),
            symlinks: resolution.symlinks.map(cleanLink),
            diagnostics: resolution.diagnostics
                .filter(
                    (item) =>
                        !(
                            resolution.fileType === "directory" &&
                            item.code === "not-file"
                        ),
                )
                .map(cleanDiagnostic),
            references,
            aliases: [],
            identical: [],
        });
    }
    assets.sort((a, b) => a.path.localeCompare(b.path, "en"));
    const byReal = new Map();
    const byHash = new Map();
    for (const asset of assets) {
        if (asset.realPath) {
            if (!byReal.has(asset.realPath)) byReal.set(asset.realPath, []);
            byReal.get(asset.realPath).push(asset.path);
        }
        if (asset.hash) {
            if (!byHash.has(asset.hash)) byHash.set(asset.hash, []);
            byHash.get(asset.hash).push(asset.path);
        }
    }
    for (const asset of assets) {
        asset.aliases = (byReal.get(asset.realPath) || []).filter(
            (item) => item !== asset.path,
        );
        asset.identical = (byHash.get(asset.hash) || []).filter(
            (item) => item !== asset.path && !asset.aliases.includes(item),
        );
    }
    return {
        schemaVersion: 1,
        repoRoot: root,
        privacy: { includePrivate, ignoreSource: visibility.ignoreSource },
        excluded: { private: excludedPaths.size },
        assets,
        diagnostics,
    };
}

/** Filter existing results without rescanning files or choosing an owner. */
function searchMediaCatalog(catalog, query = "", { type, uses, usedBy } = {}) {
    const needle = String(query).normalize("NFKC").toLocaleLowerCase();
    const normalize = (file) =>
        relativePath(catalog.repoRoot, path.resolve(catalog.repoRoot, file));
    const sourcePath = uses ? normalize(uses) : null;
    const source = sourcePath
        ? catalog.assets.find((asset) => asset.path === sourcePath)
        : null;
    if (sourcePath && !source)
        throw new Error(
            "No visible catalog asset matches --uses; check the path and private visibility option.",
        );
    const consumer = usedBy ? normalize(usedBy) : null;
    const assets = catalog.assets.filter((asset) => {
        if (type && asset.kind !== type && asset.format !== type) return false;
        if (
            sourcePath &&
            asset.path !== sourcePath &&
            (!source?.realPath || asset.realPath !== source.realPath)
        )
            return false;
        if (
            consumer &&
            !asset.references.some(
                (ref) =>
                    ref.origin.file === consumer ||
                    ref.origin.file.startsWith(`${consumer}/`),
            )
        )
            return false;
        return (
            !needle ||
            [
                asset.path,
                asset.realPath,
                asset.kind,
                asset.format,
                ...asset.references.map((ref) => ref.origin.context),
            ]
                .filter(Boolean)
                .join("\n")
                .normalize("NFKC")
                .toLocaleLowerCase()
                .includes(needle)
        );
    });
    return { ...catalog, assets };
}

function escapeHtml(value) {
    return String(value ?? "").replace(
        /[&<>"']/g,
        (character) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            })[character],
    );
}

/** Static local preview; no script, SVG inline content, server or network. */
function renderMediaCatalogHtml(catalog) {
    const href = (file) =>
        escapeHtml(pathToFileURL(path.join(catalog.repoRoot, file)).href);
    const cards = catalog.assets
        .map((asset) => {
            const media =
                asset.realPath && asset.kind === "image"
                    ? `<img loading="lazy" src="${href(asset.realPath)}" alt="">`
                    : asset.realPath && asset.kind === "video"
                      ? `<video controls preload="none" src="${href(asset.realPath)}"></video>`
                      : "";
            const references = asset.references
                .map(
                    ({ origin }) =>
                        `<li><a href="${href(origin.file)}#L${origin.line}">${escapeHtml(origin.file)}:${origin.line}</a> · ${origin.hidden ? "hidden" : origin.scope === "frontmatter" ? "global" : `slide ${origin.slide} · rendered ${origin.renderedSlide} · page ${origin.page ?? "—"}`}<pre>${escapeHtml(origin.context)}</pre></li>`,
                )
                .join("");
            return `<article>${media}<h2><a href="${href(asset.path)}">${escapeHtml(asset.path)}</a></h2><p>${escapeHtml(asset.kind)} · ${asset.bytes ?? "?"} bytes · ${asset.dimensions.width ? `${asset.dimensions.width} × ${asset.dimensions.height}` : escapeHtml(asset.dimensions.reason)}</p><p>Real: ${escapeHtml(asset.realPath ?? "unavailable")}</p><p>${escapeHtml(asset.diagnostics.map((item) => item.code).join(", "))}</p><ul>${references}</ul></article>`;
        })
        .join("\n");
    return `<!doctype html><html lang="en"><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src file:; media-src file:; style-src 'unsafe-inline'"><title>Local media catalog</title><style>body{font:16px system-ui;margin:2rem;background:#f5f6f8;color:#172033}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:1rem}article{background:white;padding:1rem;border:1px solid #d5dae2;border-radius:8px;overflow-wrap:anywhere}img,video{width:100%;height:220px;object-fit:contain}h2{font-size:1rem}pre{white-space:pre-wrap;font:13px monospace}a{color:#185abd}</style><h1>Local media catalog</h1><p>${catalog.assets.length} entries · private ${catalog.privacy.includePrivate ? "included explicitly" : "excluded"} · excluded ${catalog.excluded.private}</p><main>${cards}</main></html>`;
}

module.exports = {
    buildMediaCatalog,
    searchMediaCatalog,
    renderMediaCatalogHtml,
};
