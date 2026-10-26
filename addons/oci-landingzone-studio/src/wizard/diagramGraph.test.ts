import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { generatePreview } from '../generator/preview';
import { setAssetLoader } from '../generator/jsonnetVm';
import { buildRouteTables } from '../services/routeTables';
import { toDrawioXml } from '../export/toDrawio';
import * as graphBuilder from '../diagram/buildGraph';
import { createDiagramGraph } from './diagramGraph';

beforeAll(() => setAssetLoader(async () => ({ wasmBinary: readFileSync('3rd/go-jsonnet/libjsonnet.wasm') })));

async function generated(model = emptyLzModel()) {
  const preview = await generatePreview(model);
  return { model, preview: { tables: buildRouteTables(model, preview.network), inventory: preview.inventory } };
}

describe('diagram geometry and chosen export layers', () => {
  it('changes focus and highlights without rebuilding any geometry or dropping active flows', async () => {
    const { model, preview } = await generated();
    const build = vi.spyOn(graphBuilder, 'buildGraph');
    try {
      const getDiagram = createDiagramGraph(model, preview);
      const all = getDiagram(5, { allFlows: true });
      const focused = getDiagram(5, { allFlows: true, focusFlow: 'prod:services' });
      const other = getDiagram(5, { allFlows: true, focusFlow: 'preprod:egress' });
      expect(build).toHaveBeenCalledTimes(1);
      expect(focused.edges).toBe(all.edges);
      expect(other.edges).toBe(all.edges);
      expect(focused.display).toEqual({ allFlows: true, focusFlow: 'prod:services' });
      expect(focused.nodes.filter((node) => node.kind === 'routetable' && node.rtHighlight?.length).map((node) => node.id))
        .not.toEqual(other.nodes.filter((node) => node.kind === 'routetable' && node.rtHighlight?.length).map((node) => node.id));
      expect(getDiagram(5, { allFlows: true })).toBe(all);
    } finally { build.mockRestore(); }
  });

  it('exports the chosen endpoints, table and flows after rendering a clean overview', async () => {
    const { model, preview } = await generated();
    const getDiagram = createDiagramGraph(model, preview);
    const chosen = { showDots: true, showEndpoints: true, activeFlows: ['prod:egress:web'], focusFlow: 'prod:egress' };
    const visible = getDiagram(5, chosen);
    const overview = getDiagram(5, {});
    expect(overview.edges.some((edge) => edge.waypoints)).toBe(false);
    expect(overview.nodes.some((node) => node.endpointName || node.kind === 'routetable')).toBe(false);
    const exported = getDiagram(5, chosen);
    expect(exported.edges).toBe(visible.edges);
    const xml = toDrawioXml(exported);
    expect(xml).toContain('id="cmp-env-0-vcn-sn-0-ep-icon"');
    expect(xml).toContain('id="RT-FRA-LZ-PROD-PROJ-GENERIC-KEY"');
    expect(xml).toContain('id="flow-prod:egress:web#0"');
    expect(exported.display?.focusFlow).toBe('prod:egress');
  });

  it('builds edited export layers only when requested and uses their current generated snapshot', async () => {
    const initial = await generated();
    const previous = createDiagramGraph(initial.model, initial.preview)(5, { showEndpoints: true });
    const model = { ...initial.model, foundation: { ...initial.model.foundation, regionShortName: 'ams' } };
    const current = await generated(model);
    const build = vi.spyOn(graphBuilder, 'buildGraph');
    try {
      const getDiagram = createDiagramGraph(current.model, current.preview);
      getDiagram(5, {});
      expect(build).toHaveBeenCalledTimes(1);
      const exported = getDiagram(5, { showEndpoints: true });
      expect(build).toHaveBeenCalledTimes(2);
      expect(exported).not.toBe(previous);
      const xml = toDrawioXml(exported);
      expect(xml.includes('sn-ams-lz-prod-web')).toBe(true);
      expect(xml.includes('sn-fra-lz-prod-web')).toBe(false);
      expect(xml).toContain('id="cmp-env-0-vcn-sn-0-ep-icon"');
    } finally { build.mockRestore(); }
  });
});
