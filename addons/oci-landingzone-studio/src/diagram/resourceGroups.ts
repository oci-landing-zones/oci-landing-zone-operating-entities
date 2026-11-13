import type { ResourceKind } from '../services/generatedResources';

const TEAL = '#2A5B66';
const INK = '#3f4750';
const FONT = 'Arial, Helvetica, sans-serif';
const LINE_HEIGHT = 14;
const ICON_SIZE = 24;
const ROW_GAP = 2;
const LABELS: Record<ResourceKind, string> = {
  bastion: 'OCI Bastion',
  events: 'Events',
  vault: 'Vault',
  scanning: 'Vulnerability Scanning',
  notifications: 'Notifications',
  flowlogs: 'Flow Log Groups',
  securityrecipes: 'Security Zone Recipes',
};

// These are service glyphs; resource names are supplied only by Jsonnet output.
const ICONS: Record<ResourceKind, string> = {
  // Reuse the OCI Bastion glyph embedded in the Multi-OE service-provider design.
  bastion: `<g transform="translate(8 1)" fill="${TEAL}" stroke="none"><path d="M2.52,38.14V35.48H14a7,7,0,0,1,.2-1.53H4.31L5,19.48h13.4l.44,9.75A6.26,6.26,0,0,1,20.32,29l-.43-9.53h.16a1.72,1.72,0,0,0,1.71-1.72v-8H16.43v3.05h-2.1V9.76h-1.9v-3h4.06a.13.13,0,0,1,.13.13h0a1.67,1.67,0,0,0,1.66,1.59h5.85L22.39,5.62l1.7-2.91H18.14v0A1.69,1.69,0,0,0,16.46,1H10.9V9.76H9v3.05H6.9V9.76H1.57v8a1.72,1.72,0,0,0,1.72,1.72h.15L2.79,34H1v5.72H15.39a6.58,6.58,0,0,1-.91-1.53ZM21.43,4.24l-.82,1.4.78,1.26H18.28a.13.13,0,0,1-.14-.13V4.24Zm-5-1.72a.17.17,0,0,1,.16.17V5.2H12.43V2.52ZM3.29,18a.18.18,0,0,1-.19-.19V11.29H5.38v3h5.14v-3h2.29v3H18v-3h2.29v6.47a.19.19,0,0,1-.19.19H3.29Z"/><path d="M20.52,30.14A5.43,5.43,0,1,0,26,35.57,5.43,5.43,0,0,0,20.52,30.14Zm0,9.34a3.91,3.91,0,1,1,3.91-3.91A3.91,3.91,0,0,1,20.52,39.48Z"/><polygon points="21.88 33.74 19.78 35.84 19.13 35.19 18.05 36.26 19.78 38 22.96 34.82 21.88 33.74"/><polygon points="13.23 22.48 14.22 23.48 10.14 23.48 10.14 25 14.2 25 13.23 25.97 14.3 27.05 17.13 24.23 14.3 21.41 13.23 22.48"/><polygon points="10.18 26.55 9.1 25.48 6.28 28.3 9.1 31.12 10.18 30.04 9.33 29.19 13.19 29.19 13.19 27.67 9.06 27.67 10.18 26.55"/></g>`,
  events: '<path d="M10 9h8m7 9 9-9M25 26l9 9M8 24h8"/><circle cx="21" cy="21" r="7"/><rect x="3" y="3" width="7" height="7"/><rect x="34" y="3" width="7" height="7"/><rect x="34" y="34" width="7" height="7"/><path d="m3 20 4-7 4 7Z"/>',
  vault: '<path d="m22 3 15 6v13c0 9-8 16-15 20C15 38 7 31 7 22V9Z"/><rect x="14" y="15" width="16" height="13" rx="1"/><path d="M18 15v-4h8v4m-4 6v4"/>',
  scanning: '<path d="m18 3 13 5v11c0 8-7 14-13 17C12 33 5 27 5 19V8Z"/><path d="m12 17 4 4 8-9"/><circle cx="29" cy="29" r="8"/><path d="m35 35 7 7"/>',
  notifications: '<path d="M5 4h27v34H5Zm4 0V2h27v30m-23-1h5m-5-8h5m-5-8h5m8 16h4m-4-8h4m-4-8h4M36 13l6 4-6 4m0 8 6 4-6 4"/>',
  flowlogs: '<circle cx="28" cy="16" r="12"/><path d="m19 25-3-3L3 35l7 7 13-13-3-3m4-17h8m-8 5h8m-8 5h5"/>',
  securityrecipes: '<path d="M4 14h29v27H4Z" stroke-dasharray="3 2"/><path d="m29 2 11 5v10c0 6-5 12-11 15-6-3-11-9-11-15V7Z"/><path d="M26 12v-2a3 3 0 0 1 6 0v2m-8 0h10v9H24Zm5 4v2"/>',
};

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function wrap(value: string, width: number, fontSize: number): string[] {
  // Conservative Arial advances keep wrapping identical without browser-only font measurement.
  const advance = (char: string) => fontSize * (
    /[mwMW@%]/.test(char) ? 0.95 : /[iljI.,'!:;| ]/.test(char) ? 0.3
      : /[frt-]/.test(char) ? 0.36 : /[A-Z]/.test(char) ? 0.78 : char.charCodeAt(0) <= 127 ? 0.56 : 1
  );
  const lines: string[] = [];
  let rest = value;
  while (rest.length) {
    let limit = 0, measured = 0;
    for (const char of rest) {
      if (limit && measured + advance(char) > width) break;
      measured += advance(char);
      limit += char.length;
    }
    if (limit === rest.length) break;
    const segment = rest.slice(0, limit);
    const boundary = Math.max(segment.lastIndexOf('-') + 1, segment.lastIndexOf('_') + 1, segment.lastIndexOf(' '));
    const at = boundary > limit / 2 ? boundary : limit;
    lines.push(rest.slice(0, at));
    rest = rest.slice(at);
  }
  lines.push(rest);
  return lines;
}

export function resourceGroupLayout(kind: ResourceKind, items: { key: string; name: string }[], width: number) {
  const label = LABELS[kind];
  const headingLines = wrap(label, width - 42, 12);
  const headerHeight = Math.max(ICON_SIZE, headingLines.length * LINE_HEIGHT);
  const headerCenter = 4 + headerHeight / 2;
  const headingYs = headingLines.map((_, index) => headerCenter + (index - (headingLines.length - 1) / 2) * LINE_HEIGHT);
  const bodyTop = 4 + headerHeight + 12;
  let y = bodyTop;
  const rows = items.map((item) => {
    const lines = wrap(item.name, width - 24, 11);
    const row = { ...item, lines, y };
    y += lines.length * LINE_HEIGHT + ROW_GAP;
    return row;
  });
  const last = rows.at(-1);
  const height = last ? last.y + (last.lines.length - 1) * LINE_HEIGHT + 9 : 4 + headerHeight + 6;
  return { label, headingLines, headingYs, iconY: headerCenter - ICON_SIZE / 2, headerCenter, rows, bodyTop, height };
}

/** Both renderers embed this same measured resource block. */
export function resourceGroupSvg(kind: ResourceKind, items: { key: string; name: string }[], width: number): string {
  const layout = resourceGroupLayout(kind, items, width);
  const rows = layout.rows.map((row) => {
    const text = row.lines.map((line, index) => `<text x="${index ? 17 : 8}" y="${row.y + index * LINE_HEIGHT}" font-size="11">${index ? '' : '• '}${escapeXml(line)}</text>`).join('');
    return `<g><title>${escapeXml(row.name)}</title>${text}</g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${layout.height}" viewBox="0 0 ${width} ${layout.height}"><g font-family="${FONT}" fill="${INK}"><rect x="0.75" y="0.75" width="${width - 1.5}" height="${layout.height - 1.5}" fill="none" stroke="#96938d" stroke-dasharray="3 3"/><svg x="6" y="${layout.iconY}" width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 44 44"><g fill="#ffffff" stroke="${TEAL}" stroke-width="1.8" stroke-linejoin="round">${ICONS[kind]}</g></svg>${layout.headingLines.map((line, index) => `<text x="36" y="${layout.headingYs[index]}" dominant-baseline="central" font-size="12" font-weight="700">${escapeXml(line.trim())}</text>`).join('')}${rows}</g></svg>`;
}
