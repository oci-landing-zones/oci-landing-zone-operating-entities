import type { BusinessUnitScope, CostGovernance, DiagramModel } from '../model/types';
import { costTagDefinitions, businessUnitAssignments, parseTagValues } from '../services/costGovernance';
import { absoluteNodeRects } from './flowGeometry';
import { generatorNames } from '../services/generatorNaming';

export interface CostTagScope {
  tagName: string;
  overlay?: boolean;
  message?: string;
  nodeIds: string[];
  groups?: { id: string; label: string; nodeIds: string[]; color?: string; bounds?: { x: number; y: number; width: number; height: number }; areas?: { x: number; y: number; width: number; height: number }[] }[];
  bounds: { x: number; y: number; width: number; height: number };
}


/** Separate coincident cost-center outlines in screen pixels, without changing their resource scopes. */
export function costTagOverlayRects(scope: CostTagScope | null | undefined, zoom: number) {
  const seen = new Map<string, number>();
  return scope?.groups?.flatMap((group) => (group.areas ?? (group.bounds ? [group.bounds] : [])).map((area, index) => {
    const key = [area.x, area.y, area.width, area.height].join(':');
    const count = ['tag-lz-cost-center', 'tag-lz-business-unit'].includes(scope.tagName) ? seen.get(key) ?? 0 : 0;
    seen.set(key, count + 1);
    const padding = count * 6 / Math.max(zoom, 0.01);
    // Empty project compartments can be only a few pixels high at fit-to-view zoom.
    const unit = Math.max(zoom, 0.01);
    const businessUnit = ['tag-lz-business-unit', 'tag-lz-cost-center'].includes(scope.tagName);
    const padX = padding + (businessUnit ? Math.max(4 / unit, (40 / unit - area.width) / 2) : 0);
    const padY = padding + (businessUnit ? Math.max(4 / unit, (24 / unit - area.height) / 2) : 0);
    return { id: `${group.id}-${index}`, label: `${group.id} resource area`, color: group.color,
      name: group.id, x: area.x - padX, y: area.y - padY, width: area.width + 2 * padX, height: area.height + 2 * padY };
  })) ?? [];
}

/** Cost Tag Defaults are attached to the landing zone and inherited by its child compartments. */
type TagScopeModel = {
  environments: { name: string; id?: string }[];
  projects?: { name: string; id?: string }[];
  platforms?: { key: string; type: string }[];
  sharedPlatforms?: { key: string }[];
  exadata?: { exacc?: { enabled: boolean }; exacs?: { enabled: boolean } };
  foundation?: { costGovernance?: Pick<CostGovernance, 'ownerEmail' | 'tagValueLists' | 'costCenterScopes' | 'costCenterCustomScopes' | 'costCenterFilters' | 'businessUnitScopes' | 'costCenterBusinessUnits'> };
};

export function costTagScope(diagram: DiagramModel, tagName: string | null, model?: TagScopeModel): CostTagScope | null {
  if (!tagName || !costTagDefinitions.some((tag) => tag.name === tagName)) return null;
  const root = diagram.nodes.find((node) => node.kind === 'landingzone');
  if (!root) return null;
  const byId = new Map(diagram.nodes.map((node) => [node.id, node]));
  const nodeIds = diagram.nodes.filter((node) => {
    if (!['landingzone', 'compartment', 'project'].includes(node.kind)) return false;
    const seen = new Set<string>();
    let current: typeof node | undefined = node;
    while (current && !seen.has(current.id)) {
      if (current.id === root.id) return true;
      seen.add(current.id);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return false;
  }).map((node) => node.id);
  const { x, y, width, height } = absoluteNodeRects(diagram.nodes).get(root.id)!;
  if (tagName === 'tag-lz-owner') {
    const owner = model?.foundation?.costGovernance?.ownerEmail ?? model?.foundation?.costGovernance?.tagValueLists?.[tagName] ?? 'email.address@example.com';
    return { tagName, overlay: true, nodeIds: [root.id], bounds: { x, y, width, height },
      groups: [{ id: owner, label: 'Owner', nodeIds: [root.id], color: '#C74634', areas: [{ x, y, width, height }] }],
      message: 'One owner email applies to all landing zone resources.',
    };
  }
  if (tagName === 'tag-lz-cost-center') {
    const values = parseTagValues(model?.foundation?.costGovernance?.tagValueLists?.[tagName] ?? 'CC12345');
    const colors = ['#176b9b', '#a86412', '#267246', '#7550a1', '#9b3572', '#007b83', '#8a5a24', '#5860a3'];
    const environmentGroups = costTagScope(diagram, 'tag-lz-environment', model)?.groups ?? [];
    const projectGroups = costTagScope(diagram, 'tag-lz-project', model)?.groups ?? [];
    const groups = values.map((value, index) => {
      const filter = model?.foundation?.costGovernance?.costCenterFilters?.[value];
      if (filter && model) {
        const filtered = filteredResourceScope(diagram, model, filter);
        return { id: value, label: 'Cost center', color: colors[index] ?? `hsl(${(index * 137.508 % 360).toFixed(2)} 65% 32%)`,
          nodeIds: filtered?.nodeIds ?? [], areas: filtered?.areas ?? [] };
      }
      let selection = model?.foundation?.costGovernance?.costCenterScopes?.[value] ?? 'landingzone';
      if (selection.startsWith('custom:')) selection = model?.foundation?.costGovernance?.costCenterCustomScopes?.find((scope) => `custom:${scope.id}` === selection)?.target ?? '';
      const environment = model?.environments.find((env) => `environment:${env.id ?? env.name}` === selection);
      const project = model?.projects?.find((entry) => `project:${entry.id ?? entry.name}` === selection);
      const target = selection === 'shared' ? environmentGroups.find((group) => group.id === 'shared')
        : environment ? environmentGroups.find((group) => group.id === environment.name.trim())
        : project ? projectGroups.find((group) => group.id === project.name.trim()) : undefined;
      return { id: value, label: 'Cost center', color: colors[index] ?? `hsl(${(index * 137.508 % 360).toFixed(2)} 65% 32%)`,
        nodeIds: selection === 'landingzone' ? [root.id] : target?.nodeIds ?? [],
        areas: selection === 'landingzone' ? [{ x, y, width, height }] : target?.areas ?? (target?.bounds ? [target.bounds] : []) };
    });
    return { tagName, overlay: true, nodeIds: [...new Set(groups.flatMap((group) => group.nodeIds))], groups, bounds: { x, y, width, height },
      message: groups.some((group) => group.areas.length === 0) ? 'No resources match the selected filters for one or more cost centers.' : 'Studio preview: each cost center outlines its selected scope. Active filters must all match; Not apply skips a filter.' };
  }
  if (tagName === 'tag-lz-business-unit') {
    const cfg = model?.foundation?.costGovernance ?? {};
    const units = parseTagValues(cfg.tagValueLists?.[tagName] ?? 'IT, Retail');
    const assignments = businessUnitAssignments(cfg);
    const centers = costTagScope(diagram, 'tag-lz-cost-center', model)?.groups ?? [];
    const colors = ['#176b9b', '#a86412', '#267246', '#7550a1'];
    const groups = units.map((unit, index) => {
      const assigned = centers.filter((center) => assignments[center.id] === unit);
      const ids = [...new Set(assigned.flatMap((center) => center.nodeIds))];
      const areas = [...new Map(assigned.flatMap((center) => center.areas ?? []).map((area) => [JSON.stringify(area), area])).values()];
      return { id: unit, label: 'Business unit', nodeIds: ids, areas,
        color: colors[index] ?? `hsl(${(index * 137.508 % 360).toFixed(2)} 65% 32%)` };
    });
    const empty = groups.filter((group) => !group.nodeIds.length).map((group) => group.id);
    return { tagName, overlay: true, nodeIds: [...new Set(groups.flatMap((group) => group.nodeIds))], groups, bounds: { x, y, width, height },
      message: 'Studio preview: business units inherit the scopes of their assigned cost centers. Each cost center belongs to at most one business unit. Generated tag assignments are unchanged.' +
        (empty.length ? ` No assigned cost center resources: ${empty.join(', ')}.` : ''),
    };
  }
  if (tagName === 'tag-lz-project') {
    const candidates = new Set(nodeIds);
    const rects = absoluteNodeRects(diagram.nodes);
    const area = (id: string) => {
      const rect = rects.get(id)!;
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    const colors = ['#267246', '#a86412', '#176b9b', '#7550a1'];
    const projectGroups = [...new Set((model?.projects ?? []).map((project) => project.name.trim()).filter(Boolean))].sort().map((name, index) => {
      const labels = new Set((model?.environments ?? []).map((env) => generatorNames.environmentProjectCompartment(env.name.trim(), name)));
      const ids = diagram.nodes.filter((node) => candidates.has(node.id) && node.kind === 'project' && labels.has(node.label)).map((node) => node.id);
      return { id: name, label: name, nodeIds: ids, color: colors[index % colors.length], areas: ids.map(area) };
    }).filter((group) => group.nodeIds.length);
    const projectIds = new Set(projectGroups.flatMap((group) => group.nodeIds));
    const under = (id: string, roots: Set<string>) => {
      const seen = new Set<string>();
      let current = byId.get(id);
      while (current && !seen.has(current.id)) {
        if (roots.has(current.id)) return true;
        seen.add(current.id);
        current = current.parentId ? byId.get(current.parentId) : undefined;
      }
      return false;
    };
    // Enclose only branches outside projects; a parent enclosing project boxes must not look unassigned.
    const unassigned = projectIds.size ? diagram.nodes.filter((node) =>
      (candidates.has(node.id) || node.kind === 'resourcegroup' && under(node.id, new Set([root.id]))) &&
      ['compartment', 'resourcegroup'].includes(node.kind) && !under(node.id, projectIds) &&
      ![...projectIds].some((id) => under(id, new Set([node.id])))) : [root];
    const unassignedIds = new Set(unassigned.map((node) => node.id));
    const outside = unassigned.filter((node) => !node.parentId || !under(node.parentId, unassignedIds)).map((node) => node.id);
    const groups = [{ id: 'notapplicable', label: 'Outside projects', nodeIds: outside, color: '#60656d', areas: outside.map(area) }, ...projectGroups];
    return { tagName, overlay: true, nodeIds: groups.flatMap((group) => group.nodeIds), groups, bounds: { x, y, width, height } };
  }
  if (tagName === 'tag-lz-environment') {
    const environments = model?.environments ?? [];
    const environmentIds = new Set(environments.map((_, index) => `cmp-env-${index}`));
    const shared = diagram.nodes.filter((node) => node.kind === 'compartment' && node.parentId === root.id && !environmentIds.has(node.id));
    const rects = absoluteNodeRects(diagram.nodes);
    const boundsFor = (ids: string[]) => {
      const targets = ids.map((id) => rects.get(id)!);
      const left = Math.min(...targets.map((rect) => rect.x));
      const top = Math.min(...targets.map((rect) => rect.y));
      return { x: left, y: top,
        width: Math.max(...targets.map((rect) => rect.x + rect.width)) - left,
        height: Math.max(...targets.map((rect) => rect.y + rect.height)) - top };
    };
    const colors = ['#267246', '#a86412', '#176b9b', '#993c60'];
    const groups = [
      { id: 'shared', label: 'Shared', nodeIds: shared.map((node) => node.id), color: '#7550a1' },
      ...environments.map((env, index) => ({ id: env.name.trim(), label: env.name.trim(),
        nodeIds: byId.has(`cmp-env-${index}`) ? [`cmp-env-${index}`] : [], color: colors[index % colors.length] })),
    ].filter((group) => group.nodeIds.length).map((group) => ({ ...group, bounds: boundsFor(group.nodeIds) }));
    const matchedIds = groups.flatMap((group) => group.nodeIds);
    return { tagName, overlay: true, nodeIds: matchedIds, groups, bounds: matchedIds.length ? boundsFor(matchedIds) : { x, y, width, height } };
  }
  if (tagName === 'tag-lz-platform') {
    const candidates = new Set(nodeIds);
    const groups = (['network', 'security'] as const).map((id) => ({
      id, label: id === 'network' ? 'Network' : 'Security',
      nodeIds: diagram.nodes.filter((node) => {
        if (!candidates.has(node.id) || node.kind !== 'compartment') return false;
        const parent = node.parentId ? byId.get(node.parentId) : undefined;
        const sharedName = id === 'network' ? generatorNames.networkCompartment : generatorNames.securityCompartment;
        return parent?.id === root.id ? node.label === sharedName
          : parent?.parentId === root.id && node.label === `${parent.label}-${id}`;
      }).map((node) => node.id),
    }));
    const matchedIds = groups.flatMap((group) => group.nodeIds);
    const rects = absoluteNodeRects(diagram.nodes);
    const targets = matchedIds.map((id) => rects.get(id)!);
    const left = targets.length ? Math.min(...targets.map((rect) => rect.x)) : x;
    const top = targets.length ? Math.min(...targets.map((rect) => rect.y)) : y;
    return { tagName, nodeIds: matchedIds, groups, bounds: {
      x: left, y: top,
      width: targets.length ? Math.max(...targets.map((rect) => rect.x + rect.width)) - left : width,
      height: targets.length ? Math.max(...targets.map((rect) => rect.y + rect.height)) - top : height,
    } };
  }
  return { tagName, nodeIds, bounds: { x, y, width, height } };
}

function filteredResourceScope(diagram: DiagramModel, model: TagScopeModel, filter: BusinessUnitScope) {
  const root = diagram.nodes.find((node) => node.kind === 'landingzone')!;
  const byId = new Map(diagram.nodes.map((node) => [node.id, node]));
  const environmentGroups = costTagScope(diagram, 'tag-lz-environment', model)?.groups ?? [];
  const projectGroups = costTagScope(diagram, 'tag-lz-project', model)?.groups ?? [];
  const platformGroups = costTagScope(diagram, 'tag-lz-platform', model)?.groups ?? [];
  const rects = absoluteNodeRects(diagram.nodes);
  const inside = (id: string, roots: Set<string>) => {
    const seen = new Set<string>();
    let current = byId.get(id);
    while (current && !seen.has(current.id)) {
      if (roots.has(current.id)) return true;
      seen.add(current.id);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return false;
  };
  const platforms = [
    ...(model?.platforms ?? []).map((platform) => ({ key: platform.key, value: platform.type === 'oke_simple' ? 'oke' : platform.key })),
    ...(model?.sharedPlatforms ?? []).map((platform) => ({ key: platform.key, value: platform.key })),
    ...(model?.exadata?.exacc?.enabled ? [{ key: 'exacc', value: 'exacc' }] : []),
    ...(model?.exadata?.exacs?.enabled ? [{ key: 'exacs', value: 'exacs' }] : []),
  ];
  const candidates = diagram.nodes.filter((node) => ['landingzone', 'compartment', 'project', 'resourcegroup'].includes(node.kind) && inside(node.id, new Set([root.id])));
  const environmentRoots = filter.environment === null || filter.environment.length === 0 ? null : new Set(filter.environment.flatMap((value) => {
    const env = model?.environments.find((entry) => `environment:${entry.id ?? entry.name}` === value);
    return environmentGroups.find((group) => group.id === (env?.name.trim() ?? value))?.nodeIds ?? [];
  }));
  const projectRoots = filter.project === null || filter.project.length === 0 ? null : new Set(filter.project.flatMap((value) => {
    const project = model?.projects?.find((entry) => `project:${entry.id ?? entry.name}` === value);
    return projectGroups.find((group) => group.id === (project?.name.trim() ?? value))?.nodeIds ?? [];
  }));
  const platformRoots = filter.platform === null || filter.platform.length === 0 ? null : new Set(filter.platform.flatMap((value) => {
    const standard = platformGroups.find((group) => group.id === value)?.nodeIds ?? [];
    const labels = new Set(platforms.filter((platform) => platform.value === value).flatMap((platform) => [
      generatorNames.sharedPlatformCompartment(platform.key),
      ...(model?.environments ?? []).map((env) => generatorNames.environmentPlatformCompartment(env.name.trim(), platform.key)),
    ]));
    return [...standard, ...candidates.filter((node) => node.kind === 'compartment' && labels.has(node.label)).map((node) => node.id)];
  }));
  const matching = candidates.filter((node) => [environmentRoots, projectRoots, platformRoots].every((roots) => roots === null || inside(node.id, roots)));
  const matchingIds = new Set(matching.map((node) => node.id));
  const ids = matching.filter((node) => !node.parentId || !inside(node.parentId, matchingIds)).map((node) => node.id);
  return { nodeIds: ids, areas: ids.map((id) => { const rect = rects.get(id)!; return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }; }) };
}
