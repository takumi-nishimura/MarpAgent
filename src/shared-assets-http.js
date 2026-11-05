const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { sharedAssets } = require("./shared-assets");

const VERSION_PATH = "/__marpagent_shared__/version";
const SHARED_LIVE_SCRIPT = `addEventListener("load", () => {
  let version;
  const poll = async () => {
    try {
      const response = await fetch("${VERSION_PATH}", { cache: "no-store" });
      if (!response.ok) return;
      const current = (await response.json()).version;
      if (version !== undefined && version !== current) location.reload();
      version = current;
    } catch {}
  };
  poll();
  setInterval(poll, 1000);
});`;

const MIME = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".pdf": "application/pdf",
};

function inside(root, file) {
  const relative = path.relative(root, file);
  return (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  );
}

/** Serve only the reserved shared namespace; never expose an arbitrary filesystem route. */
function createSharedAssetsHandler(deckDir) {
  const requested = new Set();
  const finish = (response, code, body = "") => {
    response.writeHead(code, {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain",
    });
    response.end(body);
  };
  return (request, response) => {
    let url;
    try {
      url = new URL(request.url || "/", "http://127.0.0.1");
    } catch {
      return false;
    }
    if (url.pathname !== VERSION_PATH && !url.pathname.startsWith("/shared/"))
      return false;
    if (!["GET", "HEAD"].includes(request.method)) {
      finish(response, 405);
      return true;
    }
    let fd;
    try {
      const shared = sharedAssets(deckDir);
      if (url.pathname === VERSION_PATH) {
        const hash = createHash("sha256").update(shared.directory);
        for (const name of [...requested].sort()) {
          hash.update(name);
          try {
            const stat = fs.statSync(path.join(shared.directory, name), {
              bigint: true,
            });
            hash.update(
              `${stat.ino}:${stat.size}:${stat.mtimeNs}:${stat.ctimeNs}`,
            );
          } catch {
            hash.update("missing");
          }
        }
        response.writeHead(200, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        });
        response.end(
          request.method === "HEAD"
            ? ""
            : JSON.stringify({ version: hash.digest("hex") }),
        );
        return true;
      }
      const name = decodeURIComponent(url.pathname.slice("/shared/".length));
      const file = path.resolve(shared.directory, name);
      if (/[\\:\0]/.test(name) || !inside(shared.directory, file)) {
        finish(response, 404);
        return true;
      }
      if (requested.size < 4096) requested.add(name);
      const real = fs.realpathSync(file);
      const boundary = fs.realpathSync(shared.projectRoot || shared.directory);
      if (!inside(boundary, real)) {
        finish(response, 404);
        return true;
      }
      const expected = fs.statSync(real);
      if (!expected.isFile()) {
        finish(response, 404);
        return true;
      }
      let start = 0,
        end = expected.size - 1,
        code = 200;
      const headers = {
        "Content-Type":
          MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-store",
        "Accept-Ranges": "bytes",
      };
      if (request.headers.range) {
        const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
        if (!range || (!range[1] && !range[2])) {
          finish(response, 416);
          return true;
        }
        start = range[1]
          ? Number(range[1])
          : Math.max(0, expected.size - Number(range[2]));
        end = range[1] && range[2] ? Math.min(Number(range[2]), end) : end;
        if (
          !Number.isSafeInteger(start) ||
          !Number.isSafeInteger(end) ||
          start > end ||
          start >= expected.size
        ) {
          finish(response, 416);
          return true;
        }
        code = 206;
        headers["Content-Range"] = `bytes ${start}-${end}/${expected.size}`;
      }
      headers["Content-Length"] = Math.max(0, end - start + 1);
      // Pin the checked file before streaming; a substituted link must not expose other files.
      fd = fs.openSync(
        real,
        fs.constants.O_RDONLY |
          (fs.constants.O_NOFOLLOW || 0) |
          (fs.constants.O_NONBLOCK || 0),
      );
      const opened = fs.fstatSync(fd);
      if (
        !opened.isFile() ||
        opened.dev !== expected.dev ||
        opened.ino !== expected.ino ||
        opened.size !== expected.size ||
        fs.realpathSync(file) !== real
      ) {
        fs.closeSync(fd);
        fd = undefined;
        finish(response, 404);
        return true;
      }
      response.writeHead(code, headers);
      if (request.method === "HEAD" || expected.size === 0) {
        fs.closeSync(fd);
        fd = undefined;
        response.end();
      } else {
        const stream = fs.createReadStream(real, {
          fd,
          autoClose: true,
          start,
          end,
        });
        fd = undefined;
        stream.on("error", () => response.destroy());
        response.on("close", () => stream.destroy());
        stream.pipe(response);
      }
    } catch {
      if (fd !== undefined) {
        try {
          fs.closeSync(fd);
        } catch {}
      }
      finish(response, 404, "Shared asset unavailable");
    }
    return true;
  };
}

module.exports = { createSharedAssetsHandler, SHARED_LIVE_SCRIPT };
