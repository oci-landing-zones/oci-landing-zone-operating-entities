import { describe, expect, it } from 'vitest';
import { resourceGroupLayout, resourceGroupSvg } from './resourceGroups';

describe('shared resource block rendering', () => {
  it('draws an identity domain with individual group cards that wrap into rows', () => {
    const items = [{ key: 'COMMON', name: 'id_lz_common' }, ...Array.from({ length: 8 }, (_, i) => ({ key: `GROUP-${i}`, name: `grp-long-project-name-${i}-admin` }))];
    const wide = resourceGroupLayout('identitydomain', items, 1100);
    const narrow = resourceGroupLayout('identitydomain', items, 400);
    expect(narrow.height).toBeGreaterThan(wide.height);
    const svg = resourceGroupSvg('identitydomain', items, 1100);
    expect(svg).toContain('Identity Domain');
    expect(svg).toContain('id_lz_common');
    for (const item of items.slice(1)) expect(svg).toContain(`<title>${item.name}</title>`);
    expect(svg).toContain(`viewBox="0 0 1100 ${wide.height}"`);
  });
  it('wraps long generated names without dropping any characters and grows to fit', () => {
    const name = 'generated-extra-long-compartment-resource-name-without-assuming-any-fixed-prefix';
    const items = [{ key: 'NEW-KEY', name }];
    const narrow = resourceGroupLayout('scanning', items, 168);
    const wide = resourceGroupLayout('scanning', items, 320);
    expect(narrow.rows[0].lines.join('')).toBe(name);
    expect(narrow.headingLines).toHaveLength(2);
    expect(narrow.bodyTop).toBeGreaterThan(narrow.headingYs.at(-1)! + 12);
    expect(narrow.height).toBeGreaterThan(wide.height);
    expect(narrow.height).toBeGreaterThan(narrow.bodyTop + 14 * (narrow.rows[0].lines.length - 1));
  });

  it.each(['events', 'scanning', 'securityrecipes'] as const)('centres the %s icon and complete heading block, including wrapped headings', (kind) => {
    const layout = resourceGroupLayout(kind, [{ key: 'one', name: 'generated-name' }], 168);
    expect((layout.headingYs[0] + layout.headingYs.at(-1)!) / 2).toBe(layout.headerCenter);
    expect(layout.iconY + 12).toBe(layout.headerCenter);
    expect(layout.height).toBeLessThanOrEqual(60);
    expect(layout.height - layout.rows[0].y).toBe(9);
    expect(resourceGroupSvg(kind, [{ key: 'one', name: 'generated-name' }], 168)).toContain('dominant-baseline="central"');
  });

  it('renders all names with XML escaping and a shared measured extent', () => {
    const items = [{ key: 'x', name: 'generated <script> & "quoted"' }, { key: 'y', name: 'new-jsonnet-resource' }];
    const svg = resourceGroupSvg('events', items, 240);
    expect(svg).toContain(`viewBox="0 0 240 ${resourceGroupLayout('events', items, 240).height}"`);
    expect(svg).toContain('generated &lt;script&gt; &amp; &quot;quoted&quot;');
    expect(svg).toContain('new-jsonnet-resource');
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('Events');
  });
});
