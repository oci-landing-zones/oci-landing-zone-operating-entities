import type { DiagramModel, DiagramNode, FoundationConfig } from '../model/types';
import { findRegion } from '../services/regions';
import { foundationDeploymentStacks } from '../services/deploymentTopology';
import type { FoundationResourcesByRegion } from '../services/foundationInventory';
import { FOUNDATION_RESOURCES } from './foundationResources';

/** Group selected region roles by OCI region, independently of network generation. */
export function foundationGraph(foundation: FoundationConfig, byRegion: FoundationResourcesByRegion = {}): DiagramModel {
  const regional = foundation.stackScope === 'regional';
  const selections: [string, string | undefined][] = [
    ['Home region', foundation.tenancyHomeRegion],
    ['Primary region', regional ? foundation.homeRegion : foundation.region],
    ['Secondary region', regional ? foundation.region : foundation.drRegion],
  ];
  const regions = new Map<string, string[]>();
  for (const [role, selected] of selections) {
    const region = selected?.trim();
    if (!region || !findRegion(foundation.realm, region)) continue;
    regions.set(region, [...(regions.get(region) ?? []), role]);
  }
  const width = 420;
  const gap = 24;
  const stacks = foundationDeploymentStacks(foundation);
  const regionNodes: DiagramNode[] = [];
  const resourceNodes: DiagramNode[] = [];
  const roleNodes = new Map<string, DiagramNode>();
  let y = 76;
  for (const [region, roles] of regions) {
    const resources = [...new Set(byRegion[region] ?? [])];
    const id = `foundation-region-${region}`;
    const rows = Math.ceil(resources.length / 2);
    const height = Math.max(168, 84 + rows * 92);
    const node: DiagramNode = { id, kind: 'region', label: `${roles.join(' · ')}\n${region}`,
      parentId: 'foundation-tenancy', x: 24, y, width, height,
      deploymentStack: stacks.includes('home') && roles.includes('Home region') ? 'home'
        : stacks.includes('primary') && roles.includes('Primary region') ? 'primary'
        : stacks.includes('secondary') && roles.includes('Secondary region') ? 'secondary' : undefined };
    regionNodes.push(node);
    for (const role of roles) roleNodes.set(role, node);
    resources.forEach((resource, index) => resourceNodes.push({
      id: `${id}-${resource}`, kind: 'resourcegroup', foundationResource: resource,
      label: FOUNDATION_RESOURCES[resource].label, parentId: id,
      x: 18 + (index % 2) * 196,
      y: 72 + Math.floor(index / 2) * 92,
      width: 188, height: 84,
    }));
    y += height + gap;
  }
  const primary = roleNodes.get('Primary region');
  const secondary = roleNodes.get('Secondary region');
  if (primary && secondary && primary !== secondary) {
    const home = roleNodes.get('Home region');
    const separateHome = home && home !== primary && home !== secondary ? home : undefined;
    const deploymentY = separateHome ? separateHome.y + separateHome.height + gap : 76;
    primary.x = 24;
    secondary.x = 24 + width + gap;
    primary.y = secondary.y = deploymentY;
    if (separateHome) separateHome.x = 24 + (width + gap) / 2;
    y = Math.max(...regionNodes.map((node) => node.y + node.height)) + gap;
  }
  const tenancyWidth = Math.max(width + 48, ...regionNodes.map((node) => node.x + node.width + 24));
  return {
    nodes: [{
      id: 'foundation-tenancy', kind: 'tenancy',
      label: regions.size ? 'OCI Tenancy' : 'OCI Tenancy\nSelect Home and Primary regions',
      x: 0, y: 0, width: tenancyWidth, height: Math.max(200, y),
    }, ...regionNodes, ...resourceNodes],
    edges: [],
  };
}
