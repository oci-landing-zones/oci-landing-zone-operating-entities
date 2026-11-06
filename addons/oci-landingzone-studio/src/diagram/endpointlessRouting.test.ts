import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { hubKindDefaults } from '../services/hubKinds';
import { newSharedPlatform } from '../services/platforms';
import { generatedRouteTables } from '../services/routingFixtures.testSupport';
import { buildGraphLayout as buildGraph } from './buildGraph';

const hubs = [
  ['hub_a', 9],
  ['hub_b', 7],
  ['hub_c', 8],
  ['hub_e', 4],
] as const;

describe('routing tables without Projects endpoints', () => {
  for (const scenario of ['no environments', 'disabled Projects VCNs with a shared platform'] as const) {
    it.each(hubs)(`retains the complete %s inventory with ${scenario}`, async (hubKind, hubTableCount) => {
      const model = emptyLzModel();
      model.network = { hubKind, ...hubKindDefaults(hubKind) };
      model.projects = [];
      const shared = scenario !== 'no environments';
      if (shared) {
        model.environments.forEach((environment) => { environment.projectNetworkEnabled = false; });
        model.sharedPlatforms = [newSharedPlatform('custom', [])];
      } else model.environments = [];

      const tables = await generatedRouteTables(model);
      expect(tables).toHaveLength(hubTableCount + Number(shared));
      const graph = buildGraph(model, 5, { showFlows: true }, undefined, tables);
      const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
      expect(graph.nodes.filter((node) => node.kind === 'routetable').map((node) => node.id).sort())
        .toEqual(tables.map((table) => table.id).sort());
      expect(graph.edges.some((edge) => edge.waypoints)).toBe(false);
      expect(graph.nodes.some((node) => /^cmp-env-\d+-vcn/.test(node.id))).toBe(false);

      const associations = tables.flatMap((table) => table.associations);
      expect(associations.length).toBeGreaterThan(0);
      expect(graph.nodes.filter((node) => node.kind === 'rtdot')).toHaveLength(associations.length);
      expect(graph.edges.filter((edge) => edge.source.startsWith('dot-'))).toHaveLength(associations.length);
      for (const table of tables) {
        expect(nodes.get(table.id)?.rtRows?.map((row) => row.id)).toEqual(table.rules.map((rule) => rule.id));
        expect(nodes.get(table.id)?.rtNote ?? '').not.toContain('Diagram resources unavailable');
        for (const [index, association] of table.associations.entries()) {
          expect(nodes.has(association.nodeId), `${table.id}: ${association.nodeId}`).toBe(true);
          const dotId = index === 0 ? `dot-${table.id}` : `dot-${table.id}-${index}`;
          expect(nodes.get(dotId)?.rtDotTableId).toBe(table.id);
          expect(graph.edges.some((edge) => edge.source === dotId && edge.target === table.id)).toBe(true);
        }
      }
      if (shared) {
        expect(associations).toContainEqual({ nodeId: 'shared-plat-vcn-0-sn-0', kind: 'subnet' });
        expect(associations).toContainEqual({ nodeId: 'attach-shared-0', kind: 'drg-attachment' });
      }
    }, 60_000);
  }
});
