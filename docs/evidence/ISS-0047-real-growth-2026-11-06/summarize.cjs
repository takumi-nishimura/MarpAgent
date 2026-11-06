// Export only aggregate measurements and hashes; never copy source text or images.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const input = process.argv[2];
if (!input) throw Error('Pass the private results.json path.');
const rows = JSON.parse(fs.readFileSync(input, 'utf8'));
const output = rows.map(row => ({
    deck: row.deck, page: row.page, theme: row.theme, condition: row.condition,
    sourceHash: row.sourceHash,
    legacyEquivalent: row.legacyEquivalent, modernEquivalent: row.modernEquivalent,
    arms: Object.fromEntries(Object.entries(row.measurements).map(([name, m]) => {
        const original = row.measurements.original;
        const filename = `${row.deck}-${row.page}-${row.condition}-${name}`;
        const source = fs.readFileSync(path.join(path.dirname(input), filename + '.md'));
        return [name.replaceAll('/', '-'), {
            sourceHash: hash(source),
            counts: {
                inline: [...source.toString().matchAll(/style="([^"]*)"/g)].reduce((n, m) => n + m[1].split(';').filter(x => x.trim()).length, 0),
                classes: [...source.toString().matchAll(/class="([^"]*)"/g)].reduce((n, m) => n + m[1].split(/\s+/).filter(Boolean).length, 0),
                wrappers: [...source.toString().matchAll(/<div[ >]/g)].length,
            },
            pngHash: hash(fs.readFileSync(path.join(path.dirname(input), filename + '.png'))),
            contentPreserved: m.contentHash === original.contentHash,
            typographyPreserved: JSON.stringify(m.type) === JSON.stringify(original.type),
            imagesPreserved: JSON.stringify(m.images.map(i => [i.source, i.natural])) === JSON.stringify(original.images.map(i => [i.source, i.natural])),
            maxGeometryDeltaPx: Math.max(...m.geometry.flatMap((r, i) => r.map((v, j) => Math.abs(v - original.geometry[i][j])))),
            audit: Object.fromEntries(['clipped','overlaps','smallText','crowded'].map(k => [k, m.audit[k].length])),
            imageBoxes: m.images.map(i => i.rect),
        }];
    })),
}));
console.log(JSON.stringify(output, null, 2));
