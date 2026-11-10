import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { buildRouteTables } from './routeTables';

function inventory(destinations: string[], cidrs = ['10.0.0.0/16']) {
  return buildRouteTables(emptyLzModel(), { network_configuration: {
    network_configuration_categories: { shared: {
      vcns: { vcn: { display_name: 'vcn-fra-lz-hub', cidr_blocks: cidrs,
        route_tables: { table: { route_rules: Object.fromEntries(destinations.map((destination, i) => [
          `rule-${i}`, { destination, network_entity_key: 'firewall' },
        ])) } },
      } },
      non_vcn_specific_gateways: { dynamic_routing_gateways: {
        drg: { drg_route_tables: { drgTable: { route_rules: {} } } },
      } },
    } },
  } });
}

describe('implicit local routes and prefix coverage', () => {
  it('adds every generated VCN CIDR to VCN tables, without inventing subnet routes or DRG local routes', () => {
    const tables = inventory([], ['10.0.0.0/16', '10.2.0.0/16']);
    expect(tables.find((table) => table.id === 'table')!.rules).toEqual([
      expect.objectContaining({ destination: '10.0.0.0/16', provenance: 'implicit-local', routeType: 'Implicit', nextHopKind: 'local', targetKey: 'vcn' }),
      expect.objectContaining({ destination: '10.2.0.0/16', provenance: 'implicit-local', routeType: 'Implicit', nextHopKind: 'local', targetKey: 'vcn' }),
    ]);
    expect(tables.find((table) => table.id === 'drgTable')!.rules).toEqual([]);
  });

  it.each([
    [['0.0.0.0/0'], undefined],
    [['10.0.0.0/16'], true],
    [['10.0.0.0/17'], undefined],
    [['10.0.0.0/17', '10.0.128.0/17'], true],
    [['10.0.0.0/17', '10.0.0.0/18'], undefined],
    [['10.1.0.0/16'], undefined],
  ] as const)('evaluates coverage for %j without counting overlapping prefixes twice', (destinations, expected) => {
    const rules = inventory([...destinations])[0].rules;
    const local = rules.find((rule) => rule.provenance === 'implicit-local')!;
    expect(local.superseded).toBe(expected);
    if (destinations[0] === '0.0.0.0/0') expect(rules[0].superseded).toBeUndefined();
    expect(rules.filter((rule) => rule.provenance === 'configured').map((rule) => rule.id))
      .toEqual(destinations.map((_, i) => `rule-${i}`));
  });

  it('uses the union of more-specific prefixes to fully supersede a configured rule', () => {
    const rules = inventory(['192.0.2.0/24', '192.0.2.0/25', '192.0.2.128/25'])[0].rules;
    expect(rules.map((rule) => rule.superseded)).toEqual([true, undefined, undefined, undefined]);
  });

  it('keeps a one-address gap active and handles both ends of IPv4 without integer overflow', () => {
    const rules = inventory(['0.0.0.0/0', '0.0.0.0/1', '128.0.0.0/1'], [])[0].rules;
    expect(rules[0].superseded).toBe(true);
    const gap = inventory(['192.0.2.0/31', '192.0.2.0/32'], [])[0].rules;
    expect(gap[0].superseded).toBeUndefined();
    const end = inventory(['255.255.255.254/31', '255.255.255.254/32', '255.255.255.255/32'], [])[0].rules;
    expect(end[0].superseded).toBe(true);
  });
});
