const crypto = require('node:crypto');
const { SaxesParser } = require('saxes');
const css = require('css-tree');
const fontkit = require('fontkit');

const SVG_NS = 'http://www.w3.org/2000/svg';
const FONT_DATA = /^data:(?:application\/(?:font-woff|x-font-ttf|octet-stream)|font\/(?:woff2?|ttf|otf));base64,[A-Za-z0-9+/=]+$/;
const FORBIDDEN_ELEMENTS = new Set(['script', 'foreignobject', 'image', 'a', 'animate', 'animatemotion', 'animatetransform', 'set', 'discard']);
const escapeXml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);

function invalid(detail) {
  const error = new Error(`D2 SVG rejected: ${detail}`);
  error.code = 'D2_SVG_INVALID';
  throw error;
}

// Parse XML and CSS before rewriting IDs. Regex replacements cannot keep SVG
// links, marker URLs, CSS ID selectors and nested math definitions consistent.
function prepareD2Svg(source, salt) {
  let root;
  const stack = [];
  const elements = [];
  const ids = new Map();
  const rootId = `marpagent-d2-${crypto.createHash('sha256').update(String(salt)).digest('hex').slice(0, 20)}`;
  const parser = new SaxesParser({ xmlns: true });
  parser.on('error', error => invalid(error.message));
  parser.on('doctype', () => invalid('DOCTYPE is not supported'));
  parser.on('processinginstruction', () => invalid('processing instructions are not supported'));
  parser.on('opentag', tag => {
    if (tag.uri !== SVG_NS || FORBIDDEN_ELEMENTS.has(tag.local.toLowerCase())) invalid(`unsupported element ${tag.name}`);
    const node = { name: tag.name, local: tag.local, attributes: {}, children: [] };
    for (const attribute of Object.values(tag.attributes)) {
      if (/^on/i.test(attribute.local)) invalid(`event attribute ${attribute.name}`);
      node.attributes[attribute.name] = attribute.value;
    }
    const id = node.attributes.id;
    if (id !== undefined) {
      if (!id || ids.has(id)) invalid(`duplicate or empty ID ${id}`);
      ids.set(id, `${rootId}-${ids.size}`);
    }
    if (stack.length) stack.at(-1).children.push(node);
    else if (root) invalid('multiple roots');
    else root = node;
    stack.push(node);
    elements.push(node);
  });
  parser.on('closetag', () => stack.pop());
  const addText = value => {
    if (stack.length) stack.at(-1).children.push(value);
    else if (value.trim()) invalid('text outside SVG');
  };
  parser.on('text', addText);
  parser.on('cdata', addText);
  try {
    parser.write(String(source)).close();
  } catch (error) {
    if (error.code === 'D2_SVG_INVALID') throw error;
    invalid(error.message);
  }
  if (!root || root.local !== 'svg') invalid('missing SVG root');
  const box = (root.attributes.viewBox || '').trim().split(/[\s,]+/).map(Number);
  if (box.length !== 4 || !box.every(Number.isFinite) || box[2] <= 0 || box[3] <= 0) invalid('a finite positive viewBox is required');
  if (root.attributes.id) ids.set(root.attributes.id, rootId);
  const styles = [];
  const embeddedFonts = [];
  const fontNames = new Map();
  const parseCss = (value, context) => {
    try {
      return css.parse(value, { context, parseCustomProperty: true, onParseError: error => { throw error; } });
    } catch (error) { invalid(`invalid CSS: ${error.message}`); }
  };
  for (const element of elements) {
    if (element.local !== 'style') continue;
    if (element.children.some(child => typeof child !== 'string')) invalid('markup inside style');
    const ast = parseCss(element.children.join(''), 'stylesheet');
    styles.push({ element, ast });
    css.walk(ast, {
      visit: 'Atrule',
      enter(node) {
        if (!['font-face', 'media'].includes(node.name.toLowerCase())) invalid(`unsupported CSS @${node.name}`);
        if (node.name.toLowerCase() === 'font-face') {
          node.block?.children.forEach(declaration => {
            if (declaration.type !== 'Declaration' || declaration.property.toLowerCase() !== 'font-family') return;
            const family = declaration.value.children?.first;
            if (!family || !['Identifier', 'String'].includes(family.type)) invalid('unsupported font family');
            const name = family.name || family.value;
            fontNames.set(name, `${rootId}-${name}`);
          });
        }
      },
    });
  }
  function reference(value) {
    if (!value.startsWith('#') || !ids.has(value.slice(1))) invalid(`unresolved or external reference ${value.slice(0, 120)}`);
    return `#${ids.get(value.slice(1))}`;
  }
  function rewriteCss(ast, scope) {
    css.walk(ast, function (node) {
      if (node.type === 'Raw') invalid('unparsed CSS');
      if (node.type === 'Url') {
        if (node.value.startsWith('#')) node.value = reference(node.value);
        else if (this.atrule?.name === 'font-face' && this.declaration?.property === 'src' && FONT_DATA.test(node.value)) {
          try { embeddedFonts.push(fontkit.create(Buffer.from(node.value.slice(node.value.indexOf(',') + 1), 'base64'))); }
          catch { invalid('invalid embedded font'); }
        } else invalid('external CSS resource');
      }
      if (node.type === 'Function' && ['expression', 'local'].includes(node.name.toLowerCase())) invalid('active CSS or external font');
      if (node.type === 'IdSelector') node.name = reference(`#${node.name}`).slice(1);
      if (this.declaration?.property.toLowerCase() === 'font-family') {
        if (node.type === 'Identifier' && fontNames.has(node.name)) node.name = fontNames.get(node.name);
        if (node.type === 'String' && fontNames.has(node.value)) node.value = fontNames.get(node.value);
      }
    });
    if (scope) css.walk(ast, { visit: 'Rule', enter(node) {
      if (node.prelude?.type !== 'SelectorList') invalid('unsupported CSS selector');
      node.prelude.children.forEach(selector => {
        selector.children.prependData({ type: 'Combinator', name: ' ' });
        selector.children.prependData({ type: 'IdSelector', name: rootId });
      });
    } });
    const result = css.generate(ast);
    if (result.includes('<')) invalid('HTML delimiter inside CSS');
    return result;
  }
  for (const { element, ast } of styles) element.children = [rewriteCss(ast, true)];
  for (const element of elements) {
    for (const [name, value] of Object.entries(element.attributes)) {
      const local = name.split(':').at(-1).toLowerCase();
      if (name === 'id') element.attributes[name] = ids.get(value);
      else if (local === 'href' || local === 'src') element.attributes[name] = reference(value);
      else if (name === 'style') element.attributes[name] = rewriteCss(parseCss(value, 'declarationList'), false);
      else if (['aria-labelledby', 'aria-describedby'].includes(name)) element.attributes[name] = value.split(/\s+/).map(id => reference(`#${id}`).slice(1)).join(' ');
      else if (name === 'font-family' && fontNames.has(value)) element.attributes[name] = fontNames.get(value);
      else if (/url\s*\(/i.test(value)) element.attributes[name] = rewriteCss(parseCss(value, 'value'), false);
      else if (['width', 'height'].includes(name) && !/^(?:(?:\d+(?:\.\d+)?|\.\d+)(?:px|%|em|ex|pt|pc|mm|cm|in)?|auto)$/.test(value)) invalid(`invalid ${name}`);
    }
    // The compiler already measured these labels; slide typography must not
    // replace their font size after layout. Whole-diagram scaling stays CSS.
    if (['text', 'tspan'].includes(element.local) && element.attributes['font-size']) {
      const size = element.attributes['font-size'];
      if (!/^(?:\d+(?:\.\d+)?|\.\d+)(?:px|em|ex|pt)?$/.test(size)) invalid('invalid label font size');
      element.attributes.style = `${element.attributes.style || ''};font-size:${/\d$/.test(size) ? `${size}px` : size}`;
    }
  }
  // D2's bundled Latin font does not cover Japanese. Never count browser/OS
  // fallback as a self-contained diagram: inspect the emitted font subsets.
  const nonAscii = new Set();
  function collectText(node, isText = false) {
    if (typeof node === 'string') {
      if (isText) for (const character of node) if (character.codePointAt(0) > 127 && !/\s/u.test(character)) nonAscii.add(character);
      return;
    }
    if (node.local === 'style') return;
    for (const child of node.children) collectText(child, isText || ['text', 'tspan'].includes(node.local));
  }
  collectText(root);
  for (const character of nonAscii) {
    if (!embeddedFonts.some(font => font.hasGlyphForCodePoint?.(character.codePointAt(0)))) invalid(`embedded fonts lack glyph ${character}; set MARP_AGENT_D2_FONT_PATH to a suitable TTF file`);
  }
  root.attributes.id = rootId;
  const serialize = node => {
    if (typeof node === 'string') return escapeXml(node);
    const attributes = Object.entries(node.attributes).map(([name, value]) => ` ${name}="${escapeXml(value)}"`).join('');
    const content = node.local === 'style' ? node.children.join('') : node.children.map(serialize).join('');
    return `<${node.name}${attributes}>${content}</${node.name}>`;
  };
  return serialize(root);
}

module.exports = { prepareD2Svg };
