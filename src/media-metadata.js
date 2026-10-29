const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const FORMATS = {
    image: [
        "png",
        "jpg",
        "jpeg",
        "gif",
        "svg",
        "webp",
        "avif",
        "heic",
        "heif",
        "tif",
        "tiff",
        "bmp",
        "ico",
        "apng",
    ],
    video: ["mp4", "webm", "mov", "m4v", "mkv", "avi", "mpeg", "mpg"],
    audio: ["mp3", "wav", "ogg", "m4a", "flac", "aac", "opus"],
    font: ["woff", "woff2", "ttf", "otf"],
    document: ["pdf"],
};

function mediaKind(filePath) {
    const extension = path.extname(filePath).slice(1).toLowerCase();
    return (
        Object.keys(FORMATS).find((kind) =>
            FORMATS[kind].includes(extension),
        ) || "other"
    );
}

function unknown(reason) {
    return { width: null, height: null, reason };
}
function dimensions(width, height, unit = "px") {
    return Number.isFinite(width) &&
        width > 0 &&
        Number.isFinite(height) &&
        height > 0
        ? { width, height, unit, reason: null }
        : unknown("Image dimensions are invalid.");
}

function imageDimensions(bytes, extension) {
    if (
        ["png", "apng"].includes(extension) &&
        bytes.length >= 24 &&
        bytes
            .subarray(0, 16)
            .equals(Buffer.from("89504e470d0a1a0a0000000d49484452", "hex"))
    ) {
        return dimensions(bytes.readUInt32BE(16), bytes.readUInt32BE(20));
    }
    if (
        extension === "gif" &&
        bytes.length >= 10 &&
        /^GIF8[79]a$/.test(bytes.toString("ascii", 0, 6))
    ) {
        return dimensions(bytes.readUInt16LE(6), bytes.readUInt16LE(8));
    }
    if (
        ["jpg", "jpeg"].includes(extension) &&
        bytes.length >= 4 &&
        bytes.readUInt16BE(0) === 0xffd8
    ) {
        let offset = 2;
        while (offset < bytes.length) {
            if (bytes[offset++] !== 0xff) break;
            while (bytes[offset] === 0xff) offset++;
            const marker = bytes[offset++];
            if (marker === 0xd9 || marker === 0xda) break;
            if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
            if (offset + 2 > bytes.length) break;
            const length = bytes.readUInt16BE(offset);
            if (length < 2 || offset + length > bytes.length) break;
            if (
                [
                    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb,
                    0xcd, 0xce, 0xcf,
                ].includes(marker) &&
                length >= 7
            ) {
                return dimensions(
                    bytes.readUInt16BE(offset + 5),
                    bytes.readUInt16BE(offset + 3),
                );
            }
            offset += length;
        }
        return unknown("JPEG dimensions were not found in the bounded header.");
    }
    if (
        extension === "webp" &&
        bytes.length >= 30 &&
        bytes.toString("ascii", 0, 4) === "RIFF" &&
        bytes.toString("ascii", 8, 16) === "WEBPVP8X"
    ) {
        return dimensions(
            bytes.readUIntLE(24, 3) + 1,
            bytes.readUIntLE(27, 3) + 1,
        );
    }
    if (extension === "svg") {
        const text = bytes.toString("utf8");
        const start = text.search(/<svg\b/i);
        const end = text.indexOf(">", start);
        if (start < 0 || end < 0)
            return unknown(
                "SVG header is missing or exceeds the bounded header.",
            );
        const tag = text.slice(start, end + 1);
        const attribute = (name) =>
            new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(
                tag,
            )?.[1];
        const numeric = (value) =>
            /^\s*\d+(?:\.\d+)?(?:px)?\s*$/.test(value || "")
                ? parseFloat(value)
                : NaN;
        const width = numeric(attribute("width"));
        const height = numeric(attribute("height"));
        if (width > 0 && height > 0) return dimensions(width, height);
        const box = (attribute("viewBox") || "")
            .trim()
            .split(/[\s,]+/)
            .map(Number);
        if (box.length === 4)
            return dimensions(box[2], box[3], "SVG user units");
        return unknown("SVG has no numeric viewport or viewBox dimensions.");
    }
    return unknown(
        "Dimensions are unsupported or the image header is invalid.",
    );
}

function sameFile(a, b) {
    return (
        a.dev === b.dev &&
        a.ino === b.ino &&
        a.size === b.size &&
        a.mtimeMs === b.mtimeMs
    );
}

/** Hash a verified regular file in chunks; sniff only a bounded image header. */
function readMediaMetadata(
    filePath,
    { expectedStat, maxDimensionBytes = 262144 } = {},
) {
    let fd;
    let bytes = null;
    try {
        const expected = expectedStat || fs.lstatSync(filePath);
        if (
            expected.isSymbolicLink?.() ||
            (!expected.isFile?.() && expected.isFile !== undefined)
        )
            throw new Error("Media is not a regular file.");
        fd = fs.openSync(
            filePath,
            fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0),
        );
        const before = fs.fstatSync(fd);
        if (!before.isFile() || !sameFile(expected, before))
            throw new Error("Media identity changed before reading.");
        bytes = before.size;
        const hash = crypto.createHash("sha256");
        const chunk = Buffer.alloc(65536);
        const sniff = [];
        let sniffed = 0;
        const headerLimit = Math.max(
            0,
            Math.min(1024 * 1024, Number(maxDimensionBytes) || 0),
        );
        let count;
        while ((count = fs.readSync(fd, chunk, 0, chunk.length, null)) > 0) {
            hash.update(chunk.subarray(0, count));
            const keep = Math.min(count, headerLimit - sniffed);
            if (keep > 0) {
                sniff.push(Buffer.from(chunk.subarray(0, keep)));
                sniffed += keep;
            }
        }
        if (!sameFile(before, fs.fstatSync(fd)))
            throw new Error("Media changed while reading.");
        const extension = path.extname(filePath).slice(1).toLowerCase();
        return {
            bytes,
            hash: hash.digest("hex"),
            dimensions:
                mediaKind(filePath) === "image"
                    ? imageDimensions(Buffer.concat(sniff), extension)
                    : unknown("Dimensions are not probed for this media type."),
            metadataError: null,
        };
    } catch (error) {
        const reason = error.code
            ? `Cannot read media metadata (${error.code}).`
            : error.message;
        return {
            bytes,
            hash: null,
            dimensions: unknown(reason),
            metadataError: reason,
        };
    } finally {
        if (fd !== undefined) fs.closeSync(fd);
    }
}

module.exports = { mediaKind, readMediaMetadata };
