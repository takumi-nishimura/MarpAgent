function stripFrontmatter(markdown) {
  const text = String(markdown || "");
  const lines = text.split(/\r?\n/);

  if (lines[0]?.trim() !== "---") {
    return text;
  }

  let closingIndex = 1;
  while (closingIndex < lines.length && lines[closingIndex].trim() !== "---") {
    closingIndex += 1;
  }

  if (closingIndex >= lines.length) {
    return text;
  }

  return lines.slice(closingIndex + 1).join("\n");
}

const FENCE_MARKER_RE = /^(```+|~~~+)/;

/**
 * Advance fenced-code tracking over one source line. `fence` is null outside
 * a code fence or { char, length } inside one; a fence closes only on the
 * same marker character with at least the opening run length.
 */
function nextFenceState(fence, line) {
  const marker = line.trim().match(FENCE_MARKER_RE)?.[1];
  if (!marker) return fence;
  if (!fence) return { char: marker[0], length: marker.length };
  return marker[0] === fence.char && marker.length >= fence.length
    ? null
    : fence;
}

/**
 * Group a Markdown document into fenced-code and regular segments so callers
 * can ignore or rewrite only non-code text. Marker lines belong to the code
 * segment. Concatenating every segment's `text` restores the input
 * byte-for-byte.
 */
function splitFenceSegments(markdown) {
  const segments = [];
  let fence = null;

  for (const chunk of String(markdown).split(/(?<=\n)/)) {
    const fenced = fence !== null || FENCE_MARKER_RE.test(chunk.trim());
    fence = nextFenceState(fence, chunk);
    const last = segments[segments.length - 1];
    if (last && last.fenced === fenced) {
      last.text += chunk;
    } else {
      segments.push({ text: chunk, fenced });
    }
  }

  return segments;
}

function splitSlideRawBlocks(markdown) {
  const lines = stripFrontmatter(markdown).split(/\r?\n/);
  const slides = [];
  let currentLines = [];
  let slideNumber = 1;
  let fence = null;

  const pushCurrent = () => {
    slides.push({
      number: slideNumber,
      raw: currentLines.join("\n"),
    });
    slideNumber += 1;
    currentLines = [];
  };

  for (const line of lines) {
    const inCode = fence !== null || FENCE_MARKER_RE.test(line.trim());
    fence = nextFenceState(fence, line);

    if (!inCode && line.trim() === "---") {
      pushCurrent();
      continue;
    }

    currentLines.push(line);
  }

  pushCurrent();
  return slides;
}

function splitNonEmptySlides(markdown) {
  return splitSlideRawBlocks(markdown).filter(
    (slide) => slide.raw.trim() !== "",
  );
}

module.exports = {
  nextFenceState,
  splitFenceSegments,
  splitNonEmptySlides,
  splitSlideRawBlocks,
  stripFrontmatter,
};
