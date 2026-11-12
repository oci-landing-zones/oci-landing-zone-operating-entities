import { describe, expect, it } from 'vitest';
import type { DiagramModel, DiagramNode } from '../model/types';
import { costTagScope, costTagOverlayRects } from './tagScope';

const node = (id: string, kind: DiagramNode['kind'], parentId?: string): DiagramNode => ({ id, kind, parentId, label: id, x: 10, y: 20, width: 100, height: 80 });
const diagram: DiagramModel = { edges: [], nodes: [
  node('region', 'region'), node('tenancy', 'tenancy', 'region'),
  node('landingzone', 'landingzone', 'tenancy'), node('shared', 'compartment', 'landingzone'),
  node('environment', 'compartment', 'landingzone'), node('project', 'project', 'environment'),
  node('vcn', 'vcn', 'shared'), node('external', 'compartment', 'tenancy'),
] };

describe('cost tag inherited scope', () => {
  it('highlights the IAM domain above the landing zone and intersects individual group filters', () => {
    const domain: DiagramNode = { ...node('domain', 'resourcegroup', 'tenancy'), x: 20, y: 60, width: 1100, height: 240, resourceKind: 'identitydomain', resourceItems: [
      { key: 'COMMON', name: 'id_lz_common', scope: { platform: 'iam', environment: 'shared', project: 'notapplicable' } },
      { key: 'ADMIN', name: 'grp-iam-admin', scope: { platform: 'iam', environment: 'shared', project: 'notapplicable' } },
      { key: 'PROJECT', name: 'grp-project-admin', scope: { platform: 'iam', environment: 'prod', project: 'proj1' } },
    ] };
    const graph = { ...diagram, nodes: [...diagram.nodes, domain] };
    const filter = { platform: ['iam'], environment: null as string[] | null, project: null as string[] | null };
    const model = { environments: [{ id: 'prod-id', name: 'prod' }], projects: [{ id: 'project-id', name: 'proj1' }], foundation: { costGovernance: { costCenterFilters: { CC12345: filter } } } };
    const all = costTagScope(graph, 'tag-lz-cost-center', model)!;
    expect(all.nodeIds).toContain('domain');
    expect(all.groups![0].areas).toHaveLength(1);
    filter.environment = ['environment:prod-id']; filter.project = ['project:project-id'];
    const narrowed = costTagScope(graph, 'tag-lz-cost-center', model)!;
    expect(narrowed.nodeIds).toContain('domain');
    expect(narrowed.groups![0].areas).toHaveLength(1);
    expect(narrowed.groups![0].areas![0].width).toBeLessThan(domain.width);
  });
  it('includes Observability, IAM and Governance management blocks in Platform highlights', () => {
    const nodes = [...diagram.nodes,
      { ...node('domain', 'resourcegroup', 'tenancy'), resourceKind: 'identitydomain' as const },
      { ...node('budgets', 'resourcegroup', 'tenancy'), resourceKind: 'budgets' as const },
      { ...node('tags', 'resourcegroup', 'tenancy'), resourceKind: 'requiredtags' as const },
      { ...node('events', 'resourcegroup', 'shared'), resourceKind: 'events' as const },
    ];
    const scope = costTagScope({ nodes, edges: [] }, 'tag-lz-platform');
    expect(scope?.groups?.find((group) => group.id === 'iam')?.nodeIds).toEqual(['domain']);
    expect(scope?.groups?.find((group) => group.id === 'governance')?.nodeIds).toEqual(['budgets', 'tags']);
    expect(scope?.groups?.find((group) => group.id === 'observability')?.nodeIds).toEqual(['events']);
  });
  it('marks management blocks as shared in purple without enclosing production', () => {
    const nodes = [node('region', 'region'), node('tenancy', 'tenancy', 'region'), node('landingzone', 'landingzone', 'tenancy'),
      { ...node('cmp-env-0', 'compartment', 'landingzone'), label: 'cmp-lz-prod' },
      ...(['identitydomain', 'budgets', 'requiredtags'] as const).map((kind) => ({ ...node(kind, 'resourcegroup', 'tenancy'), resourceKind: kind, resourceItems: [{ key: kind, name: kind, scope: { platform: kind === 'identitydomain' ? 'iam' : 'governance', environment: 'shared', project: 'notapplicable' } }] })),
    ];
    const scope = costTagScope({ nodes, edges: [] }, 'tag-lz-environment', { environments: [{ id: 'prod', name: 'prod' }] });
    const shared = scope?.groups?.find((group) => group.id === 'shared');
    expect(shared?.color).toBe('#7550a1');
    expect(shared?.nodeIds).toEqual(['identitydomain', 'budgets', 'requiredtags']);
    expect(shared?.areas).toHaveLength(3);
    expect(shared?.nodeIds).not.toContain('cmp-env-0');
  });
  it('outlines the entire landing zone once for its owner, excluding other tenancy resources', () => {
    const original = JSON.stringify(diagram);
    for (const tag of ['owner']) {
      const scope = costTagScope(diagram, `tag-lz-${tag}`);
      expect(scope?.nodeIds).toEqual(['landingzone']);
      expect(scope?.overlay).toBe(true);
      expect(costTagOverlayRects(scope, 0.12)).toHaveLength(1);
      expect(scope?.bounds).toEqual({ x: 30, y: 60, width: 100, height: 80 });
    }
    expect(JSON.stringify(diagram)).toBe(original);
  });
  it('separates all Network and Security compartments, excluding sibling projects and matching environment names', () => {
    const nodes = [
      ...diagram.nodes,
      { ...node('cmp-network', 'compartment', 'landingzone'), label: 'cmp-lz-network' },
      { ...node('cmp-security', 'compartment', 'landingzone'), label: 'cmp-lz-security' },
      { ...node('env', 'compartment', 'landingzone'), label: 'cmp-lz-prod-network' },
      { ...node('env-network', 'compartment', 'env'), label: 'cmp-lz-prod-network-network' },
      { ...node('env-security', 'compartment', 'env'), label: 'cmp-lz-prod-network-security' },
      { ...node('env-project', 'compartment', 'env'), label: 'cmp-lz-prod-network-projects' },
      node('network-resources', 'resourcegroup', 'env-network'),
      node('security-resources', 'resourcegroup', 'env-security'),
      { ...node('outside-network', 'compartment', 'tenancy'), label: 'cmp-lz-network' },
    ];
    const scope = costTagScope({ ...diagram, nodes }, 'tag-lz-platform');
    expect(scope?.groups).toEqual([
      { id: 'network', label: 'Network', nodeIds: ['cmp-network', 'env-network'] },
      { id: 'security', label: 'Security', nodeIds: ['cmp-security', 'env-security'] },
    ]);
    expect(scope?.nodeIds).toEqual(['cmp-network', 'env-network', 'cmp-security', 'env-security']);
    expect(scope?.nodeIds).not.toContain('env');
    expect(scope?.nodeIds).not.toContain('env-project');
    expect(scope?.nodeIds).not.toContain('outside-network');
  });
  it('keeps platform scopes empty when no Network or Security compartment exists', () => {
    expect(costTagScope(diagram, 'tag-lz-platform')?.nodeIds).toEqual([]);
  });
  it('draws shared, prod and preprod as separate environment resource areas', () => {
    const nodes = [
      ...diagram.nodes.filter((entry) => !['shared', 'environment', 'project', 'vcn'].includes(entry.id)),
      { ...node('cmp-network', 'compartment', 'landingzone'), x: 10, label: 'cmp-lz-network' },
      { ...node('cmp-security', 'compartment', 'landingzone'), x: 10, y: 120, label: 'cmp-lz-security' },
      { ...node('cmp-env-0', 'compartment', 'landingzone'), x: 200, label: 'cmp-lz-prod' },
      { ...node('cmp-env-1', 'compartment', 'landingzone'), x: 200, y: 120, label: 'cmp-lz-preprod' },
      node('prod-network', 'compartment', 'cmp-env-0'),
    ];
    const scope = costTagScope({ nodes, edges: [] }, 'tag-lz-environment', { environments: [{ name: 'prod' }, { name: 'preprod' }] });
    expect(scope?.groups?.map((group) => [group.id, group.nodeIds])).toEqual([
      ['shared', ['cmp-network', 'cmp-security']], ['prod', ['cmp-env-0']], ['preprod', ['cmp-env-1']],
    ]);
    expect(scope?.groups?.every((group) => group.bounds && group.bounds.width > 0 && group.bounds.height > 0)).toBe(true);
    expect(scope?.nodeIds).not.toContain('external');
    expect(scope?.groups?.[0].bounds?.height).toBe(180);
  });
  it('keeps non-project resources notapplicable and separates proj1 and proj2', () => {
    const nodes = [
      node('region', 'region'), node('tenancy', 'tenancy', 'region'), node('landingzone', 'landingzone', 'tenancy'),
      node('shared-network', 'compartment', 'landingzone'), node('env', 'compartment', 'landingzone'),
      node('network', 'compartment', 'env'), node('projects', 'compartment', 'env'),
      { ...node('proj1', 'project', 'projects'), label: 'cmp-lz-prod-proj1' },
      { ...node('proj2', 'project', 'projects'), x: 200, label: 'cmp-lz-prod-proj2' },
      node('project-db', 'compartment', 'proj1'), node('events', 'resourcegroup', 'network'),
    ];
    const original = JSON.stringify(nodes);
    const scope = costTagScope({ nodes, edges: [] }, 'tag-lz-project', { environments: [{ name: 'prod' }], projects: [{ name: 'proj1' }, { name: 'proj2' }], foundation: { costGovernance: {
      tagValueLists: { 'tag-lz-cost-center': 'CC1, CC2, CC3', 'tag-lz-business-unit': 'IT, Retail' }, costCenterBusinessUnits: { CC1: 'IT', CC2: 'Retail', CC3: 'Retail' },
      costCenterFilters: {
        CC1: { platform: null, environment: ['shared'], project: null },
        CC2: { platform: null, environment: null, project: ['project:proj1'] },
        CC3: { platform: null, environment: null, project: ['project:proj2'] },
      },
    } } });
    expect(scope?.groups?.map((group) => [group.id, group.nodeIds])).toEqual([
      ['notapplicable', ['shared-network', 'network']], ['proj1', ['proj1']], ['proj2', ['proj2']],
    ]);
    expect(scope?.overlay).toBe(true);
    expect(scope?.groups?.[0].areas).toHaveLength(2);
    expect(JSON.stringify(nodes)).toBe(original);
    const noProjects = costTagScope(diagram, 'tag-lz-project', { environments: [], projects: [] });
    expect(noProjects?.groups?.map((group) => [group.id, group.nodeIds])).toEqual([['notapplicable', ['landingzone']]]);
  });
  it('unites the scopes of multiple cost centers assigned to the same business unit', () => {
    const nodes = [
      node('region', 'region'), node('tenancy', 'tenancy', 'region'), node('landingzone', 'landingzone', 'tenancy'),
      node('shared-network', 'compartment', 'landingzone'), node('cmp-env-0', 'compartment', 'landingzone'),
      node('env-network', 'compartment', 'cmp-env-0'), node('projects', 'compartment', 'cmp-env-0'),
      { ...node('proj1', 'project', 'projects'), label: 'cmp-lz-prod-proj1' },
      { ...node('proj2', 'project', 'projects'), x: 200, label: 'cmp-lz-prod-proj2' },
    ];
    const scope = costTagScope({ nodes, edges: [] }, 'tag-lz-business-unit', { environments: [{ name: 'prod' }], projects: [{ name: 'proj1' }, { name: 'proj2' }], foundation: { costGovernance: {
      tagValueLists: { 'tag-lz-cost-center': 'CC1, CC2, CC3', 'tag-lz-business-unit': 'IT, Retail' }, costCenterBusinessUnits: { CC1: 'IT', CC2: 'Retail', CC3: 'Retail' },
      costCenterFilters: {
        CC1: { platform: null, environment: ['shared'], project: null },
        CC2: { platform: null, environment: null, project: ['project:proj1'] },
        CC3: { platform: null, environment: null, project: ['project:proj2'] },
      },
    } } });
    expect(scope?.overlay).toBe(true);
    expect(scope?.groups?.map((group) => [group.id, group.nodeIds])).toEqual([
      ['IT', ['shared-network']], ['Retail', ['proj1', 'proj2']],
    ]);
    expect(scope?.groups?.[0].areas).toHaveLength(1);
    expect(scope?.groups?.[1].areas).toHaveLength(2);
    expect(scope?.nodeIds).not.toContain('env-network');
  });
  it('draws one landing-zone box when there is one cost center', () => {
    const scope = costTagScope(diagram, 'tag-lz-cost-center', { environments: [] });
    expect(scope?.overlay).toBe(true);
    expect(scope?.nodeIds).toEqual(['landingzone']);
    expect(scope?.groups?.map((group) => [group.id, group.areas?.length])).toEqual([['CC12345', 1]]);
    expect(scope?.groups?.[0].areas?.[0]).toEqual({ x: 30, y: 60, width: 100, height: 80 });
    const renamed = costTagScope(diagram, 'tag-lz-cost-center', { environments: [], foundation: { costGovernance: { tagValueLists: { 'tag-lz-cost-center': 'CC900' } } } });
    expect(renamed?.groups?.[0].id).toBe('CC900');
  });
  it('places different cost centers in their selected environment and project areas', () => {
    const nodes = [node('region', 'region'), node('tenancy', 'tenancy', 'region'), node('landingzone', 'landingzone', 'tenancy'),
      node('cmp-env-0', 'compartment', 'landingzone'), node('projects', 'compartment', 'cmp-env-0'),
      { ...node('proj1', 'project', 'projects'), label: 'cmp-lz-prod-proj1' }];
    const scope = costTagScope({ nodes, edges: [] }, 'tag-lz-cost-center', {
      environments: [{ id: 'env-id', name: 'prod' }], projects: [{ id: 'proj-id', name: 'proj1' }],
      foundation: { costGovernance: { tagValueLists: { 'tag-lz-cost-center': 'CC1, CC2' }, costCenterScopes: { CC1: 'environment:env-id', CC2: 'project:proj-id' } } },
    });
    expect(scope?.groups?.map((group) => [group.id, group.nodeIds])).toEqual([['CC1', ['cmp-env-0']], ['CC2', ['proj1']]]);
    expect(scope?.groups?.every((group) => group.areas?.length === 1)).toBe(true);
  });
  it('resolves a named custom scope to its selected base area', () => {
    const nodes = [node('region', 'region'), node('tenancy', 'tenancy', 'region'), node('landingzone', 'landingzone', 'tenancy'), node('shared-network', 'compartment', 'landingzone')];
    const scope = costTagScope({ nodes, edges: [] }, 'tag-lz-cost-center', { environments: [], foundation: { costGovernance: {
      costCenterScopes: { CC12345: 'custom:team' }, costCenterCustomScopes: [{ id: 'team', name: 'Team scope', target: 'shared' }],
    } } });
    expect(scope?.groups?.[0].nodeIds).toEqual(['shared-network']);
    expect(scope?.groups?.[0].areas).toHaveLength(1);
  });
  it('keeps cost center colors distinct and separates boxes that share an area', () => {
    const values = ['CC1', 'CC2', 'CC3', 'CC4', 'CC5'];
    const scope = costTagScope(diagram, 'tag-lz-cost-center', { environments: [], foundation: { costGovernance: {
      tagValueLists: { 'tag-lz-cost-center': values.join(', ') }, costCenterScopes: Object.fromEntries(values.map((value) => [value, 'landingzone'])),
    } } })!;
    expect(new Set(scope.groups!.map((group) => group.color)).size).toBe(5);
    const original = JSON.stringify(scope);
    const boxes = costTagOverlayRects(scope, 0.25);
    expect(boxes).toHaveLength(5);
    expect(new Set(boxes.map((box) => box.x)).size).toBe(5);
    expect(boxes[0].x - boxes[1].x).toBe(24);
    expect(boxes.map((box) => box.color)).toEqual(scope.groups!.map((group) => group.color));
    expect(JSON.stringify(scope)).toBe(original);
  });
  it('keeps small business unit frames readable when the whole diagram is fitted', () => {
    const area = { x: 100, y: 200, width: 180, height: 36 };
    const scope = { tagName: 'tag-lz-business-unit', nodeIds: ['project'], bounds: area,
      groups: [{ id: 'Retail', label: 'Business unit', nodeIds: ['project'], color: '#a86412', areas: [area] }] };
    const [frame] = costTagOverlayRects(scope, 0.12);
    expect(frame.height * 0.12).toBeGreaterThanOrEqual(24);
    expect(frame.width * 0.12).toBeGreaterThanOrEqual(40);
    expect(frame.x + frame.width / 2).toBeCloseTo(area.x + area.width / 2);
    expect(frame.y + frame.height / 2).toBeCloseTo(area.y + area.height / 2);
    expect(scope.groups[0].areas[0]).toEqual(area);
  });
  it('inherits the intersection of all three cost center filters in the assigned business unit', () => {
    const nodes = [node('region', 'region'), node('tenancy', 'tenancy', 'region'), node('landingzone', 'landingzone', 'tenancy'),
      { ...node('shared-network', 'compartment', 'landingzone'), label: 'cmp-lz-network' },
      { ...node('shared-security', 'compartment', 'landingzone'), label: 'cmp-lz-security' },
      { ...node('cmp-env-0', 'compartment', 'landingzone'), label: 'cmp-lz-prod' },
      { ...node('prod-network', 'compartment', 'cmp-env-0'), label: 'cmp-lz-prod-network' },
      node('projects', 'compartment', 'cmp-env-0'),
      { ...node('proj1', 'project', 'projects'), label: 'cmp-lz-prod-proj1' }];
    const model = { environments: [{ id: 'prod-id', name: 'prod' }], projects: [{ id: 'app-id', name: 'proj1' }], foundation: { costGovernance: {
      tagValueLists: { 'tag-lz-cost-center': 'IT, Retail', 'tag-lz-business-unit': 'IT, Retail' }, costCenterBusinessUnits: { IT: 'IT', Retail: 'Retail' },
      costCenterFilters: {
        IT: { platform: ['security'], environment: ['shared'], project: ['notapplicable'] },
        Retail: { platform: null as string[] | null, environment: ['environment:prod-id'], project: ['project:app-id'] },
      },
    } } };
    const scope = costTagScope({ nodes, edges: [] }, 'tag-lz-business-unit', model);
    expect(scope?.groups?.map((group) => [group.id, group.nodeIds])).toEqual([['IT', ['shared-security']], ['Retail', ['proj1']]]);
    model.foundation.costGovernance.costCenterFilters.Retail.platform = [];
    expect(costTagScope({ nodes, edges: [] }, 'tag-lz-business-unit', model)?.groups?.find((group) => group.id === 'Retail')?.nodeIds).toEqual(['proj1']);
    const costCenterModel = { ...model, foundation: { costGovernance: {
      tagValueLists: { 'tag-lz-cost-center': 'CC1, CC2' }, costCenterFilters: {
        CC1: model.foundation.costGovernance.costCenterFilters.IT,
        CC2: model.foundation.costGovernance.costCenterFilters.Retail,
      },
    } } };
    const centers = costTagScope({ nodes, edges: [] }, 'tag-lz-cost-center', costCenterModel);
    expect(centers?.groups?.map((group) => [group.id, group.nodeIds])).toEqual([['CC1', ['shared-security']], ['CC2', ['proj1']]]);
    expect(new Set(centers?.groups?.map((group) => group.color)).size).toBe(2);
    model.foundation.costGovernance.costCenterFilters.Retail.platform = ['network'];
    expect(costTagScope({ nodes, edges: [] }, 'tag-lz-business-unit', model)?.groups?.find((group) => group.id === 'Retail')?.nodeIds).toEqual([]);
  });
  it('excludes only the filter set to Not apply while requiring all remaining filters', () => {
    const nodes = [node('landingzone', 'landingzone'),
      { ...node('shared-network', 'compartment', 'landingzone'), label: 'cmp-lz-network' },
      { ...node('shared-security', 'compartment', 'landingzone'), label: 'cmp-lz-security' },
      { ...node('cmp-env-0', 'compartment', 'landingzone'), label: 'cmp-lz-prod' },
      { ...node('prod-security', 'compartment', 'cmp-env-0'), label: 'cmp-lz-prod-security' }];
    const filter = { platform: ['security'], environment: ['shared'], project: ['notapplicable'] };
    const model = { environments: [{ id: 'prod-id', name: 'prod' }], projects: [], foundation: { costGovernance: {
      tagValueLists: { 'tag-lz-cost-center': 'CC1' }, costCenterFilters: { CC1: filter }, costCenterBusinessUnits: { CC1: 'IT' },
    } } };
    for (const tag of ['tag-lz-cost-center', 'tag-lz-business-unit']) {
      const ids = () => costTagScope({ nodes, edges: [] }, tag, model)?.groups?.[0].nodeIds;
      filter.platform = ['security']; filter.environment = ['shared']; filter.project = ['notapplicable'];
      expect(ids()).toEqual(['shared-security']);
      filter.environment = [];
      expect(ids()).toEqual(['shared-security', 'prod-security']);
      filter.environment = ['shared']; filter.platform = [];
      expect(ids()).toEqual(['shared-network', 'shared-security']);
      filter.platform = ['security']; filter.project = ['project:missing'];
      expect(ids()).toEqual([]);
      filter.project = [];
      expect(ids()).toEqual(['shared-security']);
    }
  });
  it('shows only IT in the default Business Unit preview', () => {
    expect(costTagScope(diagram, 'tag-lz-business-unit', { environments: [], projects: [] })?.groups?.map((group) => group.id)).toEqual(['IT']);
  });
  it('does not invent a scope for unknown tags, absent selections or missing landing zone', () => {
    expect(costTagScope(diagram, 'tag-unknown')).toBeNull();
    expect(costTagScope(diagram, null)).toBeNull();
    expect(costTagScope({ nodes: [], edges: [] }, 'tag-lz-owner')).toBeNull();
  });
});
