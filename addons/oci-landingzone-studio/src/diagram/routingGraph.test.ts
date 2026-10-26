import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { hubKindDefaults } from '../services/hubKinds';
import { generatedRouteTables } from '../services/routingFixtures.testSupport';
import { buildGraph } from './buildGraph';
import { absoluteNodeRects } from './flowGeometry';
import { flowDisplayPoints, structuralEdgePoints } from './displayGeometry';
import type { DiagramEdge } from '../model/types';
import { newPlatform, newSharedPlatform } from '../services/platforms';
import { createFlowPlayback, flowHopMarkers, pointAtDistance, sampleFlowPlayback } from './flowPlayback';

function includesPolyline(points: NonNullable<DiagramEdge['points']>, expected: NonNullable<DiagramEdge['points']>): boolean {
  return points.some((_, index) => expected.every((point, offset) => point.x === points[index + offset]?.x && point.y === points[index + offset]?.y));
}

describe('canonical routing graph', () => {
  it.each(['hub_a', 'hub_b', 'hub_c', 'hub_e'] as const)('draws every %s generated table at its actual association and reuses physical attachment geometry', async (hubKind) => {
    const model = emptyLzModel();
    model.network = { hubKind, ...hubKindDefaults(hubKind) };
    const tables = await generatedRouteTables(model);
    const graph = buildGraph(model, 5, { allFlows: true }, undefined, tables);
    const rects = absoluteNodeRects(graph.nodes);
    expect(graph.nodes.filter((node) => node.kind === 'routetable').map((node) => node.id).sort()).toEqual(tables.map((table) => table.id).sort());
    const lz = rects.get('landingzone')!;
    for (const table of tables) {
      const node = graph.nodes.find((node) => node.id === table.id)!;
      expect(node.rtRows?.map((row) => row.id)).toEqual(table.rules.map((rule) => rule.id));
      for (const [index, association] of table.associations.entries()) {
        const owner = rects.get(association.nodeId)!;
        expect(owner, association.nodeId).toBeDefined();
        const dot = graph.nodes.find((node) => node.id === (index ? `dot-${table.id}-${index}` : `dot-${table.id}`))!;
        expect(dot, `${table.id} owner ${association.nodeId}`).toBeDefined();
        const centre = { x: lz.x + dot.x + dot.width / 2, y: lz.y + dot.y + dot.height / 2 };
        if (association.kind === 'gateway') {
          expect(centre.y).toBe(owner.y + 17);
          expect(Math.abs(centre.x - owner.x - owner.width / 2)).toBe(17);
        } else if (association.kind === 'vcn-ingress') {
          expect(centre).toEqual({ x: owner.x + owner.width / 2, y: owner.y + owner.height });
        } else if (association.kind === 'drg-attachment' || association.kind === 'rpc-attachment') {
          expect(centre).toEqual({ x: owner.x, y: owner.y + owner.height / 2 });
        }
      }
    }

    const flows = graph.edges.filter((edge) => edge.waypoints);
    const belongsTo = (id: string, ancestor: string): boolean => {
      let rect = rects.get(id);
      while (rect) {
        if (rect.id === ancestor) return true;
        rect = rect.node.parentId ? rects.get(rect.node.parentId) : undefined;
      }
      return false;
    };
    expect(flows.length).toBeGreaterThan(0);
    for (const flow of flows) {
      expect(flowDisplayPoints(flow)).toBe(flow.points);
      expect(flow.visits?.map((visit) => visit.node)).toEqual(flow.waypoints);
      const distances = flow.visits!.map((visit) => visit.distance);
      expect(distances).toEqual([...distances].sort((a, b) => a - b));
      for (const hop of flow.flowHops ?? []) expect(flow.visits?.[hop.visitIndex]?.node, `${flow.id} hop ${hop.ruleId}`).toBe(hop.node);
      const playback = createFlowPlayback(flow);
      expect(playback.valid).toBe(true);
      for (const badge of flowHopMarkers(flow)) {
        const hop = flow.flowHops![badge.seq - 1];
        const stop = sampleFlowPlayback(playback, 0, badge.seq - 1);
        expect(pointAtDistance(flow.points!, stop.distance)).toEqual({ x: badge.x, y: badge.y });
        if (!hop.tableId) continue;
        const dot = rects.get(badge.anchorId!);
        expect(dot, `${flow.id} hop ${badge.seq} route dot`).toBeDefined();
        expect(dot!.node.rtDotTableId).toBe(hop.tableId);
        expect(dot!.node.rtDotOwnerId).toBe(hop.tableOwner);
        expect({ x: badge.x, y: badge.y }).toEqual({ x: dot!.x + dot!.width / 2, y: dot!.y + dot!.height / 2 });
      }
      for (const edge of graph.edges.filter((edge) => !edge.waypoints && (edge.source.startsWith('attach-') || edge.target.startsWith('attach-')))) {
        const visited = flow.waypoints!;
        const connectionIsUsed = visited.some((node, index) => {
          const next = visited[index + 1];
          if (!next) return false;
          return (node === edge.source && next === edge.target) || (node === edge.target && next === edge.source)
            || (rects.get(edge.source)?.node.kind === 'vcn' && ((belongsTo(node, edge.source) && next === edge.target) || (node === edge.target && belongsTo(next, edge.source))));
        });
        if (!connectionIsUsed) continue;
        const canonical = structuralEdgePoints(edge, rects);
        expect(includesPolyline(flow.points!, canonical) || includesPolyline(flow.points!, [...canonical].reverse()), `${flow.id} leaves ${edge.id}`).toBe(true);
      }
      flow.points!.slice(1).forEach((point, index) => expect(point.x === flow.points![index].x || point.y === flow.points![index].y).toBe(true));
    }
    const repeated = flows.flatMap((flow) => flow.visits!.filter((visit) => visit.node === 'attach-hub').map((visit) => ({ flow: flow.id, ...visit })));
    if (hubKind !== 'hub_e') {
      const hairpin = flows.find((flow) => flow.visits!.filter((visit) => visit.node === 'attach-hub').length > 1)!;
      expect(hairpin, `${hubKind} east-west returns through the hub attachment`).toBeDefined();
      const visits = repeated.filter((visit) => visit.flow === hairpin.id);
      expect(visits[1].distance).toBeGreaterThan(visits[0].distance);
      expect(visits[1].pointIndex).toBeGreaterThan(visits[0].pointIndex);
    }
  }, 60_000);

  it('anchors a shared table to the dot belonging to each flow source rather than its first owner', async () => {
    const model = emptyLzModel();
    const tables = await generatedRouteTables(model);
    const first = tables.find((table) => table.associations.some((owner) => owner.nodeId === 'cmp-env-0-vcn-sn-0'))!;
    const second = tables.find((table) => table.associations.some((owner) => owner.nodeId === 'cmp-env-1-vcn-sn-0'))!;
    const shared = { ...first, associations: [...first.associations, ...second.associations] };
    const inventory = tables.filter((table) => table !== first && table !== second).concat(shared);
    const graph = buildGraph(model, 5, { activeFlows: ['prod:egress:web', 'preprod:egress:web'] }, undefined, inventory);
    const anchors = graph.edges.filter((edge) => edge.waypoints).map((flow) => flowHopMarkers(flow)[0].anchorId);
    expect(anchors).toHaveLength(2);
    expect(anchors[0]).toBeDefined();
    expect(anchors[1]).toBeDefined();
    expect(anchors[0]).not.toBe(anchors[1]);
    const owners = anchors.map((id) => graph.nodes.find((node) => node.id === id)?.rtDotOwnerId);
    expect(owners).toEqual(['cmp-env-0-vcn-sn-0', 'cmp-env-1-vcn-sn-0']);
  });

  it('keeps platform, gateway, VCN, DRG and RPC tables visible beside their generated owners', async () => {
    const model = emptyLzModel();
    model.platforms = [newPlatform('oke_simple', [], model.environments)];
    model.sharedPlatforms = [newSharedPlatform('custom', [])];
    model.remotePeeringConnections = [{ id: 'remote', name: 'remote', role: 'acceptor', remoteCidrs: ['10.200.0.0/21'], peerRegionName: 'eu-amsterdam-1' }];
    const tables = await generatedRouteTables(model);
    const graph = buildGraph(model, 5, { showFlows: true }, undefined, tables);
    const ids = new Set(graph.nodes.map((node) => node.id));
    expect(graph.nodes.filter((node) => node.kind === 'routetable')).toHaveLength(tables.length);
    const kinds = new Set(tables.flatMap((table) => table.associations.map((association) => association.kind)));
    expect(kinds).toEqual(new Set(['subnet', 'gateway', 'vcn-ingress', 'drg-attachment', 'rpc-attachment']));
    for (const table of tables) for (const association of table.associations) expect(ids.has(association.nodeId), `${table.id}: ${association.nodeId}`).toBe(true);
    for (const table of tables.filter((table) => table.associations.some((association) => association.nodeId.startsWith('shared-plat-vcn-') && association.kind === 'subnet'))) {
      const box = graph.nodes.find((node) => node.id === table.id)!;
      const network = graph.nodes.find((node) => node.id === 'cmp-network')!;
      expect(box.x).toBeGreaterThan(network.x + network.width);
      expect(box.x).toBeLessThan(graph.nodes.find((node) => node.id === 'cmp-env-0')!.x);
    }
  }, 60_000);

  it('retains unowned generated tables with a diagnostic instead of silently dropping them', async () => {
    const model = emptyLzModel();
    const tables = await generatedRouteTables(model);
    const unowned = { ...tables[0], id: 'RT-UNOWNED', sourceKey: 'RT-UNOWNED', associations: [], attachTo: undefined, attachExtra: [], rules: [] };
    const graph = buildGraph(model, 5, { showFlows: true }, undefined, [...tables, unowned]);
    expect(graph.nodes.find((node) => node.id === unowned.id)?.rtNote).toContain('No diagram resource association');
    const boxes = absoluteNodeRects(graph.nodes);
    const targets = graph.nodes.filter((node) => ['vcn', 'routetable', 'project', 'subnet', 'attachment', 'drg'].includes(node.kind));
    for (const table of graph.nodes.filter((node) => node.kind === 'routetable')) {
      const a = boxes.get(table.id)!;
      for (const target of targets.filter((node) => node.id !== table.id)) {
        const b = boxes.get(target.id)!;
        expect(a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y, `${table.id} overlaps ${target.id}`).toBe(false);
      }
    }
  }, 60_000);
});
