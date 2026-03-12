const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildOverviewDocument,
  buildWaitingDocument,
  extractSlides,
} = require("../../src/overview-preview");

const renderedHtml = `<!doctype html>
<html>
  <head>
    <title>Example deck</title>
    <style>.bespoke-marp-parent { color: red; }</style>
    <style>div#\\:\\$p > svg > foreignObject > section { color: blue; }</style>
  </head>
  <body>
    <div id=":$p">
      <svg data-marpit-svg="" viewBox="0 0 1280 720"><foreignObject><section id="1">Title</section></foreignObject></svg>
      <svg data-marpit-svg="" viewBox="0 0 1280 720"><foreignObject><section id="2" data-marpit-pagination="1">Body</section></foreignObject></svg>
    </div>
    <script>console.log("tail");</script>
  </body>
</html>`;

test("extractSlides returns every rendered slide svg", () => {
  assert.equal(extractSlides(renderedHtml).length, 2);
  assert.match(extractSlides(renderedHtml)[0], /<section id="1">Title<\/section>/);
});

test("extractSlides keeps the last slide even if scripts follow it", () => {
  const html = [
    '<div id=":$p">',
    '<svg data-marpit-svg="" viewBox="0 0 1280 720"><foreignObject><section id="1">A</section></foreignObject></svg>',
    '<svg data-marpit-svg="" viewBox="0 0 1280 720"><foreignObject><section id="2">B</section><script>window.x=1</script></foreignObject></svg>',
    "</div>",
    "<script>bootstrap()</script>",
  ].join("");

  const slides = extractSlides(html);

  assert.equal(slides.length, 2);
  assert.match(slides[1], /<section id="2">B<\/section>/);
  assert.doesNotMatch(slides[1], /<script>/);
});

test("buildOverviewDocument preserves slide content and labels", () => {
  const html = buildOverviewDocument(renderedHtml, {
    reloadToken: "token",
    targetSlideId: "2",
  });

  assert.match(html, /Example deck overview/);
  assert.match(html, /data-target-slide="2"/);
  assert.match(html, /Slide 2/);
  assert.match(html, /Displayed page 1/);
  assert.match(html, /scroll to skim the full deck/);
  assert.match(html, /marp-agent-overview__svg-root > svg/);
  assert.match(html, /\.marp-agent-overview__svg-root > svg > foreignObject > section/);
});

test("buildWaitingDocument shows a reload-ready placeholder", () => {
  const html = buildWaitingDocument("slide.md", "missing");

  assert.match(html, /Rendering overview for slide\.md/);
  assert.match(html, /data-reload-token="missing"/);
  assert.match(html, /reloads automatically/);
});

test("buildOverviewDocument includes WebSocket live-reload script", () => {
  const html = buildOverviewDocument(renderedHtml, {
    reloadToken: "token",
    targetSlideId: undefined,
  });

  assert.match(html, /connectLiveReload/);
  assert.match(html, /__marp_agent__\/ws/);
});

test("buildWaitingDocument includes WebSocket live-reload script", () => {
  const html = buildWaitingDocument("slide.md", "missing");

  assert.match(html, /connectLiveReload/);
  assert.match(html, /__marp_agent__\/ws/);
});
