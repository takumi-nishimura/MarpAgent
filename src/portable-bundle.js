const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { parseDocument } = require("htmlparser2");
const { zipSync } = require("fflate");
const { rewriteReferences } = require("./bundle-references");
const {
    resolveAssetReference,
    inspectAssetPath,
    isPathInside: inside,
} = require("./media-reference-graph");

const DEFAULT_MAX_FILES = 10000;
const DEFAULT_MAX_BYTES = 256 * 1024 * 1024;
const EXTENSIONS = new Set(
    ".png .jpg .jpeg .gif .webp .avif .svg .ico .bmp .tif .tiff .mp4 .webm .mov .m4v .ogv .mp3 .wav .ogg .m4a .aac .flac .vtt .css .woff .woff2 .ttf .otf .eot .pdf .js .mjs".split(
        " ",
    ),
);
const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const posix = (value) => value.split(path.sep).join("/");
const RESOLUTION_ERRORS = {
    missing: "MISSING_RESOURCE",
    "broken-symlink": "MISSING_RESOURCE",
    "symlink-cycle": "SYMLINK_CYCLE",
    unreadable: "UNREADABLE_RESOURCE",
    "outside-repo": "OUTSIDE_ROOT",
    "absolute-symlink": "ABSOLUTE_SYMLINK",
    "directory-reuse": "DIRECTORY_REUSE",
    "cross-deck-reference": "CROSS_DECK_REFERENCE",
    "not-file": "NOT_REGULAR_FILE",
};

function isAbsoluteReference(reference) {
    return (
        /^(?:[a-z]:|file:|[/\\])/i.test(reference) &&
        !reference.startsWith("//")
    );
}

function safeReference(reference) {
    let decoded = reference;
    try {
        decoded = decodeURIComponent(reference);
    } catch {}
    return isAbsoluteReference(decoded)
        ? "[absolute local reference]"
        : reference;
}

function walk(node, callback) {
    callback(node);
    for (const child of node.children || []) walk(child, callback);
}

/** Remove production comments and Marp speaker notes without serializing scripts. */
function stripPrivateHtml(html) {
    const doc = parseDocument(html, {
        withStartIndices: true,
        withEndIndices: true,
    });
    const ranges = [];
    const excluded = { comments: 0, speakerNotes: 0 };
    function visit(node) {
        const note = node.attribs?.class
            ?.split(/\s+/)
            .includes("bespoke-marp-note");
        if (node.type === "comment" || note) {
            ranges.push([node.startIndex, node.endIndex + 1]);
            excluded[note ? "speakerNotes" : "comments"] += 1;
            return;
        }
        for (const child of node.children || []) visit(child);
    }
    visit(doc);
    let content = html;
    for (const [start, end] of ranges.sort((a, b) => b[0] - a[0]))
        content = content.slice(0, start) + content.slice(end);
    return { content, excluded };
}

function trustedScriptHashes() {
    const result = new Set();
    const cli = path.dirname(
        require.resolve("@marp-team/marp-cli/package.json"),
    );
    const core = path.dirname(
        require.resolve("@marp-team/marp-core/package.json"),
    );
    for (const file of [
        path.join(cli, "lib/bespoke.js"),
        path.join(core, "lib/browser-iife.iife.js"),
        path.join(__dirname, "../scripts/presenter-cursor.js"),
        path.join(__dirname, "../scripts/presenter-scroll.js"),
    ]) {
        const script = fs
            .readFileSync(file, "utf8")
            .trim()
            .replace(/\n?\/\/# sourceMappingURL=.*$/, "");
        result.add(sha256(script));
    }
    return result;
}

/** Build an inspectable, read-only snapshot. Only referenced ordinary resources enter it. */
function planPortableBundle({
    html,
    deckPath,
    repoRoot,
    strictOffline = false,
    maxFiles = DEFAULT_MAX_FILES,
    maxBytes = DEFAULT_MAX_BYTES,
    renderer = {},
    resolveReference = resolveAssetReference,
} = {}) {
    if (typeof html !== "string")
        throw new TypeError("html must be a rendered HTML string");
    for (const [name, value] of Object.entries({ maxFiles, maxBytes })) {
        if (!Number.isSafeInteger(value) || value < 1)
            throw new TypeError(`${name} must be a positive safe integer`);
    }
    const root = fs.realpathSync(repoRoot);
    const requestedRoot = path.resolve(repoRoot);
    const requestedDeck = path.resolve(deckPath);
    const deck = inside(requestedRoot, requestedDeck)
        ? path.resolve(root, path.relative(requestedRoot, requestedDeck))
        : requestedDeck;
    const realDeck = fs.realpathSync(deck);
    if (!inside(root, deck) || !inside(root, realDeck))
        throw new Error("Deck is outside the bundle root");
    const relative = (file) =>
        inside(root, file)
            ? posix(path.relative(root, file))
            : "[outside bundle root]";
    const errors = [];
    const nodes = new Map();
    const sourcePaths = new Set([realDeck]);
    const references = [];
    const remote = new Map();
    const unsupported = [];
    const prepared = stripPrivateHtml(html);
    const doc = parseDocument(prepared.content);
    const slides = [];
    walk(doc, (node) => {
        if (node.name !== "section") return;
        for (let ancestor = node.parent; ancestor; ancestor = ancestor.parent) {
            if (ancestor.name === "section") return;
        }
        slides.push({
            renderedSlide: slides.length + 1,
            sectionId: node.attribs?.id || null,
            displayedPage: /^\d+$/.test(
                node.attribs?.["data-marpit-pagination"] || "",
            )
                ? Number(node.attribs["data-marpit-pagination"])
                : null,
        });
    });
    const allPages = slides.map((slide) => slide.renderedSlide);
    const trusted = trustedScriptHashes();
    function inspectDocument(document, from, trustScripts) {
        walk(document, (node) => {
            if (node.name === "base" || node.attribs?.["xml:base"])
                errors.push({
                    code: "CUSTOM_BASE",
                    from,
                    message: "Custom URL bases are unsupported.",
                });
            if (node.name === "script" && !node.attribs?.src) {
                const type = (node.attribs?.type || "").toLowerCase();
                const body = (node.children || [])
                    .map((c) => c.data || "")
                    .join("")
                    .trim();
                if (
                    body &&
                    !["application/json", "application/ld+json"].includes(
                        type,
                    ) &&
                    !(trustScripts && trusted.has(sha256(body)))
                )
                    unsupported.push({
                        code: "DYNAMIC_SCRIPT",
                        from,
                        message:
                            "Dependencies of custom inline JavaScript are not analyzed.",
                    });
            }
            if (node.name === "iframe")
                unsupported.push({
                    code: "EMBEDDED_DOCUMENT",
                    from,
                    reference: safeReference(
                        node.attribs?.src || "[inline document]",
                    ),
                    message:
                        "Embedded documents and their runtime dependencies are unsupported.",
                });
            if (
                Object.keys(node.attribs || {}).some((key) =>
                    /^on[a-z]/i.test(key),
                )
            )
                unsupported.push({
                    code: "DYNAMIC_HANDLER",
                    from,
                    message:
                        "Dependencies of inline JavaScript event handlers are not analyzed.",
                });
        });
    }
    inspectDocument(doc, relative(deck), true);
    let totalBytes = 0;
    const addError = (code, from, reference) =>
        errors.push({ code, from, reference: safeReference(reference) });

    function rewrite(
        content,
        kind,
        sourcePath,
        archivePath,
        pages,
        active,
        parent,
    ) {
        const from = relative(sourcePath);
        const result = rewriteReferences(content, {
            kind,
            onReference(reference, context = {}) {
                const value = String(reference).trim();
                const usedPages = context.page == null ? pages : [context.page];
                if (!value || value.startsWith("#") || /^data:/i.test(value))
                    return reference;
                const record = {
                    from,
                    reference: safeReference(value),
                    pages: usedPages,
                    parent,
                };
                references.push(record);
                if (/^(?:https?:)?\/\//i.test(value)) {
                    const key = `${from}\0${value}`;
                    if (!remote.has(key))
                        remote.set(key, {
                            from,
                            reference: value,
                            pages: new Set(),
                            parent,
                        });
                    for (const page of usedPages)
                        remote.get(key).pages.add(page);
                    return reference;
                }
                if (isAbsoluteReference(value)) {
                    addError("ABSOLUTE_REFERENCE", from, value);
                    return reference;
                }
                if (/^[a-z][a-z\d+.-]*:/i.test(value)) {
                    unsupported.push({
                        code: "URL_SCHEME",
                        from,
                        reference: safeReference(value),
                        message: "Resource URL scheme is unsupported.",
                    });
                    return reference;
                }
                const split = value.search(/[?#]/);
                const pathname = split < 0 ? value : value.slice(0, split);
                const suffix = split < 0 ? "" : value.slice(split);
                let decoded;
                try {
                    decoded = decodeURIComponent(pathname);
                } catch {
                    addError("INVALID_URL", from, value);
                    return reference;
                }
                if (
                    isAbsoluteReference(decoded) ||
                    decoded.includes("\\") ||
                    /[\u0000-\u001f]/.test(decoded)
                ) {
                    addError("ABSOLUTE_REFERENCE", from, value);
                    return reference;
                }
                const sourceDir = path.dirname(sourcePath);
                if (!inside(root, path.resolve(sourceDir, decoded))) {
                    addError("OUTSIDE_ROOT", from, value);
                    return reference;
                }
                const resolution = resolveReference(value, {
                    repoRoot: root,
                    deckDir: sourceDir,
                    policy: "bundle",
                });
                if (resolution.kind !== "local" || !resolution.path) {
                    addError("UNRESOLVED_RESOURCE", from, value);
                    return reference;
                }
                // Resolve URLs against each resource, then apply the consuming
                // deck's policy scope so CSS ../img is not cross-deck reuse.
                const inspected =
                    sourceDir === path.dirname(deck)
                        ? resolution
                        : inspectAssetPath(resolution.path, {
                              repoRoot: root,
                              deckDir: path.dirname(deck),
                              policy: "bundle",
                          });
                if (!inspected.allowed) {
                    const codes = new Set(
                        inspected.diagnostics.map(
                            (item) =>
                                RESOLUTION_ERRORS[item.code] ||
                                "UNRESOLVED_RESOURCE",
                        ),
                    );
                    if (codes.size === 0) codes.add("UNRESOLVED_RESOURCE");
                    // API diagnostics contain absolute paths; only stable codes
                    // and the original reference cross the manifest boundary.
                    for (const code of codes) addError(code, from, value);
                    return reference;
                }
                const local = inspected.path;
                const real = inspected.realPath;
                if (!inside(root, local) || !real || !inside(root, real)) {
                    addError("OUTSIDE_ROOT", from, value);
                    return reference;
                }
                const names = relative(real).split("/");
                if (
                    names.some(
                        (name) =>
                            name.startsWith(".") ||
                            /^(?:brief|notes?)(?:\.|$)/i.test(name),
                    ) ||
                    relative(local)
                        .split("/")
                        .some((name) => name.startsWith("."))
                ) {
                    addError("PRIVATE_RESOURCE", from, value);
                    return reference;
                }
                let stats;
                try {
                    stats = fs.statSync(real);
                } catch {
                    addError("UNREADABLE_RESOURCE", from, value);
                    return reference;
                }
                if (!stats.isFile()) {
                    addError("NOT_REGULAR_FILE", from, value);
                    return reference;
                }
                const ext = path.extname(real).toLowerCase();
                if (!EXTENSIONS.has(ext)) {
                    addError("PRIVATE_RESOURCE", from, value);
                    return reference;
                }
                if (!(stats.mode & 0o444)) {
                    addError("UNREADABLE_RESOURCE", from, value);
                    return reference;
                }
                const kindOfResource =
                    ext === ".css" ? "css" : ext === ".svg" ? "svg" : null;
                // Aliases of CSS/SVG may have different browser bases; retain that distinction.
                const identity =
                    relative(real) +
                    (kindOfResource
                        ? `\0${relative(path.dirname(local))}`
                        : "");
                if (active.has(identity)) {
                    addError("DEPENDENCY_CYCLE", from, value);
                    return reference;
                }
                if (!nodes.has(identity)) {
                    if (nodes.size >= maxFiles) {
                        addError("FILE_LIMIT", from, value);
                        return reference;
                    }
                    if (totalBytes + stats.size > maxBytes) {
                        addError("BYTE_LIMIT", from, value);
                        return reference;
                    }
                    let data;
                    try {
                        // O_NONBLOCK prevents a swapped FIFO from hanging a packaging process.
                        const fd = fs.openSync(
                            local,
                            fs.constants.O_RDONLY | fs.constants.O_NONBLOCK,
                        );
                        try {
                            const opened = fs.fstatSync(fd);
                            if (
                                !opened.isFile() ||
                                opened.dev !== stats.dev ||
                                opened.ino !== stats.ino ||
                                fs.realpathSync.native(local) !== real
                            ) {
                                addError("RESOURCE_CHANGED", from, value);
                                return reference;
                            }
                            const chunks = [];
                            let size = 0;
                            const chunk = Buffer.alloc(65536);
                            for (;;) {
                                const count = fs.readSync(
                                    fd,
                                    chunk,
                                    0,
                                    Math.min(
                                        chunk.length,
                                        maxBytes - totalBytes - size + 1,
                                    ),
                                    null,
                                );
                                if (count === 0) break;
                                size += count;
                                if (totalBytes + size > maxBytes) {
                                    addError("BYTE_LIMIT", from, value);
                                    return reference;
                                }
                                chunks.push(
                                    Buffer.from(chunk.subarray(0, count)),
                                );
                            }
                            data = Buffer.concat(chunks);
                        } finally {
                            fs.closeSync(fd);
                        }
                    } catch {
                        addError("UNREADABLE_RESOURCE", from, value);
                        return reference;
                    }
                    totalBytes += data.length;
                    sourcePaths.add(real);
                    const target = `assets/${sha256(identity)}${ext}`;
                    const node = {
                        path: target,
                        source: relative(real),
                        data,
                        sourceSha256: sha256(data),
                        pages: new Set(usedPages),
                        children: new Set(),
                    };
                    nodes.set(identity, node);
                    if (kindOfResource === "svg")
                        inspectDocument(
                            parseDocument(data.toString("utf8"), {
                                xmlMode: true,
                            }),
                            node.source,
                            false,
                        );
                    if (kindOfResource)
                        node.data = Buffer.from(
                            rewrite(
                                data.toString("utf8"),
                                kindOfResource,
                                local,
                                target,
                                usedPages,
                                new Set([...active, identity]),
                                identity,
                            ),
                        );
                    if ([".js", ".mjs"].includes(ext))
                        unsupported.push({
                            code: "DYNAMIC_SCRIPT",
                            from: node.source,
                            message:
                                "JavaScript is included as a static file; its dependencies are not analyzed.",
                        });
                }
                const node = nodes.get(identity);
                for (const page of usedPages) node.pages.add(page);
                if (parent) nodes.get(parent)?.children.add(identity);
                record.target = node.path;
                const resultPath = path.posix.relative(
                    path.posix.dirname(archivePath),
                    node.path,
                );
                return resultPath + suffix;
            },
        });
        for (const finding of result.unsupported || [])
            unsupported.push({
                ...finding,
                ...(finding.reference
                    ? { reference: safeReference(finding.reference) }
                    : {}),
                from,
            });
        return result.content;
    }

    const rewritten = Buffer.from(
        rewrite(
            prepared.content,
            "html",
            deck,
            "index.html",
            allPages,
            new Set(),
            null,
        ),
    );
    // Propagate uses through shared CSS/SVG nodes after all root references are known.
    let changed;
    do {
        changed = false;
        for (const node of nodes.values())
            for (const child of node.children)
                for (const page of node.pages) {
                    const target = nodes.get(child);
                    if (!target.pages.has(page)) {
                        target.pages.add(page);
                        changed = true;
                    }
                }
    } while (changed);
    const sortedPages = (pages) => [...pages].sort((a, b) => a - b);
    const remotes = [...remote.values()]
        .map(({ parent, pages, ...entry }) => ({
            ...entry,
            pages: sortedPages(parent ? nodes.get(parent).pages : pages),
        }))
        .sort((a, b) =>
            `${a.from}\0${a.reference}`.localeCompare(
                `${b.from}\0${b.reference}`,
                "en",
            ),
        );
    const unsupportedItems = [
        ...new Map(
            unsupported.map((item) => [JSON.stringify(item), item]),
        ).values(),
    ];
    if (strictOffline) {
        for (const dependency of [...remotes, ...unsupportedItems])
            errors.push({
                code: "OFFLINE_DEPENDENCY",
                from: dependency.from,
                ...(dependency.reference
                    ? { reference: dependency.reference }
                    : {}),
                message:
                    dependency.message ||
                    "Remote resource remains in strict offline mode.",
            });
    }
    const files = [
        { path: "index.html", data: rewritten },
        ...[...nodes.values()].map(({ path, data }) => ({ path, data })),
    ].sort((a, b) => a.path.localeCompare(b.path, "en"));
    if (
        files
            .filter((file) => file.path !== "index.html")
            .reduce((sum, file) => sum + file.data.length, 0) > maxBytes &&
        !errors.some((error) => error.code === "BYTE_LIMIT")
    )
        errors.push({
            code: "BYTE_LIMIT",
            from: relative(deck),
            message: "Rewritten resource bytes exceed the bundle limit.",
        });
    const byArchivePath = new Map(
        [...nodes.values()].map((node) => [node.path, node]),
    );
    const manifest = {
        schemaVersion: 1,
        entrypoint: "index.html",
        deck: relative(deck),
        slides,
        renderer: {
            marpCli: require("@marp-team/marp-cli/package.json").version,
            marpCore: require("@marp-team/marp-core/package.json").version,
            ...renderer,
        },
        policies: {
            speakerNotes: "excluded",
            productionComments: "excluded",
            collection:
                "Rendered HTML and transitively referenced CSS/SVG; all CSS rules are collected conservatively.",
            javascript:
                "Only the installed Marp runtime and presenter helpers are known; custom dynamic dependencies are unsupported.",
            fonts: "Only explicitly referenced repository files; no operating-system fonts are collected.",
            pageNumbers: "1-based rendered slide positions",
            reproducibility:
                "Stable order, paths, ZIP timestamps, and content hashes for the same rendered HTML; renderer changes may change output.",
        },
        limits: { maxFiles, maxBytes },
        files: files.map((file) => {
            const node = byArchivePath.get(file.path);
            return {
                path: file.path,
                ...(node
                    ? {
                          source: node.source,
                          sourceSha256: node.sourceSha256,
                          pages: sortedPages(node.pages),
                      }
                    : { pages: allPages }),
                size: file.data.length,
                sha256: sha256(file.data),
            };
        }),
        totalBytes: files.reduce((sum, file) => sum + file.data.length, 0),
        references: references.map(({ parent, ...reference }) => ({
            ...reference,
            pages: parent
                ? sortedPages(nodes.get(parent).pages)
                : reference.pages,
        })),
        remoteDependencies: remotes,
        unsupported: unsupportedItems,
        exclusions: {
            ...prepared.excluded,
            policy: "Unreferenced files, source Markdown, notes, dotfiles, and editing/data formats are not collected.",
        },
        errors,
    };
    const readme = {
        path: "README.txt",
        data: Buffer.from(bundleReadme(manifest)),
    };
    files.push(readme);
    files.sort((a, b) => a.path.localeCompare(b.path, "en"));
    manifest.files.push({
        path: readme.path,
        pages: [],
        size: readme.data.length,
        sha256: sha256(readme.data),
    });
    manifest.files.sort((a, b) => a.path.localeCompare(b.path, "en"));
    manifest.totalBytes += readme.data.length;
    manifest.metadataFiles = ["manifest.json"];
    return { manifest, files, errors, sourcePaths };
}

function bundleReadme(manifest) {
    const dependencies = [
        ...manifest.remoteDependencies.map(
            (item) => `${item.reference} (from ${item.from})`,
        ),
        ...manifest.unsupported.map(
            (item) => `${item.code}: ${item.message || item.reference}`,
        ),
    ];
    return `MarpAgent portable HTML bundle\n\nOpen index.html in a current desktop browser. Local image/CSS/SVG/video/audio\nloading and slide navigation are tested in Chromium using both file: and HTTP.\nBrowser security rules may restrict file: fonts, cross-document SVG references,\nmedia codecs, and presenter-window synchronization. Prefer a local HTTP server.\nWith Python 3 installed, run in this extracted directory:\n  python3 -m http.server 8000 --bind 127.0.0.1\nThen open http://127.0.0.1:8000/index.html. Any static server serving this\ndirectory as its root is suitable. No server is included in the bundle.\n\nSpeaker notes and production comments are excluded. Visible citations remain.\nThe manifest lists SHA-256 hashes of the rewritten archive files (not ZIP\ncompression bytes), their sources, and rendered slide positions. manifest.json\ndoes not hash itself. ZIP timestamps and file modes are fixed.\nAll CSS rules are collected conservatively, including unused selectors.\nOnly explicitly referenced repository fonts are collected; redistribution\npermission remains the publisher's responsibility. OS fonts are never copied.\nCustom JavaScript dependencies are not analyzed or executed during collection.\nFonts without bundled files and unsupported media codecs can change appearance.\n\nRemaining remote/unsupported dependencies:\n${dependencies.length ? dependencies.map((value) => `- ${value}`).join("\n") : "- None detected by static resource analysis; the bundled Marp runtime is supported."}\n`;
}

/** Publish a complete ZIP with atomic replacement; never truncate an existing output. */
function writePortableBundle(plan, { outputPath, force = false } = {}) {
    if (plan.errors.length)
        throw new Error(
            "Cannot write an invalid bundle plan with resource errors",
        );
    const output = path.resolve(outputPath);
    if (fs.existsSync(output) && plan.sourcePaths?.has(fs.realpathSync(output)))
        throw new Error("Output would overwrite a source file or resource");
    if (fs.existsSync(output) && !force)
        throw new Error(
            "Refusing to overwrite an existing output; use --force",
        );
    const entries = Object.create(null);
    for (const file of [
        ...plan.files,
        {
            path: "manifest.json",
            data: Buffer.from(JSON.stringify(plan.manifest, null, 2) + "\n"),
        },
    ]) {
        const name = file.path;
        if (
            typeof name !== "string" ||
            !name ||
            name.includes("\\") ||
            /[\u0000-\u001f]/.test(name) ||
            path.posix.isAbsolute(name) ||
            name.split("/").some((p) => p === ".." || p === "." || p === "") ||
            /^[a-z]:/i.test(name) ||
            entries[name]
        )
            throw new Error("Unsafe or duplicate ZIP entry path");
        entries[name] = [
            file.data,
            {
                mtime: new Date(1980, 0, 1),
                os: 3,
                attrs: (0o100644 << 16) >>> 0,
            },
        ];
    }
    const parent = path.dirname(output);
    fs.mkdirSync(parent, { recursive: true });
    const stage = fs.mkdtempSync(path.join(parent, ".marp-bundle-"));
    try {
        const temporary = path.join(stage, "bundle.zip");
        fs.writeFileSync(temporary, zipSync(entries, { level: 6 }));
        if (force) fs.renameSync(temporary, output);
        else fs.linkSync(temporary, output);
    } finally {
        fs.rmSync(stage, { recursive: true, force: true });
    }
    return { outputPath: output, manifest: plan.manifest };
}

module.exports = {
    DEFAULT_MAX_BYTES,
    DEFAULT_MAX_FILES,
    planPortableBundle,
    stripPrivateHtml,
    writePortableBundle,
};
