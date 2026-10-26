import type { ResourceKind } from '../services/generatedResources';

const TEAL = '#2A5B66';
const INK = '#3f4750';
const FONT = 'Arial, Helvetica, sans-serif';
const LINE_HEIGHT = 14;
const ICON_SIZE = 24;
const ROW_GAP = 2;
const LABELS: Record<ResourceKind, string> = {
  events: 'Events',
  vault: 'Vault',
  scanning: 'Vulnerability Scanning',
  notifications: 'Notifications',
  flowlogs: 'Flow Log Groups',
  securityrecipes: 'Security Zone Recipes',
};

// These are service glyphs; resource names are supplied only by Jsonnet output.
const ICONS: Record<ResourceKind, string> = {
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
