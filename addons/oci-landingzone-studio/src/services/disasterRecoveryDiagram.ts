import type { DiagramModel, LzModel } from '../model/types';
import { buildGraph } from '../diagram/buildGraph';
import { drRegionOptions, type DrDesignDraft } from './disasterRecoveryDesign';
import { hubKindDefaults } from './hubKinds';
import { validateSubnetCidr, validateVcnCidr } from './cidr';
import { drPlatformProjection } from './disasterRecoveryPlatformProjection';
import { platformInEnv } from './platforms';

export function buildDrNetworkDiagram(model: LzModel, draft: DrDesignDraft): DiagramModel | null {
  const region = drRegionOptions(model).find((item) => item.id === draft.region);
  if (!region) return null;
  const projection = drPlatformProjection(model, draft);
  const preview: LzModel = {
    ...model,
    foundation: { ...model.foundation, region: region.id, regionShortName: region.shortName },
    network: { ...model.network, ...(draft.hubKind === model.network.hubKind ? {} : hubKindDefaults(draft.hubKind)), ...draft.hubNetwork, hubKind: draft.hubKind },
    environments: model.environments.filter((env) => projection.environmentIds.has(env.id)).map((env) => ({ ...env, name: draft.environmentNames?.[env.id]?.trim() || env.name, securityZone: draft.environmentSecurityZones?.[env.id] ?? env.securityZone, network: draft.projectNetworks?.[`projects:${env.id}`] ?? env.network })),
    platforms: projection.platforms,
    sharedPlatforms: projection.sharedPlatforms,
    projects: model.projects.flatMap((project) => model.environments
      .filter((env) => project.environments === 'all' || project.environments.includes(env.id))
      .map((env) => ({ ...project, id: `${project.id}:${env.id}`, name: draft.projectNames?.[env.id]?.[project.id]?.trim() || project.name, environments: [env.id] }))),
  };
  // Project ranges are layout references only until DR project addressing is configured.
  const home = buildGraph(model, 4);
  const homeNodes = new Map(home.nodes.map((node) => [node.id, node]));
  const environmentLayout = Object.fromEntries(model.environments.map((env, index) => [env.id, {
    networkHeight: homeNodes.get(`cmp-env-${index}-network`)?.height ?? 0,
    platformTop: homeNodes.get(`cmp-env-${index}-platforms`)?.y ?? 0,
  }]));
  const graph = buildGraph(preview, 4, {}, { exadata: projection.exadata, projectEnvironmentIds: model.environments.filter((env) => draft.projectNetworkIds.includes(`projects:${env.id}`)).map((env) => env.id), environmentLayout });
  const platformRanges = new Map<string, string | undefined>();
  preview.environments.forEach((env, index) => {
    [...preview.platforms, ...projection.exadata.platforms].filter((platform) => platformInEnv(platform, env.id)).forEach((platform, platformIndex) => {
      const id = platform.id.startsWith('exadata-') ? `extension:environment:${env.id}:${platform.key}` : `platform:${platform.id}:${env.id}`;
      platformRanges.set(`cmp-env-${index}-plat-${platformIndex}`, projection.cidrs[id]);
    });
  });
  [...preview.sharedPlatforms, ...projection.exadata.sharedPlatforms].forEach((platform, index) => {
    const id = platform.id.startsWith('exadata-') ? `extension:shared:${platform.key}` : `shared:${platform.id}`;
    platformRanges.set(`shared-plat-vcn-${index}`, projection.cidrs[id]);
  });
  return {
    ...graph,
    nodes: graph.nodes.map((node) => {
      const subnetIndex = node.id.startsWith('hub-vcn-sn-') ? Number(node.id.slice('hub-vcn-sn-'.length)) : -1;
      const subnet = draft.hubNetwork?.subnets[subnetIndex];
      const vcnValid = draft.hubNetwork && !validateVcnCidr(draft.hubNetwork.hubVcnCidr);
      const project = preview.environments.find((_, index) => node.id === `cmp-env-${index}-vcn` || node.parentId === `cmp-env-${index}-vcn`);
      const projectConfigured = project && draft.projectNetworks?.[`projects:${project.id}`];
      const platformCidr = platformRanges.get(node.id) ?? (node.parentId ? platformRanges.get(node.parentId) : undefined);
      const configured = (platformCidr && !validateVcnCidr(platformCidr)) || projectConfigured || (node.id === 'hub-vcn' ? vcnValid : subnet && vcnValid && !validateSubnetCidr(subnet.cidr, draft.hubNetwork!.hubVcnCidr, draft.hubNetwork!.subnets.filter((_, index) => index !== subnetIndex)));
      return {
      ...node,
      label: (node.kind === 'vcn' || node.kind === 'subnet') && !configured ? `${node.label.split('\n')[0]}\nCIDR pending` : node.label,
      ipNote: undefined,
      endpointIp: undefined,
      };
    }),
  };
}

function placeRegion(graph: DiagramModel, prefix: string, offset: number, label: string): DiagramModel {
  const id = (value: string) => `${prefix}:${value}`;
  return {
    nodes: graph.nodes.map((node) => ({
      ...node, id: id(node.id), parentId: node.parentId ? id(node.parentId) : undefined,
      x: node.x + (node.parentId ? 0 : offset),
      label: node.kind === 'region' ? `${label} · ${node.label}` : node.label,
      rtDotTableId: node.rtDotTableId ? id(node.rtDotTableId) : undefined,
    })),
    edges: graph.edges.map((edge) => ({
      ...edge, id: id(edge.id), source: id(edge.source), target: id(edge.target),
      centerX: edge.centerX === undefined ? undefined : edge.centerX + offset,
      waypoints: edge.waypoints?.map(id),
      points: edge.points?.map((point) => ({ ...point, x: point.x + offset })),
      badges: edge.badges?.map((badge) => ({ ...badge, node: id(badge.node), x: badge.x + offset })),
    })),
  };
}

export function buildDrComparisonDiagram(model: LzModel, draft: DrDesignDraft): DiagramModel {
  const home = placeRegion(buildGraph(model, 4), 'home', 0, 'Home region');
  const dr = buildDrNetworkDiagram(model, draft);
  if (!dr) return home;
  const homeRight = Math.max(...home.nodes.filter((node) => !node.parentId).map((node) => node.x + node.width));
  const gap = 240;
  const target = placeRegion(dr, 'dr', homeRight + gap, 'DR region');
  const diagram = { nodes: [...home.nodes, ...target.nodes], edges: [...home.edges, ...target.edges] };
  if (draft.rpcEnabled) {
    diagram.nodes.push({ id: 'rpc', kind: 'attachment', label: 'RPC', x: homeRight + (gap - 100) / 2, y: 100, width: 100, height: 32 });
    diagram.edges.push(
      { id: 'rpc-home', source: 'home:drg', target: 'rpc', sourceSide: 'right', targetSide: 'left' },
      { id: 'rpc-dr', source: 'rpc', target: 'dr:drg', sourceSide: 'right', targetSide: 'left' },
    );
  }
  return diagram;
}
