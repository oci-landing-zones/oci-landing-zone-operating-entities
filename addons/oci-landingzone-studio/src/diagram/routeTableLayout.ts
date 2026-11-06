export const ROUTE_TABLE_METRICS = {
  fontFamily: 'Arial, Helvetica, sans-serif',
  border: 1,
  paddingX: 7,
  gap: 4,
  titleSize: 10,
  titleLine: 14,
  titlePadding: 3,
  titleControl: 20,
  noteSize: 8,
  noteLine: 11,
  notePadding: 2,
  columnSize: 7.5,
  columnLine: 10,
  columnPadding: 2,
  letterSpacing: 0.2,
  rowSize: 8.5,
  rowLine: 11,
  rowPadding: 2,
} as const;

const COLUMNS = {
  vcn: { headers: ['Destination', 'Target Type', 'Target', 'Route Type'], weights: [1, 1.2, 1.3, 0.7] },
  drg: { headers: ['Dest CIDR', 'Next Hop Type', 'Next Hop Name'], weights: [1, 1.1, 1.5] },
} as const;

function wrap(value: string, width: number, fontSize: number, spacing = 0): string[] {
  const lines: string[] = [];
  for (let rest of value.split('\n')) {
    while (rest.length) {
      let end = 0, measured = 0;
      for (const char of rest) {
        const advance = fontSize * (/[mwMW@%]/.test(char) ? 0.95 : /[iljI.,'!:;| ]/.test(char) ? 0.35
          : /[frt-]/.test(char) ? 0.46 : /[A-Z]/.test(char) ? 0.8 : char.charCodeAt(0) <= 127 ? 0.65 : 1) + spacing;
        if (end && measured + advance > width) break;
        measured += advance; end += char.length;
      }
      if (end < rest.length) {
        const prefix = rest.slice(0, end);
        const boundary = Math.max(prefix.lastIndexOf(' ') + 1, prefix.lastIndexOf('-') + 1, prefix.lastIndexOf('_') + 1);
        if (boundary > end / 2) end = boundary;
      }
      lines.push(rest.slice(0, end)); rest = rest.slice(end);
    }
  }
  return lines;
}

export function routeTableLayout(table: { label: string; columns?: 'vcn' | 'drg'; rowCount: number; rows?: { superseded?: boolean }[]; note?: string; width: number }) {
  const m = ROUTE_TABLE_METRICS, columns = COLUMNS[table.columns ?? 'vcn'];
  const innerWidth = table.width - 2 * m.border;
  const contentWidth = Math.max(1, innerWidth - 2 * m.paddingX);
  const gridWidth = Math.max(1, contentWidth - (columns.headers.length - 1) * m.gap);
  const totalWeight = columns.weights.reduce((sum: number, weight) => sum + weight, 0);
  const columnWidths = columns.weights.map((weight) => gridWidth * weight / totalWeight);
  const titleLines = wrap(table.label, Math.max(1, contentWidth - m.titleControl), m.titleSize);
  const noteLines = table.note ? wrap(table.note, contentWidth, m.noteSize) : [];
  const headerLines = columns.headers.map((header, i) => wrap(header.toUpperCase(), columnWidths[i], m.columnSize, m.letterSpacing));
  const titleHeight = Math.max(1, titleLines.length) * m.titleLine + 2 * m.titlePadding;
  const noteHeight = noteLines.length ? noteLines.length * m.noteLine + 2 * m.notePadding : 0;
  const columnHeight = Math.max(...headerLines.map((lines) => lines.length)) * m.columnLine + 2 * m.columnPadding + m.border;
  const rowHeight = m.rowLine + 2 * m.rowPadding;
  const rowNotes = Array.from({ length: table.rowCount }, (_, i) => table.rows?.[i]?.superseded ? '(fully superseded)' : '');
  const rowHeights = rowNotes.map((note) => rowHeight + (note ? m.rowLine : 0));
  return { titleLines, noteLines, headerLines, columnWidths, titleHeight, noteHeight, columnHeight, rowHeight, rowNotes, rowHeights,
    height: 2 * m.border + titleHeight + noteHeight + columnHeight + rowHeights.reduce((sum, height) => sum + height, 0) };
}
