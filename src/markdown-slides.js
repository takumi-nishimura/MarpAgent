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
    const trimmed = line.trim();
    const fenceMatch = trimmed.match(/^(```+|~~~+)/);

    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!fence) {
        fence = { char: marker[0], length: marker.length };
      } else if (marker[0] === fence.char && marker.length >= fence.length) {
        fence = null;
      }
      currentLines.push(line);
      continue;
    }

    if (!fence && trimmed === "---") {
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
  splitNonEmptySlides,
  splitSlideRawBlocks,
  stripFrontmatter,
};
