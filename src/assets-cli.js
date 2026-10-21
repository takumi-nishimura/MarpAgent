const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { parseArgs } = require("node:util");
const {
    buildMediaCatalog,
    searchMediaCatalog,
    renderMediaCatalogHtml,
} = require("./media-catalog");
const { planMediaReuse, reuseMediaAsset } = require("./media-reuse");

const USAGE = `Usage: marpx assets <command> [options]

Commands:
  list                      List repository media and source locations
  search <query>            Search filenames and source context
  doctor                    Diagnose media paths and links (exit 1 on findings)
  reuse <source> <dest>      Create a named relative file symlink

Options:
  --repo <path>             Repository root (default: current directory)
  --format <text|json>      Output format (default: text)
  --type <kind|extension>   Filter image/video/audio/font/document or extension
  --uses <asset>            List an asset and aliases with their consumers
  --used-by <deck|source>   Filter by a consuming deck or source file
  --visible-only           Exclude references on hidden slides
  --include-private        Include private paths and Git-ignored media explicitly
  --preview                Write a static local HTML preview in the temp directory
  --dry-run                Describe reuse without creating a link or directories
  -h, --help               Show help

Paths are repository-relative or absolute filesystem paths. Reuse destinations
must be inside a consuming deck's assets directory. No existing path is replaced.
Listing/search/doctor never edit source or media. Preview creates only temp output.
`;

function terminalText(value) {
    return String(value ?? "").replace(
        /[\u0000-\u001f\u007f-\u009f]/g,
        (character) => JSON.stringify(character).slice(1, -1),
    );
}

function formatCatalog(catalog) {
    const output = [
        `${catalog.assets.length} media entries · private ${catalog.privacy.includePrivate ? "included explicitly" : "excluded"} · excluded paths ${catalog.excluded.private}`,
    ];
    for (const asset of catalog.assets) {
        const dimension = asset.dimensions.width
            ? `${asset.dimensions.width} × ${asset.dimensions.height} ${asset.dimensions.unit || ""}`.trim()
            : asset.dimensions.reason;
        output.push(
            `\n${terminalText(asset.path)} [${asset.kind}/${asset.format || "unknown"}]`,
            `  ${asset.bytes ?? "?"} bytes · ${terminalText(dimension)}`,
            `  sha256: ${asset.hash || "unavailable"}`,
            `  real: ${terminalText(asset.realPath || "unavailable")}`,
        );
        if (asset.location.deck)
            output.push(`  located in: ${terminalText(asset.location.deck)}`);
        for (const link of asset.symlinks)
            output.push(
                `  link: ${terminalText(link.path)} -> ${terminalText(link.target)}`,
            );
        if (asset.aliases.length)
            output.push(
                `  aliases: ${asset.aliases.map(terminalText).join(", ")}`,
            );
        if (asset.identical.length)
            output.push(
                `  identical content candidates: ${asset.identical.map(terminalText).join(", ")}`,
            );
        for (const { origin } of asset.references) {
            const page = origin.hidden
                ? `hidden slide ${origin.slide}`
                : origin.scope === "frontmatter"
                  ? "frontmatter (global)"
                  : `slide ${origin.slide} · rendered ${origin.renderedSlide} · page ${origin.page ?? "—"}`;
            output.push(
                `  used by: ${terminalText(origin.file)}:${origin.line} · ${page}`,
            );
            if (origin.context)
                output.push(`    ${terminalText(origin.context)}`);
        }
        for (const item of asset.diagnostics)
            output.push(
                `  ${item.code}: ${terminalText(item.message)}${item.link ? ` [${terminalText(item.link)}]` : ""}`,
            );
    }
    for (const item of catalog.diagnostics)
        output.push(
            `${terminalText(item.path)}${item.line ? `:${item.line}` : ""}: ${item.code}: ${terminalText(item.message)}`,
        );
    if (catalog.previewPath)
        output.push(`\nLocal preview: ${terminalText(catalog.previewPath)}`);
    return output.join("\n") + "\n";
}

/** Synchronous command entry point shared by marpx and the standalone script. */
function runAssetsCli(args = process.argv.slice(2), io = process) {
    let status = 0;
    try {
        const { values, positionals } = parseArgs({
            args,
            allowPositionals: true,
            strict: true,
            options: {
                repo: { type: "string" },
                format: { type: "string", default: "text" },
                type: { type: "string" },
                uses: { type: "string" },
                "used-by": { type: "string" },
                "include-private": { type: "boolean", default: false },
                "visible-only": { type: "boolean", default: false },
                preview: { type: "boolean", default: false },
                "dry-run": { type: "boolean", default: false },
                help: { type: "boolean", short: "h", default: false },
            },
        });
        if (values.help || positionals.length === 0) {
            io.stdout.write(USAGE);
            return 0;
        }
        const [command, ...inputs] = positionals;
        if (!["list", "search", "doctor", "reuse"].includes(command))
            throw new Error(`Unknown assets command: ${terminalText(command)}`);
        if (!["text", "json"].includes(values.format))
            throw new Error("Assets --format must be text or json.");
        if (values["dry-run"] && command !== "reuse")
            throw new Error("Assets --dry-run is only valid for reuse.");
        if (
            command === "reuse" &&
            (values.preview ||
                values.type ||
                values.uses ||
                values["used-by"] ||
                values["visible-only"])
        )
            throw new Error(
                "Preview and search filters are only valid for list/search/doctor.",
            );
        if (values.preview && command === "doctor")
            throw new Error("--preview is only valid for list or search.");
        if (
            command === "search" &&
            (inputs.length === 0 || inputs.join(" ").trim() === "")
        )
            throw new Error(
                "Search requires a query; use list for filter-only queries.",
            );
        if (["list", "doctor"].includes(command) && inputs.length)
            throw new Error(`${command} does not accept positional arguments.`);
        const options = {
            repoRoot: path.resolve(values.repo || process.cwd()),
            includePrivate: values["include-private"],
        };
        if (command === "reuse") {
            if (inputs.length !== 2)
                throw new Error("Reuse requires a source and a destination.");
            const plan = planMediaReuse({
                ...options,
                source: inputs[0],
                destination: inputs[1],
            });
            const result = reuseMediaAsset(plan, { dryRun: values["dry-run"] });
            io.stdout.write(
                values.format === "json"
                    ? JSON.stringify(result, null, 2) + "\n"
                    : `${result.created ? "Created" : "Dry run"}: ${terminalText(result.destination)} -> ${terminalText(result.target)}\nSource: ${terminalText(result.source)}\nReal source: ${terminalText(result.sourceRealPath)}\nMarkdown: ${terminalText(result.reference)}\n`,
            );
        } else {
            let catalog = buildMediaCatalog({
                ...options,
                includeHidden: !values["visible-only"],
                metadata: command !== "doctor",
            });
            catalog = searchMediaCatalog(
                catalog,
                command === "search" ? inputs.join(" ") : "",
                {
                    type: values.type?.toLowerCase(),
                    uses: values.uses,
                    usedBy: values["used-by"],
                },
            );
            if (command === "doctor") {
                catalog = {
                    ...catalog,
                    assets: catalog.assets.filter(
                        (asset) => asset.diagnostics.length > 0,
                    ),
                };
                status =
                    catalog.assets.length > 0 || catalog.diagnostics.length > 0
                        ? 1
                        : 0;
            }
            if (values.preview) {
                const directory = fs.mkdtempSync(
                    path.join(os.tmpdir(), "marpagent-media-"),
                );
                catalog.previewPath = path.join(directory, "catalog.html");
                fs.writeFileSync(
                    catalog.previewPath,
                    renderMediaCatalogHtml(catalog),
                    { mode: 0o600 },
                );
            }
            io.stdout.write(
                values.format === "json"
                    ? JSON.stringify(catalog, null, 2) + "\n"
                    : formatCatalog(catalog),
            );
        }
    } catch (error) {
        io.stderr.write(`Error: ${terminalText(error.message)}\n`);
        status = 1;
    }
    io.exitCode = status;
    return status;
}

module.exports = { runAssetsCli, formatCatalog };
