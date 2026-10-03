const { test, expect } = require("@playwright/test");
const { buildOverviewDocument } = require("../../src/overview-preview");

test("overview fits widescreen, 4:3, and portrait canvases after resizing", async ({
  page,
}) => {
  const sizes = [
    [1280, 720],
    [960, 720],
    [794, 1123],
  ];
  const slides = sizes
    .map(
      ([width, height], index) =>
        `<svg data-marpit-svg="" viewBox="0 0 ${width} ${height}"><foreignObject width="${width}" height="${height}"><section id="${index + 1}">Content</section></foreignObject></svg>`,
    )
    .join("");
  await page.setContent(
    buildOverviewDocument(`<html><body>${slides}</body></html>`, {
      reloadToken: "test",
    }),
  );
  for (const width of [1280, 640]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(async () =>
        page
          .locator(".marp-agent-overview__viewport")
          .evaluateAll((viewports) =>
            viewports.every((viewport) => {
              const svg = viewport.querySelector("svg");
              return (
                Math.abs(
                  viewport.getBoundingClientRect().height -
                    svg.getBoundingClientRect().height,
                ) < 2
              );
            }),
          ),
      )
      .toBe(true);
  }
});
