const path = require("node:path");

function getOverviewOutputPath(deckPath) {
  const deckDir = path.dirname(deckPath);
  const baseName = path.basename(deckPath, path.extname(deckPath));
  const safeBaseName = baseName.replace(/[^a-zA-Z0-9._-]/g, "-");
  return path.join(deckDir, `.${safeBaseName}.overview.html`);
}

function readAttribute(tag, attributeName) {
  const match = tag.match(
    new RegExp(`${attributeName}=(["'])(.*?)\\1`, "i"),
  );
  return match?.[2];
}

function extractHeadAssets(renderedHtml) {
  const styleTags = renderedHtml.match(/<style[\s\S]*?<\/style>/gi) ?? [];
  const stylesheetLinks =
    renderedHtml.match(/<link[^>]+rel=(["'])stylesheet\1[^>]*>/gi) ?? [];

  return [...styleTags, ...stylesheetLinks]
    .join("\n")
    .replaceAll("div#\\:\\$p", ".marp-agent-overview__svg-root");
}

function extractTitle(renderedHtml) {
  const match = renderedHtml.match(/<title>([\s\S]*?)<\/title>/i);
  return match?.[1].trim() || "Slide overview";
}

function extractSlides(renderedHtml) {
  const slides = [];
  let cursor = 0;

  while (cursor < renderedHtml.length) {
    const slideStart = renderedHtml.indexOf("<svg", cursor);
    if (slideStart === -1) break;

    const slideOpenEnd = renderedHtml.indexOf(">", slideStart);
    if (slideOpenEnd === -1) break;

    const slideOpenTag = renderedHtml.slice(slideStart, slideOpenEnd + 1);
    cursor = slideOpenEnd + 1;

    if (!/\bdata-marpit-svg\b/i.test(slideOpenTag)) {
      continue;
    }

    let depth = 1;
    let scan = cursor;

    while (depth > 0 && scan < renderedHtml.length) {
      const nextSvgOpen = renderedHtml.indexOf("<svg", scan);
      const nextSvgClose = renderedHtml.indexOf("</svg>", scan);
      const nextScriptOpen = renderedHtml.indexOf("<script", scan);

      const candidates = [nextSvgOpen, nextSvgClose, nextScriptOpen].filter(
        (index) => index !== -1,
      );

      if (candidates.length === 0) {
        break;
      }

      const nextToken = Math.min(...candidates);

      if (nextToken === nextScriptOpen) {
        const scriptClose = renderedHtml.indexOf("</script>", nextScriptOpen);
        if (scriptClose === -1) {
          scan = renderedHtml.length;
          break;
        }
        scan = scriptClose + "</script>".length;
        continue;
      }

      if (nextToken === nextSvgOpen) {
        depth += 1;
        scan = renderedHtml.indexOf(">", nextSvgOpen);
        if (scan === -1) {
          scan = renderedHtml.length;
          break;
        }
        scan += 1;
        continue;
      }

      depth -= 1;
      scan = nextSvgClose + "</svg>".length;
    }

    if (depth === 0) {
      slides.push(renderedHtml.slice(slideStart, scan));
      cursor = scan;
    }
  }

  return slides.map((slideSvg) =>
    slideSvg.replace(/<script\b[\s\S]*?<\/script>/gi, ""),
  );
}

function buildOverviewCards(slideSvgList) {
  return slideSvgList
    .map((slideSvg, index) => {
      const sectionTag = slideSvg.match(/<section\b[^>]*>/i)?.[0] ?? "<section>";
      const slideId = readAttribute(sectionTag, "id") || String(index + 1);
      const displayedPage = readAttribute(sectionTag, "data-marpit-pagination");
      const label = displayedPage
        ? `Displayed page ${displayedPage}`
        : "No displayed page";

      return [
        `<article class="marp-agent-overview__card" data-slide-id="${escapeHtml(
          slideId,
        )}">`,
        '  <div class="marp-agent-overview__card-header">',
        `    <span class="marp-agent-overview__slide-number">Slide ${index + 1}</span>`,
        `    <span class="marp-agent-overview__page-label">${escapeHtml(label)}</span>`,
        "  </div>",
        '  <div class="marp-agent-overview__viewport">',
        '    <div class="marp-agent-overview__svg-root">',
        `      ${slideSvg}`,
        "    </div>",
        "  </div>",
        "</article>",
      ].join("\n");
    })
    .join("\n");
}

function buildOverviewDocument(renderedHtml, { reloadToken, targetSlideId }) {
  const title = extractTitle(renderedHtml);
  const slides = extractSlides(renderedHtml);
  const cards = buildOverviewCards(slides);
  const targetAttribute = targetSlideId
    ? ` data-target-slide="${escapeHtml(targetSlideId)}"`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} overview</title>
    ${extractHeadAssets(renderedHtml)}
    <style>
      :root {
        color-scheme: light;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        min-height: 100%;
        background:
          linear-gradient(180deg, #f7f1e7 0%, #efe5d5 100%);
        color: #23160b;
      }

      body.marp-agent-overview {
        display: block !important;
        height: auto !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        font-family:
          "Avenir Next",
          "Hiragino Sans",
          "Noto Sans JP",
          sans-serif;
      }

      .marp-agent-overview__header {
        position: sticky;
        top: 0;
        z-index: 10;
        display: flex;
        flex-wrap: nowrap;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 16px 24px;
        border-bottom: 1px solid rgba(78, 53, 25, 0.14);
        background: rgba(247, 241, 231, 0.92);
        backdrop-filter: blur(12px);
      }

      .marp-agent-overview__title {
        margin: 0;
        min-width: 0;
        flex: 1 1 auto;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 1rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .marp-agent-overview__meta {
        flex: 0 0 auto;
        font-size: 0.9rem;
        color: #6f5843;
        white-space: nowrap;
      }

      .marp-agent-overview__grid {
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
        gap: 24px;
        padding: 24px;
        align-items: start;
      }

      .marp-agent-overview__card {
        padding: 14px;
        border: 1px solid rgba(78, 53, 25, 0.14);
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.82);
        box-shadow: 0 18px 50px rgba(78, 53, 25, 0.12);
      }

      .marp-agent-overview__card-header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }

      .marp-agent-overview__slide-number {
        font-size: 0.9rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .marp-agent-overview__page-label {
        font-size: 0.85rem;
        color: #6f5843;
      }

      .marp-agent-overview__viewport {
        position: relative;
        width: 100%;
        min-height: 180px;
        aspect-ratio: 16 / 9;
        overflow: hidden;
        background: #111;
      }

      .marp-agent-overview__svg-root {
        display: block !important;
        width: 100%;
        height: 100%;
      }

      .marp-agent-overview__svg-root > svg {
        display: block !important;
        width: 100% !important;
        height: auto !important;
        margin: 0 !important;
        visibility: visible !important;
        opacity: 1 !important;
        position: static !important;
      }

      @media (max-width: 768px) {
        .marp-agent-overview__header {
          gap: 12px;
          padding: 12px 16px;
        }

        .marp-agent-overview__title {
          font-size: 0.92rem;
        }

        .marp-agent-overview__meta {
          font-size: 0.82rem;
        }

        .marp-agent-overview__grid {
          grid-template-columns: 1fr;
          padding: 16px;
          gap: 16px;
        }
      }
    </style>
  </head>
  <body
    class="marp-agent-overview"
    data-reload-token="${escapeHtml(reloadToken)}"${targetAttribute}
  >
    <header class="marp-agent-overview__header">
        <h1 class="marp-agent-overview__title">${escapeHtml(title)}</h1>
      <div class="marp-agent-overview__meta">
        ${slides.length} slides, scroll to skim the full deck
      </div>
    </header>
    <main class="marp-agent-overview__grid">
      ${cards}
    </main>
    <script>
      (() => {
        const targetSlideId = document.body.dataset.targetSlide;

        function fitViewport(viewport) {
          const slide = viewport.querySelector(":scope .marp-agent-overview__svg-root > svg");
          if (!slide) return;

          const width = viewport.clientWidth;
          viewport.style.height = \`\${Math.max(1, width * 9 / 16)}px\`;
        }

        function fitAllViewports() {
          document
            .querySelectorAll(".marp-agent-overview__viewport")
            .forEach((viewport) => fitViewport(viewport));
        }

        fitAllViewports();
        window.addEventListener("resize", fitAllViewports);

        if (typeof ResizeObserver === "function") {
          const resizeObserver = new ResizeObserver((entries) => {
            entries.forEach((entry) => fitViewport(entry.target));
          });

          document
            .querySelectorAll(".marp-agent-overview__viewport")
            .forEach((viewport) => resizeObserver.observe(viewport));
        }

        if (targetSlideId) {
          const escapedSlideId =
            typeof CSS !== "undefined" && typeof CSS.escape === "function"
              ? CSS.escape(targetSlideId)
              : targetSlideId.replace(/["\\\\]/g, "\\\\$&");
          const target = document.querySelector(
            \`.marp-agent-overview__card[data-slide-id="\${escapedSlideId}"]\`,
          );

          if (target) {
            requestAnimationFrame(() => {
              target.scrollIntoView({ block: "center", inline: "nearest" });
            });
          }
        }

        ${buildReloadScript("/__marp_agent__/meta")}
      })();
    </script>
  </body>
</html>`;
}

function buildWaitingDocument(deckName, reloadToken) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(deckName)} overview</title>
    <style>
      html,
      body {
        margin: 0;
        min-height: 100%;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at top, #f7f1e7 0%, #efe5d5 56%, #e7dac5 100%);
        color: #23160b;
        font-family:
          "Avenir Next",
          "Hiragino Sans",
          "Noto Sans JP",
          sans-serif;
      }

      main {
        padding: 32px;
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.78);
        box-shadow: 0 18px 50px rgba(78, 53, 25, 0.12);
        text-align: center;
      }

      h1 {
        margin: 0 0 8px;
        font-size: 1.1rem;
      }

      p {
        margin: 0;
        color: #6f5843;
      }
    </style>
  </head>
  <body data-reload-token="${escapeHtml(reloadToken)}">
    <main>
      <h1>Rendering overview for ${escapeHtml(deckName)}</h1>
      <p>The page reloads automatically when the first render is ready.</p>
    </main>
    <script>
      (() => {
        ${buildReloadScript("/__marp_agent__/meta")}
      })();
    </script>
  </body>
</html>`;
}

function buildReloadScript(metaUrl) {
  return `
        const reloadToken = document.body.dataset.reloadToken;
        let wsRetries = 0;
        const maxWsRetries = 5;

        function connectLiveReload() {
          const wsProtocol = location.protocol === "https:" ? "wss:" : "ws:";
          const wsUrl = \`\${wsProtocol}//\${location.host}/__marp_agent__/ws\`;

          try {
            const ws = new WebSocket(wsUrl);

            ws.addEventListener("open", () => { wsRetries = 0; });

            ws.addEventListener("message", (event) => {
              try {
                const data = JSON.parse(event.data);
                if (data.type === "reload") {
                  window.location.reload();
                }
              } catch {
                // Ignore malformed messages.
              }
            });

            ws.addEventListener("close", () => {
              wsRetries++;
              if (wsRetries >= maxWsRetries) {
                startPolling();
                return;
              }
              setTimeout(connectLiveReload, 1000);
            });

            ws.addEventListener("error", () => {
              ws.close();
            });
          } catch {
            startPolling();
          }
        }

        async function pollForReload() {
          try {
            const response = await fetch("${metaUrl}", { cache: "no-store" });
            const payload = await response.json();

            if (payload.token !== reloadToken) {
              window.location.reload();
            }
          } catch {
            // Ignore temporary reload polling failures.
          }
        }

        function startPolling() {
          window.setInterval(pollForReload, 500);
        }

        connectLiveReload();`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

module.exports = {
  buildOverviewDocument,
  buildReloadScript,
  buildWaitingDocument,
  extractSlides,
  getOverviewOutputPath,
};
