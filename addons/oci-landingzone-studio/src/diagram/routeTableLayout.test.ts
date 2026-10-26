import { describe, expect, it } from 'vitest';
import { routeTableLayout, ROUTE_TABLE_METRICS as m } from './routeTableLayout';

describe('route-table content extents', () => {
  it('ends at the final row without an unused footer, including an empty table', () => {
    for (const columns of ['vcn', 'drg'] as const) {
      const empty = routeTableLayout({ label: 'Generated table', columns, width: 310, rowCount: 0 });
      expect(empty.height).toBe(2 * m.border + empty.titleHeight + empty.columnHeight);
      for (const rowCount of [1, 2, 9, 30]) {
        const table = routeTableLayout({ label: 'Generated table', columns, width: 310, rowCount });
        expect(table.height - empty.height).toBe(rowCount * 15);
      }
    }
    expect(routeTableLayout({ label: 'rt-hub', width: 310, rowCount: 2 }).height).toBe(77);
  });

  it('reserves all wrapped title, note and column lines without dropping long generated identifiers', () => {
    const label = 'DRGRT-VERY-LONG-GENERATED-ATTACHMENT-ROUTING-TABLE-KEY';
    const note = `Imports are derived from ${'GENERATED-ATTACHMENT-KEY-'.repeat(8)} and remote dependencies.`;
    const table = routeTableLayout({ label, note, columns: 'drg', width: 180, rowCount: 3 });
    expect(table.titleLines.length).toBeGreaterThan(1);
    expect(table.noteLines.length).toBeGreaterThan(2);
    expect(table.titleLines.join('')).toBe(label);
    expect(table.noteLines.join('')).toBe(note);
    expect(table.titleHeight).toBe(table.titleLines.length * m.titleLine + 2 * m.titlePadding);
    expect(table.noteHeight).toBe(table.noteLines.length * m.noteLine + 2 * m.notePadding);
    expect(table.columnHeight).toBe(Math.max(...table.headerLines.map((lines) => lines.length)) * m.columnLine + 2 * m.columnPadding + m.border);
    expect(table.height).toBe(2 * m.border + table.titleHeight + table.noteHeight + table.columnHeight + 3 * table.rowHeight);
    expect(table.columnWidths.reduce((sum, width) => sum + width, 0) + 2 * m.gap + 2 * m.paddingX + 2 * m.border).toBeCloseTo(180);
  });
});
