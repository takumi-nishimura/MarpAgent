const { test, expect } = require("@playwright/test");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { Marp } = require("@marp-team/marp-core/full");

const themes = ["lab", "muji", "toshiba"];
const appearances = ["", " invert"];
const cover = (className) => `<!-- _class: title${className} -->
<!-- _header: ロボティクス研究セミナー · 2026.11.20 -->

# 人とロボットの協調操作を支える意図推定と共有制御

<div class="author">

山田 花子・佐藤 太郎

ロボティクス研究室

</div>`;
const body = `<!-- _header: 構成 -->

## 本文の見出し

本文の色と書体を確認します．`;

test("a named cover matches its own theme and keeps the deck's body styling", async ({
  page,
}) => {
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) =>
    route.abort(),
  );
  const marp = new Marp({ html: true });
  for (const theme of themes) {
    marp.themeSet.add(readFileSync(join(__dirname, "../../themes", `${theme}.css`), "utf8"));
  }
  async function measure(theme, slides) {
    const deck = `---\ntheme: ${theme}\n---\n\n${slides.join("\n\n---\n\n")}`;
    const { html, css } = marp.render(deck);
    await page.setContent(`<style>body { margin: 0; } ${css}</style>${html}`);
    await page.evaluate(() => document.fonts.ready.then(() => {}));
    return page.locator("section").evaluateAll((sections) =>
      sections.map((section) => {
        const slide = section.getBoundingClientRect();
        return [section, ...section.children].map((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            bounds: [rect.x - slide.x, rect.y - slide.y, rect.width, rect.height],
            font: [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight],
            color: style.color,
            background: [style.backgroundColor, style.backgroundImage],
            borders: [style.borderLeft, style.borderBottom],
            align: style.textAlign,
          };
        });
      }),
    );
  }

  const native = new Map();
  for (const theme of themes) {
    native.set(theme, await measure(theme, [...appearances.map(cover), body]));
  }
  for (const theme of themes) {
    const slides = themes.flatMap((choice) =>
      appearances.map((appearance) => cover(` cover-${choice}${appearance}`)),
    );
    const actual = await measure(theme, [...slides, body]);
    for (const [index, choice] of themes.entries()) {
      expect.soft(actual.slice(index * 2, index * 2 + 2), `${theme} with cover-${choice}`).toEqual(
        native.get(choice).slice(0, 2),
      );
    }
    expect.soft(actual.at(-1), `${theme} body`).toEqual(native.get(theme).at(-1));
  }
});
