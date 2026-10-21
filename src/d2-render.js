const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { runD2ProcessSync } = require("./d2-process");
const { prepareD2Svg } = require("./d2-svg");

const D2_VERSION = "0.9.0";
const PRELUDE =
    "vars: {d2-config: {layout-engine: tala; data: {tala-seeds: [1; 2; 3]}}}\n";
const INPUT_LIMIT = 1024 * 1024;
const OUTPUT_LIMIT = 16 * 1024 * 1024;
const DEFAULT_CACHE = path.join(
    __dirname,
    "../node_modules/.cache/marpagent-d2",
);
const versionCache = new Map();
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const FONT_FLAGS = [
    "regular",
    "bold",
    "semibold",
    "mono",
    "mono-bold",
    "mono-semibold",
];

function failure(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

// This is a deliberately conservative capability check for trusted local
// sources, not a sandbox for hostile D2. Quoted labels and code block strings
// are distinguished from imports, reserved keys and Markdown resources.
function assertSelfContainedD2(source) {
    const tokens = [];
    let index = 0;
    while (index < source.length) {
        const char = source[index];
        if (/\s/.test(char)) {
            index++;
            continue;
        }
        if (char === "#") {
            while (index < source.length && source[index] !== "\n") index++;
            continue;
        }
        if (char === "@")
            throw failure(
                "D2_UNSUPPORTED_SOURCE",
                "Only self-contained D2 is supported: imports (@) are unsupported.",
            );
        if (char === "|") {
            const start = index;
            while (source[index] === "|") index++;
            const marker = source.slice(start, index);
            const lineEnd = source.indexOf("\n", index);
            if (lineEnd < 0)
                throw failure(
                    "D2_UNSUPPORTED_SOURCE",
                    "Unsupported D2 block string; use a multiline block.",
                );
            const language = source
                .slice(index, lineEnd)
                .trim()
                .split(/\s/)[0]
                .toLowerCase();
            const end = new RegExp(
                `^[ \\t]*${marker.replaceAll("|", "\\|")}[ \\t]*(?:;|$)`,
                "gm",
            );
            end.lastIndex = lineEnd + 1;
            const closing = end.exec(source);
            if (!closing)
                throw failure(
                    "D2_UNSUPPORTED_SOURCE",
                    "Unsupported or unterminated D2 block string.",
                );
            const content = source.slice(lineEnd + 1, closing.index);
            if (
                ["md", "markdown", ""].includes(language) &&
                content.includes("${")
            ) {
                throw failure(
                    "D2_UNSUPPORTED_SOURCE",
                    "Only self-contained D2 is supported: substitutions inside Markdown labels are unsupported.",
                );
            }
            if (
                ["md", "markdown", ""].includes(language) &&
                /!\s*\[|\]\s*\(|<\s*\/?[a-z]|(?:https?|file):/i.test(content)
            )
                throw failure(
                    "D2_UNSUPPORTED_SOURCE",
                    "Only self-contained D2 is supported: Markdown links, images and HTML are unsupported.",
                );
            index = closing.index + closing[0].length;
            continue;
        }
        if (char === '"' || char === "'") {
            const quote = char;
            let value = "";
            index++;
            while (index < source.length && source[index] !== quote) {
                if (source[index] === "\\" && index + 1 < source.length)
                    index++;
                value += source[index++];
            }
            index++;
            tokens.push(value);
            continue;
        }
        if (/[{}:;.\[\]]/.test(char)) {
            tokens.push(char);
            index++;
            continue;
        }
        let value = "";
        while (
            index < source.length &&
            !/[\s{}:;.\[\]"'|#@]/.test(source[index])
        ) {
            if (source[index] === "\\" && index + 1 < source.length) index++;
            value += source[index++];
        }
        if (value) tokens.push(value);
        else index++;
    }
    for (let n = 0; n < tokens.length; n++) {
        const key = tokens[n].toLowerCase();
        if (
            ["icon", "link", "layers", "scenarios", "steps"].includes(key) &&
            [":", "."].includes(tokens[n + 1])
        )
            throw failure(
                "D2_UNSUPPORTED_SOURCE",
                `Only self-contained static D2 is supported: ${key} is unsupported.`,
            );
        if (
            key === "layout-engine" &&
            tokens[n + 1] === ":" &&
            !["tala", "elk", "dagre", "null"].includes(tokens[n + 2])
        )
            throw failure(
                "D2_UNSUPPORTED_SOURCE",
                "Unsupported D2 layout engine; use tala, elk or dagre as a literal.",
            );
    }
}

function d2Environment(env) {
    return Object.fromEntries(
        Object.entries(env).filter(
            ([name]) =>
                !/^D2_/i.test(name) &&
                ![
                    "DEBUG",
                    "SCALE",
                    "OMIT_VERSION",
                    "IMG_CACHE",
                    "BROWSER",
                    "HOST",
                    "PORT",
                ].includes(name),
        ),
    );
}

function executableOnPath(name, env, cwd) {
    const candidates = /[/\\]/.test(name)
        ? [path.resolve(cwd, name)]
        : (env.PATH || env.Path || "")
              .split(path.delimiter)
              .flatMap((directory) => {
                  const candidate = path.resolve(cwd, directory, name);
                  return process.platform === "win32"
                      ? [candidate, `${candidate}.exe`]
                      : [candidate];
              });
    let inaccessible;
    for (const candidate of candidates) {
        try {
            fs.accessSync(candidate, fs.constants.X_OK);
            if (fs.statSync(candidate).isFile()) return candidate;
        } catch (error) {
            if (["EACCES", "EPERM"].includes(error.code))
                inaccessible = candidate;
        }
    }
    if (inaccessible)
        throw failure(
            "D2_NOT_EXECUTABLE",
            `D2 executable is not executable: ${inaccessible}. Check its execute permission.`,
        );
    throw failure(
        "D2_NOT_FOUND",
        `D2 executable not found: ${name}. Install D2 ${D2_VERSION} explicitly, then set MARP_AGENT_D2_PATH or PATH.`,
    );
}

function timeoutFor(env) {
    const value = env.MARP_AGENT_D2_TIMEOUT_MS ?? "30000";
    if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 2147483647)
        throw failure(
            "D2_INVALID_CONFIG",
            "MARP_AGENT_D2_TIMEOUT_MS must be an integer from 1 to 2147483647.",
        );
    return Number(value);
}

function resolveD2({ env = process.env, cwd = process.cwd() } = {}) {
    const childEnv = d2Environment(env);
    const timeoutMs = timeoutFor(env);
    let executable = executableOnPath(env.MARP_AGENT_D2_PATH || "d2", env, cwd);
    // Resolve mise in the caller's project before any temporary render tree is
    // used. Hash the selected binary, not the shim shared by all tool versions.
    if (/[\\/]mise[\\/]shims[\\/]/.test(executable)) {
        const mise = executableOnPath("mise", env, cwd);
        executable = runD2ProcessSync(mise, ["which", "d2"], {
            cwd,
            env: childEnv,
            timeoutMs,
            maxBuffer: 65536,
        }).stdout.trim();
        if (!path.isAbsolute(executable))
            throw failure(
                "D2_NOT_FOUND",
                "mise did not resolve an absolute D2 executable.",
            );
    }
    executable = fs.realpathSync(executable);
    const binaryHash = hash(fs.readFileSync(executable));
    const identity = JSON.stringify({ executable, binaryHash });
    let version = versionCache.get(identity);
    if (!version) {
        const result = runD2ProcessSync(executable, ["--version"], {
            cwd,
            env: childEnv,
            timeoutMs,
            maxBuffer: 65536,
        });
        version = result.stdout.trim().replace(/^v/, "");
        if (version !== D2_VERSION)
            throw failure(
                "D2_UNSUPPORTED_VERSION",
                `D2 ${D2_VERSION} is required; ${executable} reported ${version || "an unknown version"}.`,
            );
        versionCache.set(identity, version);
        if (versionCache.size > 32)
            versionCache.delete(versionCache.keys().next().value);
    }
    return { executable, binaryHash, version, env: childEnv, timeoutMs };
}

function pruneCache(directory) {
    try {
        for (const name of fs.readdirSync(directory)) {
            const temporary = /^[a-f0-9]{64}\.(\d+)\.[a-f0-9]+\.tmp$/.exec(
                name,
            );
            if (!temporary) continue;
            try {
                process.kill(Number(temporary[1]), 0);
            } catch (error) {
                if (error.code === "ESRCH")
                    fs.rmSync(path.join(directory, name), { force: true });
            }
        }
        const files = fs
            .readdirSync(directory)
            .filter((name) => /^[a-f0-9]{64}\.svg$/.test(name))
            .map((name) => ({
                name,
                mtime: fs.statSync(path.join(directory, name)).mtimeMs,
            }))
            .sort((a, b) => b.mtime - a.mtime);
        for (const file of files.filter(
            (item, index) =>
                index >= 256 || Date.now() - item.mtime > 30 * 86400000,
        ))
            fs.rmSync(path.join(directory, file.name), { force: true });
    } catch {
        /* A read-only or concurrently pruned cache must not fail rendering. */
    }
}

function renderD2Sync(
    code,
    { salt = "block-0", env = process.env, cwd = process.cwd() } = {},
) {
    const source = String(code);
    if (Buffer.byteLength(source) > INPUT_LIMIT)
        throw failure("D2_INPUT_LIMIT", "D2 input exceeds the 1 MiB limit.");
    assertSelfContainedD2(source);
    const runtime = resolveD2({ env, cwd });
    const fonts = [];
    const fontHashes = {};
    if (env.MARP_AGENT_D2_FONT_PATH) {
        const font = fs.realpathSync(
            path.resolve(cwd, env.MARP_AGENT_D2_FONT_PATH),
        );
        fontHashes.regular = hash(fs.readFileSync(font));
        for (const flag of FONT_FLAGS) fonts.push(`--font-${flag}=${font}`);
    }
    // D2 0.9.0 can fail TALA invariants when a regular-only TTF is installed
    // as its italic face. An italic face must be an explicit separate choice.
    if (env.MARP_AGENT_D2_FONT_ITALIC_PATH) {
        const font = fs.realpathSync(
            path.resolve(cwd, env.MARP_AGENT_D2_FONT_ITALIC_PATH),
        );
        fontHashes.italic = hash(fs.readFileSync(font));
        fonts.push(`--font-italic=${font}`, `--font-mono-italic=${font}`);
    }
    const input = PRELUDE + source;
    const args = [
        "--watch=false",
        "--bundle=false",
        "--target=",
        "--animate-interval=0",
        "--no-xml-tag",
        `--salt=${hash(String(salt))}`,
        `--timeout=${Math.max(1, Math.ceil(runtime.timeoutMs / 1000))}`,
        ...fonts,
        "-",
        "-",
    ];
    const key = hash(
        JSON.stringify({
            input,
            salt,
            args,
            executable: runtime.executable,
            binaryHash: runtime.binaryHash,
            version: runtime.version,
            fontHashes,
            adapter: hash(fs.readFileSync(__filename)),
            runner: hash(
                fs.readFileSync(path.join(__dirname, "d2-process.js")),
            ),
            supervisor: hash(
                fs.readFileSync(path.join(__dirname, "../scripts/run-d2.js")),
            ),
            svg: hash(fs.readFileSync(path.join(__dirname, "d2-svg.js"))),
            xmlParser: require("saxes/package.json").version,
            cssParser: require("css-tree/package.json").version,
            fontParser: hash(fs.readFileSync(require.resolve("fontkit"))),
        }),
    );
    const directory = env.MARP_AGENT_D2_CACHE_DIR || DEFAULT_CACHE;
    const cacheFile = path.join(directory, `${key}.svg`);
    const cacheEnabled = env.MARP_AGENT_D2_CACHE !== "0";
    if (cacheEnabled) {
        try {
            const stat = fs.statSync(cacheFile);
            if (stat.size <= OUTPUT_LIMIT) {
                const cached = prepareD2Svg(
                    fs.readFileSync(cacheFile, "utf8"),
                    salt,
                );
                try {
                    fs.utimesSync(cacheFile, new Date(), new Date());
                } catch {}
                return cached;
            }
        } catch {
            /* Invalid cache entries are recompiled and never presented. */
        }
    }
    let stdout;
    try {
        ({ stdout } = runD2ProcessSync(runtime.executable, args, {
            input,
            cwd,
            env: runtime.env,
            timeoutMs: runtime.timeoutMs,
            maxBuffer: OUTPUT_LIMIT,
        }));
    } catch (error) {
        if (error.stderr?.trim())
            error.message += ` ${error.stderr
                .split(/\r?\n/)
                .filter((line) => !/^(?:info|success):/.test(line))
                .join(" ")
                .trim()
                .slice(0, 1500)}`;
        throw error;
    }
    const svg = prepareD2Svg(stdout, salt);
    if (cacheEnabled) {
        let temporary;
        try {
            fs.mkdirSync(directory, { recursive: true });
            temporary = path.join(
                directory,
                `${key}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`,
            );
            fs.writeFileSync(temporary, stdout, { flag: "wx" });
            fs.renameSync(temporary, cacheFile);
            pruneCache(directory);
        } catch {
            /* A cache is optional; compiler and SVG errors above are not. */
        } finally {
            if (temporary)
                try {
                    fs.rmSync(temporary, { force: true });
                } catch {}
        }
    }
    return svg;
}

module.exports = {
    renderD2Sync,
    resolveD2,
    assertSelfContainedD2,
    D2_VERSION,
    PRELUDE,
};
