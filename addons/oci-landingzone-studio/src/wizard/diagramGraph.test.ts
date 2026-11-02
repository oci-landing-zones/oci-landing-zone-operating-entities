import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { generatePreview } from '../generator/preview';
import { setAssetLoader } from '../generator/jsonnetVm';
import { buildRouteTables } from '../services/routeTables';
import { toDrawioXml } from '../export/toDrawio';
import * as graphBuilder from '../diagram/buildGraph';
import { createDiagramGraph, REVIEW_DIAGRAM_OPTIONS } from './diagramGraph';
import { absoluteNodeRects } from '../diagram/flowGeometry';
import { complexHybridModel } from '../diagram/complexHybrid.testSupport';

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

  it('keeps open route cards and physical connections in the same places across endpoint and Flow views', async () => {
    const { model, preview } = await generated();
    const getDiagram = createDiagramGraph(model, preview);
    const flow = getDiagram(5, { showFlows: true });
    const cardIds = flow.nodes.filter((node) => node.kind === 'routetable').map((node) => node.id);
    expect(cardIds.length).toBeGreaterThan(1);
    const rect = (node: typeof flow.nodes[number]) => ({ x: node.x, y: node.y, width: node.width, height: node.height });
    for (const id of cardIds) {
      const endpoints = getDiagram(5, { showDots: true, showEndpoints: true, openTables: [id] });
      expect(endpoints.nodes.filter((node) => node.kind === 'routetable').map((node) => node.id)).toEqual([id]);
      for (const node of endpoints.nodes) expect(rect(node), node.id).toEqual(rect(flow.nodes.find((other) => other.id === node.id)!));
      for (const edge of endpoints.edges) expect(edge.points, edge.id).toEqual(flow.edges.find((other) => other.id === edge.id)!.points);
      expect(endpoints.nodes.find((node) => node.rtDotTableId === id)?.rtDotOpen).toBe(true);
    }
    expect(flow.nodes.some((node) => node.endpointName)).toBe(false);
  }, 30_000);

  it('keeps the spokes DRG card stable with OKE and multiple environments', async () => {
    const { model, preview } = await generated(complexHybridModel('hub_a'));
    const getDiagram = createDiagramGraph(model, preview);
    const id = 'DRGRT-FRA-LZ-SPOKES-KEY';
    const endpoints = getDiagram(5, { showDots: true, showEndpoints: true, openTables: [id] });
    const flows = getDiagram(5, { showFlows: true });
    const flowRects = absoluteNodeRects(flows.nodes);
    const wrappers = new Set(['landingzone', 'tenancy', 'region']);
    const contentRight = Math.max(...[...flowRects.values()].filter((rect) => !wrappers.has(rect.id)).map((rect) => rect.x + rect.width),
      ...flows.edges.flatMap((edge) => (edge.points ?? []).map((point) => point.x)));
    const lz = flowRects.get('landingzone')!;
    expect(lz.x + lz.width - contentRight).toBeCloseTo(16);
    for (const card of flows.nodes.filter((node) => node.rtLayoutRole === 'spoke')) {
      const dot = flows.nodes.find((node) => node.rtDotTableId === card.id)!;
      let owner = flowRects.get(dot.rtDotOwnerId!)!;
      while (owner.node.kind !== 'vcn') owner = flowRects.get(owner.node.parentId!)!;
      const network = flowRects.get(owner.node.parentId!)!;
      const environment = flowRects.get(network.node.parentId!)!;
      const cardRect = flowRects.get(card.id)!;
      expect(cardRect.y, card.label).toBeGreaterThanOrEqual(environment.y + 56);
      expect(cardRect.y + cardRect.height, card.label).toBeLessThanOrEqual(environment.y + environment.height - 16);
    }
    const podsCards = flows.nodes.filter((node) => node.kind === 'routetable' && node.label.endsWith('-pods'));
    expect(podsCards.length).toBeGreaterThan(0);
    for (const pods of podsCards) {
      const workers = flows.nodes.find((node) => node.kind === 'routetable' && node.label === pods.label.replace(/-pods$/, '-workers'))!;
      expect(workers).toBeDefined();
      expect(pods.x).toBe(workers.x);
      expect(pods.y + pods.height + 12).toBeLessThanOrEqual(workers.y);
    }
    const a = absoluteNodeRects(endpoints.nodes).get(id)!, b = flowRects.get(id)!;
    expect(a).toBeDefined();
    expect({ x: a.x, y: a.y, width: a.width, height: a.height }).toEqual({ x: b.x, y: b.y, width: b.width, height: b.height });
    expect(endpoints.edges.filter((edge) => edge.target === id).map((edge) => edge.points))
      .toEqual(flows.edges.filter((edge) => edge.target === id).map((edge) => edge.points));
  }, 30_000);

  it('exports the full static routing design after arbitrary live flow and endpoint selections', async () => {
    const { model, preview } = await generated();
    const getDiagram = createDiagramGraph(model, preview);
    getDiagram(5, { showDots: true, showEndpoints: true, openTables: [preview.tables[0].id] });
    const live = getDiagram(5, { showFlows: true, allFlows: true, activeFlows: ['prod:egress:web'], focusFlow: 'prod:egress' });
    expect(live.edges.some((edge) => edge.waypoints)).toBe(true);
    const exported = getDiagram(5, REVIEW_DIAGRAM_OPTIONS);
    expect(exported.nodes.filter((node) => node.kind === 'routetable').map((node) => node.id).sort())
      .toEqual(preview.tables.map((table) => table.id).sort());
    expect(exported.edges.some((edge) => edge.waypoints)).toBe(false);
    expect(exported.nodes.some((node) => node.endpointName || node.rtHighlight?.length)).toBe(false);
    expect(exported.display?.focusFlow).toBeUndefined();
    const xml = toDrawioXml(exported);
    for (const table of preview.tables) expect(xml).toContain(`id="${table.id}"`);
    expect(xml).not.toContain('flowAnimation=1');
    expect(xml).not.toContain('id="flow-');
    expect(xml).not.toContain('-ep-icon');
  }, 30_000);

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
