import type { LzModel } from '../model/types';
import type { GeneratedResourceInventory } from './generatedResources';
import type { RouteTable } from './routeTables';

export interface BastionTopology {
  serviceNode: string;
  name: string;
  subnetNode: string;
  targets: BastionTarget[];
}

export interface BastionTarget {
  id: string;
  scope: string;
  label: string;
  node: string;
  cidr: string;
}

/** Bind the real service to its generated subnet reference; missing bindings are not guessed. */
export function generatedBastionTopology(model: LzModel, tables: RouteTable[], inventory?: GeneratedResourceInventory): BastionTopology | undefined {
  if (!model.bastion?.enabled) return;
  const services = inventory?.groups.filter((group) => group.kind === 'bastion')
    .flatMap((group) => group.items.map((item) => ({ group, item }))) ?? [];
  if (services.length !== 1 || !services[0].item.subnetKey) return;
  const { group, item } = services[0];
  const nodes = new Set(tables.flatMap((table) => table.associations
    .filter((binding) => binding.kind === 'subnet' && binding.resourceKey === item.subnetKey)
    .map((binding) => binding.nodeId)));
  if (nodes.size !== 1) return;
  const subnetNode = [...nodes][0];
  if (!subnetNode.startsWith('hub-vcn-sn-')) return;
  const targets = new Map<string, BastionTarget>();
  for (const binding of tables.flatMap((table) => table.associations)) {
    if (binding.kind !== 'subnet' || !binding.resourceKey || !binding.subnet?.private || !binding.vcnNodeId || binding.vcnNodeId === 'hub-vcn') continue;
    const environment = binding.nodeId.match(/^cmp-env-(\d+)-/);
    const scope = environment ? model.environments[+environment[1]]?.name.trim()
      : binding.nodeId.startsWith('shared-plat-vcn-') ? '@shared' : undefined;
    if (!scope || !binding.subnet.cidr) continue;
    targets.set(binding.resourceKey, { id: binding.resourceKey, scope, label: binding.subnet.name,
      node: binding.nodeId, cidr: binding.subnet.cidr });
  }
  return { serviceNode: `resource-${group.id}`, name: item.name, subnetNode, targets: [...targets.values()].sort((a, b) => a.node.localeCompare(b.node)) };
}
