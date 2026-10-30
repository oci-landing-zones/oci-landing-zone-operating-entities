import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { generatePreview } from '../generator/preview';
import { generateOutputs } from '../generator/generate';
import { setAssetLoader } from '../generator/jsonnetVm';
import { buildFlowTraces } from '../services/flowTrace';
import { buildRouteTables } from '../services/routeTables';
import { containsInlineSecrets } from '../services/hybridConnectivity';
import { buildGraphLayout as buildGraph } from './buildGraph';
import { complexHybridModel } from './complexHybrid.testSupport';
import { absoluteNodeRects } from './flowGeometry';
import { physicalSharedSegments, structuralCrossings, validateDiagramLayout } from './layoutQuality';

beforeAll(() => setAssetLoader(async () => ({ wasmBinary: readFileSync('3rd/go-jsonnet/libjsonnet.wasm') })));

describe('three-environment OKE with FastConnect and VPN backup', () => {
  it.each(['hub_a', 'hub_b', 'hub_c', 'hub_e'] as const)('%s retains complete generated routing and clear physical connections', async (kind) => {
    const model = complexHybridModel(kind);
    const preview = await generatePreview(model);
    const tables = buildRouteTables(model, preview.network);
    const activeFlows = model.environments.flatMap((environment) => [
      `${environment.name}:hybrid-in@hybrid-fc-primary:web`, `${environment.name}:hybrid-in@hybrid-vpn-backup:web`,
    ]);
    const graph = buildGraph(model, 5, { allFlows: true }, undefined, tables, preview.inventory);
    const shared = physicalSharedSegments(graph);
    expect(graph.flowErrors).toBeUndefined();
    expect(validateDiagramLayout(graph, { inventory: preview.inventory, routeTables: tables, showRouteTables: true })).toEqual([]);
    expect(structuralCrossings({ ...graph, edges: graph.edges.filter((edge) => !graph.nodes.some((node) => node.id === edge.source && node.kind === 'rtdot')) })).toEqual([]);
    expect(shared).toEqual([]);
    const rects = absoluteNodeRects(graph.nodes);
    for (const dot of graph.nodes.filter((node) => node.rtDotPhysicalOwnerId === 'drg')) {
      const connection = graph.edges.find((edge) => edge.source === dot.rtDotOwnerId && edge.target === 'drg'
        || edge.source === 'drg' && edge.target === dot.rtDotOwnerId)!;
      const endpoint = connection.source === 'drg' ? connection.points![0] : connection.points!.at(-1)!;
      const rect = rects.get(dot.id)!;
      expect(rect.x + rect.width / 2).toBeCloseTo(endpoint.x, 8);
      expect(rect.y + rect.height / 2).toBeCloseTo(endpoint.y, 8);
    }
    for (const flowId of activeFlows) expect(graph.edges.some((edge) => edge.id.startsWith(`flow-${flowId}`))).toBe(true);
    for (const flow of buildFlowTraces(model, activeFlows, 'kind', tables)) expect(flow.ok).toBe(true);
    const outbound = model.environments.flatMap((environment) => [
      `${environment.name}:hybrid-out@hybrid-fc-primary:web`, `${environment.name}:hybrid-out@hybrid-vpn-backup:web`,
    ]);
    for (const flow of buildFlowTraces(model, outbound, 'kind', tables)) expect(flow.ok).toBe(false);
    const dots = graph.nodes.filter((node) => node.rtDotPhysicalOwnerId === 'drg').map((node) => rects.get(node.id)!);
    for (let i = 0; i < dots.length; i++) for (let j = i + 1; j < dots.length; j++) {
      const a = dots[i], b = dots[j];
      expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);
    }
  }, 60_000);

  it('generates three OKE clusters and keeps the diagram fixture free of authentication material', async () => {
    const model = complexHybridModel();
    const outputs = await generateOutputs(model);
    const clusters = Object.values(outputs.files).flatMap((file) => {
      const body = JSON.parse(file) as { oke_clusters_configuration?: { clusters?: Record<string, unknown> } };
      return Object.keys(body.oke_clusters_configuration?.clusters ?? {});
    });
    expect(clusters).toHaveLength(3);
    expect(containsInlineSecrets(model)).toBe(false);
  }, 60_000);
});
