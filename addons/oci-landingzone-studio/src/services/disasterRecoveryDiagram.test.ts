import { describe, expect, it } from 'vitest';
import { newPlatform } from './platforms';
import { emptyLzModel } from '../model/defaults';
import { createDrDraft, createDrHubNetwork, drRegionOptions } from './disasterRecoveryDesign';
import { buildDrComparisonDiagram, buildDrNetworkDiagram } from './disasterRecoveryDiagram';

describe('DR network preview', () => {
  it('uses the exact preprod OKE DR CIDR without applying the environment offset again', () => {
    const model = emptyLzModel();
    const platform = newPlatform('oke_simple', [], model.environments);
    platform.environments = [model.environments[1].id];
    model.platforms = [platform];
    const id = `platform:${platform.id}:${model.environments[1].id}`;
    const draft = { ...createDrDraft(model), region: drRegionOptions(model)[0].id, platformIds: [id] };
    const graph = buildDrComparisonDiagram(model, draft);
    const vcn = graph.nodes.find((node) => node.id.startsWith('dr:') && node.kind === 'vcn' && node.label.includes('-preprod-oke'));
    expect(vcn?.label).toContain('10.0.248.0/21');
    expect(graph.nodes.some((node) => node.id.startsWith('dr:') && node.label.includes('10.1.0.0/21'))).toBe(false);
  });
  it('keeps common production compartments identical when EXACS is not selected for DR', () => {
    const model = emptyLzModel();
    model.exadata.exacs.enabled = true;
    model.exadata.exacs.database = 'per_environment';
    model.exadata.exacs.environments = model.environments.map((env) => env.id);
    const graph = buildDrComparisonDiagram(model, { ...createDrDraft(model), region: drRegionOptions(model)[0].id });
    const compartments = (prefix: string) => graph.nodes.filter((node) => (node.kind === 'compartment' || node.kind === 'project') && (node.id.startsWith(`${prefix}:cmp-env-0-`) || node.id === `${prefix}:cmp-env-0`)).map((node) => ({ label: node.label, x: node.x, y: node.id === `${prefix}:cmp-env-0` ? 0 : node.y, width: node.width, height: node.height })).sort((a, b) => a.label.localeCompare(b.label));
    expect(compartments('dr')).toEqual(compartments('home'));
    expect(graph.nodes.some((node) => node.id.startsWith('dr:') && node.kind === 'vcn' && node.label.includes('-exacs'))).toBe(false);
  });
  it('draws selected EXACS spokes inside network compartments, with management beside projects', () => {
    const model = emptyLzModel();
    model.exadata.exacs.enabled = true;
    model.exadata.exacs.database = 'per_environment';
    model.exadata.exacs.environments = model.environments.map((env) => env.id);
    const original = structuredClone(model);
    const prod = `extension:environment:${model.environments[0].id}:exacs`;
    const preprod = `extension:environment:${model.environments[1].id}:exacs`;
    const draft = { ...createDrDraft(model), region: drRegionOptions(model)[0].id, platformIds: ['extension:shared:exacs', prod, preprod], platformSubnets: { [prod]: [{ name: 'db', cidr: '10.0.242.0/24' }, { name: 'backup', cidr: '10.0.243.0/24' }] } };
    const graph = buildDrComparisonDiagram(model, draft);
    const byId = new Map(graph.nodes.map((node) => [node.id, node]));
    for (const prefix of ['home', 'dr']) {
      for (const index of [0, 1]) {
        expect(byId.get(`${prefix}:cmp-env-${index}-plat-0`)?.parentId).toBe(`${prefix}:cmp-env-${index}-network`);
        const platform = byId.get(`${prefix}:cmp-env-${index}-platforms`)!;
        const projects = byId.get(`${prefix}:cmp-env-${index}-projects`)!;
        const network = byId.get(`${prefix}:cmp-env-${index}-network`)!;
        expect(platform.x).toBe(projects.x);
        expect(platform.x).toBeGreaterThan(network.x + network.width);
        expect(platform.y).toBeGreaterThan(projects.y + projects.height);
        if (byId.has(`${prefix}:cmp-env-${index}-vcn`)) {
          const vcn = byId.get(`${prefix}:cmp-env-${index}-plat-0`)!;
          expect(platform.y).toBe(network.y + vcn.y);
        }
      }
    }
    expect(byId.get('dr:cmp-env-0-plat-0')?.label).toContain('10.0.240.0/21');
    expect(byId.get('dr:cmp-env-0-plat-0-sn-0')?.label).toContain('10.0.242.0/24');
    expect(byId.get('dr:cmp-env-1-plat-0')?.label).toContain('10.0.248.0/21');
    expect(byId.has('dr:cmp-env-1-vcn')).toBe(false);
    expect(byId.has('dr:cmp-shared-exadata-exacs')).toBe(true);
    graph.nodes.forEach((node) => { if (node.parentId) expect(byId.has(node.parentId)).toBe(true); });
    graph.edges.forEach((edge) => { expect(byId.has(edge.source)).toBe(true); expect(byId.has(edge.target)).toBe(true); });
    const excluded = buildDrNetworkDiagram(model, { ...draft, platformIds: [] })!;
    expect(excluded.nodes.some((node) => node.kind === 'vcn' && node.label.includes('-exacs'))).toBe(false);
    expect(excluded.nodes.some((node) => node.label === 'cmp-lz-prod-exacs')).toBe(true);
    expect(model).toEqual(original);
  });
  it('places Home and DR together with unique identities and valid parent and edge references', () => {
    const model = emptyLzModel();
    const draft = { ...createDrDraft(model), region: drRegionOptions(model)[0].id };
    const graph = buildDrComparisonDiagram(model, draft);
    const ids = new Set(graph.nodes.map((node) => node.id));
    expect(ids.size).toBe(graph.nodes.length);
    const regions = graph.nodes.filter((node) => node.kind === 'region');
    expect(regions).toHaveLength(2);
    expect(regions[1].x).toBeGreaterThan(regions[0].x + regions[0].width);
    graph.nodes.forEach((node) => { if (node.parentId) expect(ids.has(node.parentId)).toBe(true); });
    graph.edges.forEach((edge) => { expect(ids.has(edge.source)).toBe(true); expect(ids.has(edge.target)).toBe(true); });
    expect(graph.nodes.some((node) => node.id === 'rpc')).toBe(false);
  });
  it('connects both regional DRGs only when RPC is selected and both regions are available', () => {
    const model = emptyLzModel();
    const draft = { ...createDrDraft(model), region: drRegionOptions(model)[0].id, rpcEnabled: true };
    const graph = buildDrComparisonDiagram(model, draft);
    expect(graph.edges.filter((edge) => edge.id.startsWith('rpc-')).map((edge) => [edge.source, edge.target])).toEqual([['home:drg', 'rpc'], ['rpc', 'dr:drg']]);
    expect(buildDrComparisonDiagram(model, { ...draft, region: '' }).nodes.filter((node) => node.kind === 'region')).toHaveLength(1);
    expect(buildDrComparisonDiagram(model, { ...draft, region: '' }).nodes.some((node) => node.id === 'rpc')).toBe(false);
  });
  it('renames DR environments and their scoped projects without changing Home or other environments', () => {
    const model = emptyLzModel();
    const original = structuredClone(model);
    const env = model.environments[0];
    const project = model.projects[0];
    const draft = {
      ...createDrDraft(model), region: drRegionOptions(model)[0].id,
      projectNetworkIds: model.environments.map((item) => `projects:${item.id}`),
      environmentNames: { [env.id]: 'dr' }, projectNames: { [env.id]: { [project.id]: 'recovery' } },
    };
    const diagram = buildDrNetworkDiagram(model, draft)!;
    expect(diagram.nodes.find((node) => node.id === 'cmp-env-0')?.label).toBe('cmp-lz-dr');
    expect(diagram.nodes.find((node) => node.id === 'cmp-env-0-proj-0')?.label).toBe('cmp-lz-dr-recovery');
    expect(diagram.nodes.find((node) => node.id === 'cmp-env-1-proj-0')?.label).toBe('cmp-lz-preprod-proj1');
    expect(model).toEqual(original);
  });
  it('applies DR Security Zone choices without changing Home', () => {
    const model = emptyLzModel();
    const env = model.environments[0];
    const original = env.securityZone;
    const diagram = buildDrNetworkDiagram(model, { ...createDrDraft(model), region: drRegionOptions(model)[0].id, environmentSecurityZones: { [env.id]: !original } })!;
    expect(diagram.nodes.find((node) => node.id === 'cmp-env-0')?.secure).toBe(!original);
    expect(env.securityZone).toBe(original);
  });
  it('previews only the default production network at its DR address range', () => {
    const model = emptyLzModel();
    const diagram = buildDrNetworkDiagram(model, { ...createDrDraft(model), region: drRegionOptions(model)[0].id })!;
    expect(diagram.nodes.find((node) => node.id === 'cmp-env-0-vcn')?.label).toContain('10.0.200.0/21');
    expect(diagram.nodes.find((node) => node.id === 'cmp-env-0-vcn-sn-0')?.label).toContain('10.0.200.0/24');
    expect(diagram.nodes.some((node) => node.kind === 'vcn' && node.label.includes('preprod'))).toBe(false);
  });
  it('shows configured hub addresses while keeping project addresses pending', () => {
    const model = emptyLzModel();
    const draft = { ...createDrDraft(model), region: drRegionOptions(model)[0].id, hubNetwork: createDrHubNetwork('hub_a'), projectNetworks: {} };
    const diagram = buildDrNetworkDiagram(model, draft)!;
    expect(diagram.nodes.find((node) => node.id === 'hub-vcn')?.label).toContain('10.0.192.0/21');
    expect(diagram.nodes.find((node) => node.id === 'hub-vcn-sn-0')?.label).toContain('10.0.192.0/24');
    expect(diagram.nodes.filter((node) => node.kind === 'vcn' && node.id !== 'hub-vcn').every((node) => node.label.includes('CIDR pending'))).toBe(true);
  });
  it('waits for a valid DR region', () => {
    const model = emptyLzModel();
    expect(buildDrNetworkDiagram(model, createDrDraft(model))).toBeNull();
    expect(buildDrNetworkDiagram(model, { ...createDrDraft(model), region: model.foundation.region })).toBeNull();
  });

  it('reflects the selected hub and project scope without copying source addresses or mutating the design', () => {
    const model = emptyLzModel();
    const original = structuredClone(model);
    const draft = { ...createDrDraft(model), region: drRegionOptions(model)[0].id, hubKind: 'hub_e' as const, projectNetworkIds: [`projects:${model.environments[0].id}`], projectNetworks: {} };
    const diagram = buildDrNetworkDiagram(model, draft)!;
    expect(diagram.nodes.find((node) => node.kind === 'region')?.label).toContain(draft.region);
    expect(diagram.nodes.some((node) => node.icon === 'firewall')).toBe(false);
    expect(diagram.nodes.some((node) => node.kind === 'vcn' && node.label.includes('preprod'))).toBe(false);
    expect(diagram.nodes.some((node) => node.label.includes('prod'))).toBe(true);
    expect(diagram.nodes.some((node) => node.label.includes('CIDR pending'))).toBe(true);
    expect(JSON.stringify(diagram)).not.toMatch(/\b(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}\b/);
    expect(model).toEqual(original);
  });
});
