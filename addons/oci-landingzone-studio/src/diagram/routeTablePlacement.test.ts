import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import type { RouteRule, RouteTable } from '../services/routeTables';
import { buildGraphLayout as buildGraph } from './buildGraph';
import { absoluteNodeRects } from './flowGeometry';
import { attachmentLabelLayout, ATTACHMENT_LABEL, DIAGRAM_LAYOUT, drgCaptionBounds, drgCaptionLayout } from './layoutPolicy';
import { newPlatform, newSharedPlatform } from '../services/platforms';


const rule: RouteRule = {
  id: 'default', provenance: 'configured', destination: '0.0.0.0/0',
  targetType: 'VCN Attachment', target: 'attachment', routeType: 'Static', nextHopKind: 'unresolved',
};

function fixture() {
  const model = emptyLzModel();
  const table = (id: string, associations: RouteTable['associations'], count: number): RouteTable => ({
    id, sourceKey: id, name: id, kind: 'drg', columns: 'drg', associations,
    rules: Array.from({ length: count }, (_, i) => ({ ...rule, id: `${id}-${i}` })),
  });
  const tables = [
    table('many-routes', model.environments.map((_, i) => ({ nodeId: `attach-cmp-env-${i}`, kind: 'drg-attachment' })), 12),
    table('vcn-entry', [{ nodeId: 'hub-vcn', kind: 'vcn-ingress' }], 5),
    table('one-route', [{ nodeId: 'attach-hub', kind: 'drg-attachment' }], 1),
  ];
  return { model, tables };
}

describe('owner-local route table callouts', () => {
  it('keeps subnet and VCN heights independent of visible table rows and first-owner order', () => {
    const { model, tables } = fixture();
    const subnetOwners = ['hub-vcn-sn-0', 'hub-vcn-sn-1', 'cmp-env-0-vcn-sn-0', 'cmp-env-0-vcn-sn-1'];
    const shared: RouteTable = { ...tables[0], id: 'shared-subnets', sourceKey: 'shared-subnets', columns: 'vcn',
      associations: subnetOwners.map((nodeId) => ({ nodeId, kind: 'subnet' })),
      rules: Array.from({ length: 30 }, (_, i) => ({ ...rule, id: `rule-${i}` })),
    };
    const closed = buildGraph(model, 5, { showDots: true, showEndpoints: true }, undefined, [shared]);
    const opened = buildGraph(model, 5, { showDots: true, showEndpoints: true, openTables: [shared.id] }, undefined, [shared]);
    const reordered = buildGraph(model, 5, { showDots: true, showEndpoints: true, openTables: [shared.id] }, undefined,
      [{ ...shared, associations: [...shared.associations].reverse() }]);
    expect(opened.nodes.find((node) => node.id === shared.id)!.rtRows).toHaveLength(30);
    for (const node of closed.nodes.filter((node) => node.kind === 'subnet' || node.kind === 'vcn')) {
      for (const graph of [opened, reordered]) {
        const rendered = graph.nodes.find((other) => other.id === node.id)!;
        expect(rendered.height, node.id).toBe(node.height);
        expect(rendered.width, node.id).toBe(node.width);
      }
    }
  });

  it('keeps canonical owner ports and produces the same layout regardless of input table order', () => {
    const { model, tables } = fixture();
    const graph = buildGraph(model, 5, { showFlows: true }, undefined, tables);
    const reversed = buildGraph(model, 5, { showFlows: true }, undefined, [...tables].reverse());
    const rects = absoluteNodeRects(graph.nodes), reverseRects = absoluteNodeRects(reversed.nodes);
    const cards = graph.nodes.filter((node) => node.kind === 'routetable');
    for (const card of cards) {
      expect(reverseRects.get(card.id)).toEqual(rects.get(card.id));
      const a = rects.get(card.id)!;
      for (const other of cards.filter((node) => node.id !== card.id)) {
        const b = rects.get(other.id)!;
        expect(a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y).toBe(false);
      }
    }
    for (const table of tables) for (const [index, association] of table.associations.entries()) {
      const owner = rects.get(association.nodeId)!, dot = rects.get(`dot-${table.id}${index ? `-${index}` : ''}`)!;
      const center = { x: dot.x + dot.width / 2, y: dot.y + dot.height / 2 };
      if (association.kind === 'drg-attachment') {
        const physical = graph.edges.find((edge) => edge.source === association.nodeId && edge.target === 'drg')!;
        expect(dot.node.rtDotOwnerId).toBe(association.nodeId);
        expect(dot.node.rtDotPhysicalOwnerId).toBe('drg');
        expect(center).toEqual(physical.points!.at(-1));
      } else expect(center).toEqual({ x: owner.x + owner.width / 2, y: owner.y + owner.height });
    }
  });
});


describe('content-sized attachment stacks', () => {
  it('preserves complete generated names, safe terminal insets and the physical fan space', () => {
    const model = emptyLzModel();
    model.foundation.regionShortName = 'longregiontoken';
    const platform = newPlatform('custom', [], model.environments);
    platform.key = 'wideplatform';
    const shared = newSharedPlatform('custom', []);
    shared.key = 'sharedplatform';
    model.platforms = [platform];
    model.sharedPlatforms = [shared];
    const graph = buildGraph(model, 5);
    const network = graph.nodes.find((node) => node.id === 'cmp-network')!;
    const attachments = graph.nodes.filter((node) => node.kind === 'attachment' && node.parentId === network.id);
    const drg = graph.nodes.find((node) => node.id === 'drg')!;
    expect(attachments.length).toBeGreaterThan(4);
    expect(new Set(attachments.map((node) => node.width)).size).toBe(1);
    expect(attachments[0].width).toBeGreaterThan(150);
    expect(network.width).toBeGreaterThan(424);
    for (const node of attachments) {
      expect(node.width - attachmentLabelLayout(node.label).textWidth).toBeGreaterThanOrEqual(2 * ATTACHMENT_LABEL.sidePadding);
      expect(node.x).toBeGreaterThanOrEqual(DIAGRAM_LAYOUT.padding);
      expect(node.x + node.width).toBeLessThanOrEqual(network.width - DIAGRAM_LAYOUT.padding);
    }
    expect(attachments.some((node) => node.label === 'drgatt-longregiontoken-lz-preprod-proj')).toBe(true);
    expect(attachments[0].x - drg.x - drg.width).toBeGreaterThanOrEqual(2 * DIAGRAM_LAYOUT.gap + 8 * (attachments.length - 1));
    const captionWidth = drgCaptionLayout(drg.label, drg.width).textWidth;
    expect(drg.x + drg.width / 2 - captionWidth / 2).toBeGreaterThanOrEqual(DIAGRAM_LAYOUT.padding);
    for (const id of ['cmp-security', 'cmp-platform']) expect(graph.nodes.find((node) => node.id === id)!.width).toBe(network.width);
    expect(graph.nodes.find((node) => node.id === 'hub-vcn')!.width).toBe(362);
  });

  it('keeps fan verticals clear of the complete DRG caption below its glyph', () => {
    const graph = buildGraph(emptyLzModel(), 5);
    const rects = absoluteNodeRects(graph.nodes);
    const drg = rects.get('drg')!;
    const caption = drgCaptionBounds({ ...drg, label: drg.node.label });
    let crossingHeight = 0;
    for (const edge of graph.edges.filter((edge) => edge.target === 'drg')) {
      for (let i = 1; i < edge.points!.length; i++) {
        const a = edge.points![i - 1], b = edge.points![i];
        if (a.x !== b.x || Math.max(a.y, b.y) <= caption.y || Math.min(a.y, b.y) >= caption.y + caption.height) continue;
        crossingHeight++;
        expect(a.x).toBeGreaterThanOrEqual(caption.x + caption.width + DIAGRAM_LAYOUT.gap);
      }
    }
    expect(crossingHeight).toBeGreaterThan(0);
  });

  it('measures wide glyphs and individual RPC lines without losing terminal padding', () => {
    expect(attachmentLabelLayout('wwwwwwww').textWidth).toBeGreaterThan(attachmentLabelLayout('iiiiiiii').textWidth);
    expect(attachmentLabelLayout('short\nlonger-line')).toEqual(attachmentLabelLayout('longer-line'));
    const model = emptyLzModel();
    model.environments = [];
    model.projects = [];
    const name = 'wide-remote-connection-'.repeat(4);
    model.remotePeeringConnections = [{ id: 'remote', name, role: 'acceptor', peerRegionName: 'eu-amsterdam-1', remoteCidrs: ['10.200.0.0/21'] }];
    const graph = buildGraph(model, 5);
    const rpc = graph.nodes.find((node) => node.id === 'rpc-remote')!;
    expect(rpc.label).toBe(`RPC ${name} (acceptor)\nPeer: eu-amsterdam-1\n10.200.0.0/21`);
    expect(rpc.width).toBeGreaterThan(380);
    expect(rpc.width - attachmentLabelLayout(rpc.label).textWidth).toBeGreaterThanOrEqual(2 * ATTACHMENT_LABEL.sidePadding);
    const landingzone = graph.nodes.find((node) => node.id === 'landingzone')!;
    expect(rpc.x + rpc.width).toBeLessThanOrEqual(landingzone.width - DIAGRAM_LAYOUT.padding);
  });
});
