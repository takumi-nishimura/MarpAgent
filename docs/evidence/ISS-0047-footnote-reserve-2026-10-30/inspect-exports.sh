#!/bin/sh
# Read each PDF once; keep text/geometry and a native-size render for inspection.
set -eu
uv run --offline --with pymupdf==2.0 python - "$@" <<'PY'
import json
import sys
from pathlib import Path
import pymupdf

source = Path(sys.argv[1])
out = Path(sys.argv[2])
assert not out.exists(), "Use a fresh output directory"
out.mkdir(parents=True)
required = [
    "Source: fictional data; not a measured result.",
    "Conditions: identical input for both values.",
    "Limit: no claim about another setting.",
    "All qualifications remain visible.",
]
results = []
for pdf in sorted(source.glob("*/deck.pdf")):
    doc = pymupdf.open(pdf)
    assert len(doc) == 2
    pages = []
    for i, page in enumerate(doc):
        text = page.get_text()
        assert all(line in text for line in required)
        assert "Keep this qualification with the evidence." in text
        assert f"{i + 1} / 2" in text
        if i == 1:
            assert "Additional heading context" in text
            assert "Additional interpretation boundary" in text
        spans = [span for block in page.get_text("dict")["blocks"]
                 for line in block.get("lines", []) for span in line["spans"]]
        notes = [span for span in spans if any(line in span["text"] for line in required)]
        assert len(notes) == 4
        note_top = min(span["bbox"][1] for span in notes)
        note_bottom = max(span["bbox"][3] for span in notes)
        paragraph_bottom = max(span["bbox"][3] for span in spans if "Keep this qualification" in span["text"])
        assert paragraph_bottom < note_top < note_bottom < page.rect.height
        pages.append({"page": i + 1, "sizePt": list(page.rect), "text": text,
                      "noteTopPt": note_top, "noteBottomPt": note_bottom,
                      "paragraphBottomPt": paragraph_bottom,
                      "noteFontSizesPt": sorted({span["size"] for span in notes})})
    # The second page exercises both heading and caption additions.
    doc[1].get_pixmap(matrix=pymupdf.Matrix(4 / 3, 4 / 3), alpha=False).save(out / f"{pdf.parent.name}-page2.png")
    results.append({"path": str(pdf), "pages": pages})
(out / "pdf-content.json").write_text(json.dumps({"pymupdf": pymupdf.VersionBind, "exports": results}, indent=2) + "\n")
print(f"Verified {len(results)} PDF files / {sum(len(item['pages']) for item in results)} pages; rendered six second pages.")
PY
