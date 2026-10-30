import type { DiagramEdge, DiagramModel, DiagramNode, DiagramOptions, LzModel } from '../model/types';
import { getHubKind, hasHubLoadBalancer } from '../services/hubKinds';
import { envNetworkDefaults } from '../model/defaults';
import { hostIpInSubnet } from '../services/cidr';
import type { RouteTable } from '../services/routeTables';
import { allFlowIds, buildFlowTraces } from '../services/flowTrace';
import { withFlowFocus } from './flowFocus';
import { platformInEnv, platformSubnetsForEnv, platformVcnForEnv } from '../services/platforms';
import { exadataDiagramPlatforms } from '../services/exadata';
import { generatorNames } from '../services/generatorNaming';
import { hybridRoutes, vpnCpeNodeId } from '../services/hybridConnectivity';
import { absoluteNodeRects, createLocalFlowRouter, flowAnchorPoint } from './flowGeometry';
import { connectionFlowGeometry, tableSourceAnchors, routeStructuralEdges, type FlowVisitAnchor } from './displayGeometry';
import { createFlowPlayback } from './flowPlayback';
import type { GeneratedResourceInventory } from '../services/generatedResources';
import { resourceGroupLayout } from './resourceGroups';
import { routeTableLayout } from './routeTableLayout';
import { attachmentLabelLayout, DIAGRAM_LAYOUT, drgCaptionLayout, minimumOwnerWidths } from './layoutPolicy';
import { premisesLayout, fastConnectHeight, FASTCONNECT_LINE_Y, HYBRID_LINK_WIDTH, HYBRID_REGION_GAP, VPN_PAIR_PITCH, VPN_TUNNEL_HEIGHT } from './hybridTopology';
import { providerServicesForRegion } from '../services/connectivityCatalog';
import { optimizeTablePlacement, tableAssociations } from './tablePlacement';

/**
 * Pure: canonical LzModel → renderer-agnostic DiagramModel.
 *
 * Containment hierarchy (each nested inside the previous):
 *   OCI Region
 *     └─ OCI Tenancy
 *          └─ cmp-landingzone
 *               ├─ cmp-lz-network  (yellow)
 *               │    └─ hub VCN                  (step 2: generator name + CIDR)
 *               │         ├─ gateways (IGW / NAT / SGW)
 *               │         └─ hub subnets         (step 2 subnet table)
 *               ├─ cmp-lz-platform (shared yellow, always present)
 *               ├─ cmp-lz-security (yellow)
 *               └─ cmp-lz-<env>   (green)     one per environment
 *                    └─ cmp-lz-<env>-network  (yellow)
 *                         └─ vcn-<region>-lz-<env>-projects
 *                              └─ 4 fixed subnets: web / app / db / infra
 *
 * Hub subnets matching the supported firewall roles get an icon + caption: *-fw-dmz and
 * *-fw-int show the OCI Network Firewall (caption nfw-<region>-hub-dmz/-int,
 * region from the Foundation step), *-lb shows the Load Balancer.
 *
 * The per-environment spoke network (VCN CIDR + subnets) lives on each
 * Environment in the model — seeded with defaults (10.0.<8·(i+1)>.0/21,
 * web/app/db/infra /24s) and adjustable in step 2.
 *
 * Child x/y are relative to the immediate parent (parentId). Both the React
 * Flow renderer and the .drawio exporter consume this, so screen and export
 * agree. Saved-design metadata is intentionally outside LzModel.
 */

const COMP_W = 200;    // plain (childless) compartment row — step 1 view
const COMP_H = 46;
const COMP_GAP = DIAGRAM_LAYOUT.gap;
const COL_GAP = 18;
const TITLE = 30;      // one-line container title strip
const VCN_TITLE = 46;  // VCN titles are two lines (name + CIDR)
const PAD = DIAGRAM_LAYOUT.padding;
const SUB_W = 300;     // subnet box (two-line label, room for an icon + caption)
const SUB_H = 50;      // plain subnet row
const SUB_H_ICON = 124; // subnet with an icon + caption inside
const SUB_GAP = 12;
const VCN_PAD = 16;    // route-table icon overhang plus clearance to the VCN border
const GW_W = 76;       // icon with a two-line service label
const GW_H = 74;
// The gateway node centres its icon, so half its width outside the VCN makes the
// icon centre sit exactly on the VCN's left boundary line.
const GW_X = -GW_W / 2;
const VCN_X = GW_W / 2 + 8;
const SUB_X = GW_W / 2 + 8;

const VCN_W = SUB_X + SUB_W + VCN_PAD;
const HUB_NET_W = VCN_X + VCN_W + PAD;
const NET_COMP_W = HUB_NET_W;
// Projects: a compartment to the right of each env network compartment,
// holding one block per project that applies to the environment.
const PROJ_COMP_W = 216;
const PROJ_GAP = 16;       // gap between the network and projects compartments
const PROJ_W = 184;        // a generated project-compartment name without clipping
const PROJ_H = 42;
const PROJ_GAP_V = 12;     // vertical gap between stacked project blocks
const ENV_COMP_W = PAD * 2 + NET_COMP_W + PROJ_GAP + PROJ_COMP_W;
// Platform VCNs stay in the environment network compartment. Their management
// compartments stack below projects in the right column.
const PLAT_COMP_W = PROJ_COMP_W;
const PLAT_VCN_GAP = 16;   // vertical gap between stacked platform VCNs
const nestedHeight = (count: number) => count
  ? TITLE + PAD + count * PROJ_H + (count - 1) * PROJ_GAP_V + PAD
  : PROJ_H;
const rowOffset = (heights: number[], index: number) =>
  heights.slice(0, index).reduce((sum, height) => sum + height + PROJ_GAP_V, 0);

// ---- DRG + VCN attachments. The DRG and ALL attachment pills cluster together
// inside cmp-network, below the hub VCN: the DRG on the left, the pills stacked
// to its right (one per VCN). Each VCN links to its pill, each pill to the DRG.
const DRG_SIZE = 48;       // minimum glyph size; dense attachment fans reserve more port space
const DRG_LABEL_H = 18;    // the "DRG" caption hangs below the icon — reserve room for it
const ATTACH_H = 26;
const ATTACH_GAP_V = 10;   // vertical gap between stacked attachment pills
const HUB_ATTACH_GAP = 18; // gap below the hub VCN before the DRG/attachment cluster
const ROUTE_GUTTER = 132;  // column gap (step 2+) — the channel the spoke links run up
const HYBRID_EQUIPMENT_GAP = 64;

// Route-table extents share the rendered title, note, column and row metrics.
const RT_W = 310;          // route-table box width
const RT_GAP = 66;         // gap between a VCN and its route-table column
const RT_STACK_GAP = 16;   // vertical gap between stacked tables in a lane
const RT_LEFT_W = RT_W + RT_GAP + PAD;  // reserved left margin (gateway + DRG tables)
const RT_RIGHT_W = RT_W + RT_GAP + PAD; // reserved right margin (spoke tables)

interface SubnetSpec {
  name: string;
  cidr: string;
  icon?: DiagramNode['icon'];
  caption?: string;
  captionTone?: 'green' | 'orange';
  ipNote?: string;
  /** A VM endpoint to draw inside the subnet (only icon-less subnets get one). */
  endpoint?: { name: string; ip: string };
  /** Public (IGW-routed) subnet — the hub LB + DMZ-firewall subnets. */
  isPublic?: boolean;
}

const SUB_H_ICON_IP = SUB_H_ICON + 16; // icon + caption + an IP line
const SUB_H_ENDPOINT = 110;            // plain subnet grown to hold a VM (name + icon + IP)
const subnetHeight = (sn: SubnetSpec) =>
  sn.icon ? (sn.ipNote ? SUB_H_ICON_IP : SUB_H_ICON) : sn.endpoint ? SUB_H_ENDPOINT : SUB_H;

/**
 * Give an icon-less subnet a VM endpoint and a host `.10` inside its range.
 * The name is `vm-<scope>-<role>` (the subnet's last name segment, scoped by the
 * environment so spoke names stay unique across environments) or `vm-<role>`
 * when unscoped (hub subnets, already unique). Decorated subnets (firewall /
 * load balancer) are returned untouched — they never get an endpoint.
 */
function withEndpoint(sn: SubnetSpec, scope = ''): SubnetSpec {
  if (sn.icon) return sn;
  const role = sn.name.split('-').pop() || 'ep';
  const name = scope ? `vm-${scope}-${role}` : `vm-${role}`;
  return { ...sn, endpoint: { name, ip: hostIpInSubnet(sn.cidr, 10) } };
}
const vcnHeight = (subnets: SubnetSpec[]) =>
  VCN_TITLE +
  subnets.reduce((h, sn) => h + subnetHeight(sn), 0) +
  (subnets.length > 1 ? (subnets.length - 1) * SUB_GAP : 0) +
  VCN_PAD;
const wrapHeight = (childHeight: number) => TITLE + PAD + childHeight + PAD;

function pushGeneratedResources(nodes: DiagramNode[], inventory: GeneratedResourceInventory): void {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const compartments = new Map(inventory.compartments.map((compartment) => [compartment.key, compartment]));
  const widthRequirements = minimumOwnerWidths(inventory);
  const owners = new Map<string, DiagramNode>();
  const children = (id: string) => nodes.filter((node) => node.parentId === id);
  const grow = (node: DiagramNode, height: number): void => {
    if (height <= node.height) return;
    const previousBottom = node.y + node.height;
    const growth = height - node.height;
    node.height = height;
    if (!node.parentId) return;
    for (const sibling of children(node.parentId)) {
      if (sibling.id !== node.id && sibling.y >= previousBottom
        && sibling.x < node.x + node.width && sibling.x + sibling.width > node.x) sibling.y += growth;
    }
    const parent = byId.get(node.parentId)!;
    grow(parent, Math.max(parent.height, ...children(parent.id).map((child) => child.y + child.height + PAD)));
  };
  const ensureOwner = (key: string, ancestry = new Set<string>()): DiagramNode => {
    const existing = owners.get(key);
    if (existing) return existing;
    const compartment = compartments.get(key);
    if (!compartment || ancestry.has(key)) throw new Error(`Generated resource compartment ancestry is unavailable for ${key}.`);
    const parent = compartment.parentKey ? ensureOwner(compartment.parentKey, new Set([...ancestry, key])) : undefined;
    const candidates = nodes.filter((node) => ['compartment', 'project', 'landingzone', 'tenancy'].includes(node.kind)
      && node.label === compartment.name && (parent ? node.parentId === parent.id : node.kind === 'tenancy'));
    if (candidates.length > 1) throw new Error(`Generated resource compartment ${key} has multiple diagram owners.`);
    if (candidates.length) { owners.set(key, candidates[0]); return candidates[0]; }
    if (!parent) throw new Error(`Generated resource compartment ancestry is unavailable for ${key}.`);
    const siblings = children(parent.id);
    const column = siblings.reduce<DiagramNode | undefined>((widest, child) => !widest || child.width > widest.width ? child : widest, undefined);
    const x = column?.x ?? PAD;
    const width = Math.min(Math.max(column?.width ?? parent.width - 2 * PAD, widthRequirements.get(key) ?? 0), parent.width - PAD - x);
    const owner: DiagramNode = {
      id: `cmp-generated-${key}`, kind: 'compartment', label: compartment.name, tone: 'yellow', container: true,
      parentId: parent.id, x, y: Math.max(TITLE + PAD, ...siblings.filter((child) => child.x < x + width && child.x + child.width > x).map((child) => child.y + child.height + COMP_GAP)),
      width, height: COMP_H,
    };
    nodes.push(owner);
    byId.set(owner.id, owner);
    owners.set(key, owner);
    parent.container = true;
    grow(parent, owner.y + owner.height + PAD);
    return owner;
  };
  const grouped = new Map<string, GeneratedResourceInventory['groups']>();
  for (const group of inventory.groups) {
    if (!group.items.length) continue;
    const groups = grouped.get(group.compartmentKey) ?? [];
    groups.push(group);
    grouped.set(group.compartmentKey, groups);
  }
  for (const [key, unordered] of grouped) {
    const owner = ensureOwner(key);
    owner.container = true;
    const available = owner.width - 2 * PAD;
    const columns = Math.min(DIAGRAM_LAYOUT.maxResourceColumns, unordered.length, Math.max(1, Math.floor((available + COMP_GAP) / (DIAGRAM_LAYOUT.resourceMinWidth + COMP_GAP))));
    const width = Math.min(280, (available - (columns - 1) * COMP_GAP) / columns);
    const groups = unordered.map((group) => ({ group, layout: resourceGroupLayout(group.kind, group.items, width) }))
      .sort((a, b) => b.layout.height - a.layout.height || a.group.id.localeCompare(b.group.id));
    const top = Math.max(TITLE + PAD, owner.height - PAD, ...children(owner.id).map((child) => child.y + child.height + COMP_GAP));
    const bottoms = Array<number>(columns).fill(top);
    for (const { group, layout } of groups) {
      const column = bottoms.indexOf(Math.min(...bottoms));
      nodes.push({
        id: `resource-${group.id}`, kind: 'resourcegroup', label: layout.label, resourceKind: group.kind,
        resourceItems: group.items.map((item) => ({ ...item })), parentId: owner.id,
        x: PAD + column * (width + COMP_GAP), y: bottoms[column], width, height: layout.height,
      });
      bottoms[column] += layout.height + COMP_GAP;
    }
    grow(owner, Math.max(...bottoms) - COMP_GAP + PAD);
  }
}

function stackEnvironments(nodes: DiagramNode[], ids: string[], startX: number, startY: number): void {
  let y = startY;
  for (const id of ids) {
    const card = nodes.find((node) => node.id === id)!;
    card.x = startX;
    card.y = y;
    y += card.height + COMP_GAP;
  }
  for (const id of ['landingzone', 'tenancy', 'region']) {
    const node = nodes.find((candidate) => candidate.id === id)!;
    const children = nodes.filter((child) => child.parentId === id);
    node.width = Math.max(...children.map((child) => child.x + child.width + PAD));
    node.height = Math.max(...children.map((child) => child.y + child.height + PAD));
  }
}

/** Emit a VCN node + its subnet children; returns each subnet's y/height (relative to the VCN). */
function pushVcn(
  nodes: DiagramNode[],
  id: string,
  parentId: string,
  label: string,
  subnets: SubnetSpec[],
  x = VCN_X,
  y = TITLE + PAD,
): { y: number; height: number }[] {
  nodes.push({
    id, kind: 'vcn', label, parentId,
    x, y, width: VCN_W, height: vcnHeight(subnets),
  });
  const placed: { y: number; height: number }[] = [];
  let sy = VCN_TITLE;
  subnets.forEach((sn, i) => {
    const height = subnetHeight(sn);
    nodes.push({
      id: `${id}-sn-${i}`, kind: 'subnet', label: `${sn.name}\n${sn.cidr}`, parentId: id,
      icon: sn.icon, caption: sn.caption, captionTone: sn.captionTone, ipNote: sn.ipNote,
      endpointName: sn.endpoint?.name, endpointIp: sn.endpoint?.ip, publicSubnet: sn.isPublic,
      x: SUB_X, y: sy, width: SUB_W, height,
    });
    placed.push({ y: sy, height });
    sy += height + SUB_GAP;
  });
  return placed;
}

/**
 * Hub subnets matching the hub_a roles get their icon + caption. The two network
 * firewalls also show an instance IP — the stored value, or one derived from the
 * subnet range when left blank.
 */
function decorateHubSubnet(name: string, cidr: string, regionTok: string): SubnetSpec {
  if (name.endsWith('-fw-dmz')) {
    return { name, cidr, icon: 'firewall', caption: `nfw-${regionTok}-lz-hub-dmz`, captionTone: 'green', ipNote: hostIpInSubnet(cidr, 10), isPublic: true };
  }
  if (name.endsWith('-lb')) {
    return { name, cidr, icon: 'lb', caption: 'Load Balancer', captionTone: 'green', isPublic: true };
  }
  if (name.endsWith('-fw-int')) {
    return { name, cidr, icon: 'firewall', caption: `nfw-${regionTok}-lz-hub-int`, captionTone: 'orange', ipNote: hostIpInSubnet(cidr, 10) };
  }
  if (name.endsWith('-fw')) {
    return { name, cidr, icon: 'firewall', caption: `nfw-${regionTok}-lz-hub`, captionTone: 'orange', ipNote: hostIpInSubnet(cidr, 10) };
  }
  if (name.endsWith('-untrust')) {
    return { name, cidr, icon: 'firewall', caption: 'Untrust NLB + firewall backends', captionTone: 'green', isPublic: true };
  }
  if (name.endsWith('-trust')) {
    return { name, cidr, icon: 'firewall', caption: 'Trust NLB + firewall backends', captionTone: 'orange' };
  }
  return { name, cidr };
}

/**
 * `upToStep` limits the diagram to what the wizard has reached — on step 1 the
 * compartments render as plain rows; the network nesting appears from step 2.
 */
export function buildGraphLayout(model: LzModel, upToStep = Infinity, opts: DiagramOptions = {}, projection?: {
  exadata?: ReturnType<typeof exadataDiagramPlatforms>;
  projectEnvironmentIds?: string[];
  environmentLayout?: Record<string, { networkHeight: number; platformTop: number }>;
}, routeTables: RouteTable[] = [], inventory?: GeneratedResourceInventory): DiagramModel {
  const hybrid = upToStep >= 2 ? hybridRoutes(model) : [];
  const vpns = hybrid.filter((connection) => connection.type === 'VPN');
  const circuits = hybrid.filter((connection) => connection.type === 'FastConnect');
  const physicalGroups = upToStep >= 2 ? Object.keys(model.hybridConnectivity?.cross_connect_groups ?? {}) : [];
  const hybridHeight = physicalGroups.length * 80;
  // Placeholder hub kinds (b/c) aren't specified yet — the network layer
  // stays hidden until an implemented hub kind is selected.
  const hubImplemented = getHubKind(model.network.hubKind)?.implemented ?? false;
  // Step 2 draws the hub only: hub VCN + subnets + gateways + DRG + the hub's own
  // DRG attachment. Step 3 adds the spoke side — the VCNs inside each environment
  // compartment, their Service Gateways, the spoke attachments — plus the
  // endpoints and the whole route-table layer. Before step 3 the environment
  // compartments are empty rows.
  const showHub = upToStep >= 2 && hubImplemented;
  const showSpokes = upToStep >= 3 && hubImplemented;
  // Platforms (step 4) build on the spoke layer: the shared platform row outside
  // the environments, and a platforms compartment inside each environment.
  const showPlatforms = upToStep >= 4 && hubImplemented;
  const exadata = upToStep >= 4 ? projection?.exadata ?? exadataDiagramPlatforms(model) : {
    platforms: [], sharedPlatforms: [], sharedWithoutNetwork: [], environmentsWithoutNetwork: {},
    sharedChildren: {}, environmentChildren: {}, projectChildren: {},
  };
  const platforms = [...(model.platforms ?? []), ...exadata.platforms];
  const sharedPlatforms = [...(model.sharedPlatforms ?? []), ...exadata.sharedPlatforms];
  // The route-table layer starts with spokes; endpoints reveal clickable dots,
  // while flow mode shows every table.
  // Every selectable hub has its own derived route-table adapter.
  const supportsFlowTracing = model.network.hubKind === 'hub_a' || model.network.hubKind === 'hub_b' || model.network.hubKind === 'hub_c' || model.network.hubKind === 'hub_e';
  const allRouteTables = showSpokes && supportsFlowTracing ? routeTables : [];
  // Active flows highlight matched route rows and draw their hop sequence over
  // the complete route-table layer.
  // "Show all flows" traces every flow, coloured by traffic type (as in ONTV).
  const activeFlows = showSpokes && supportsFlowTracing ? (opts.allFlows ? allFlowIds(model) : opts.activeFlows ?? []) : [];
  const flowTraces = activeFlows.length > 0 ? buildFlowTraces(model, activeFlows, opts.allFlows ? 'kind' : 'flow', allRouteTables) : [];
  const flowActive = flowTraces.length > 0;
  // Keep the complete routing configuration visible; flow selection only changes
  // which rows are highlighted.
  const rtHighlight = new Map<string, number[]>();
  const flowEndpointIds = new Set<string>();
  for (const t of flowTraces) {
    for (const h of t.highlights) {
      rtHighlight.set(h.tableId, [...(rtHighlight.get(h.tableId) ?? []), ...h.rows]);
    }
  }
  // Every drawn flow shows its source and destination VMs.
  for (const t of flowTraces) {
    for (const segment of t.segments) {
      if (/^cmp-env-\d+-vcn-sn-\d+$/.test(segment.from)) flowEndpointIds.add(segment.from);
      if (/^cmp-env-\d+-vcn-sn-\d+$/.test(segment.to)) flowEndpointIds.add(segment.to);
    }
  }
  const showRouteTables = showSpokes && supportsFlowTracing && (!!opts.showFlows || !!opts.allFlows || flowActive);
  const showDots = showSpokes && ((opts.showDots ?? false) || showRouteTables);
  // Manual endpoint mode shows all eligible endpoints. A flow adds only its
  // actual source/destination VMs so unrelated subnets do not become clutter.
  const showAllEndpoints = showSpokes && (opts.showEndpoints ?? false);
  const openSet = new Set<string>([...(opts.openTables ?? []), ...(showRouteTables ? allRouteTables.map((table) => table.id) : [])]);
  const openTables = showDots ? allRouteTables.filter((t) => openSet.has(t.id)) : [];
  const dotLane = (table: RouteTable): 'left' | 'middle' | 'right' => {
    const association = table.associations[0];
    if (!association) return 'left';
    if (association.kind === 'drg-attachment' || association.kind === 'rpc-attachment') return 'left';
    if (association.nodeId.startsWith('cmp-env-')) return 'right';
    return association.kind === 'subnet' ? 'middle' : 'left';
  };
  type TableLane = 'left' | 'middle' | 'right' | 'external';
  const tableLane = (table: RouteTable): TableLane => {
    if (table.associations.length && table.associations.every((association) => /^hybrid-vpn-.+:tunnel-[12]$/.test(association.nodeId) || association.nodeId.startsWith('hybrid-fc-'))) return 'external';
    if (!table.associations.length || table.associations.some((association) => association.kind === 'drg-attachment' || association.kind === 'rpc-attachment')) return 'left';
    if (table.associations.some((association) => association.nodeId.startsWith('cmp-env-'))) return 'right';
    return table.associations.every((association) => association.kind === 'subnet') ? 'middle' : 'left';
  };
  const showMidRT = openTables.some((table) => tableLane(table) === 'middle');
  const showLeftRT = openTables.some((table) => tableLane(table) === 'left');
  const showRightRT = openTables.some((table) => tableLane(table) === 'right');
  const sharedInstances = showPlatforms ? sharedPlatforms.map((platform, index) => {
    const subnets: SubnetSpec[] = platform.subnets.map((sn) => ({
      name: generatorNames.environmentSubnet(model.foundation.regionShortName, 'shared', `${platform.key}-${sn.name}`),
      cidr: sn.cidr,
    }));
    return { index, platform, subnets, vcnH: vcnHeight(subnets), vcnId: `shared-plat-vcn-${index}` };
  }) : [];
  const f = model.foundation;
  const region = f.region.trim();
  const regionTok = f.regionShortName.trim().toLowerCase() || '<region>';

  // ---- hub network (left column), driven by the step 2 fields
  const hubSubnets = model.network.subnets.map((sn) => {
    const spec = decorateHubSubnet(generatorNames.hubSubnet(regionTok, sn.name), sn.cidr, regionTok);
    if (spec.icon === 'lb' && !hasHubLoadBalancer(model)) {
      delete spec.icon;
      delete spec.caption;
    }
    return showAllEndpoints ? withEndpoint(spec) : spec;
  });
  const hubVcnLabel = `${generatorNames.hubVcn(regionTok)}\n${model.network.hubVcnCidr}`;
  const hubVcnH = vcnHeight(hubSubnets);
  // cmp-network keeps its natural width whether or not a hub table is open — an
  // open hub table sits in a reserved lane OUTSIDE it (see midMargin below), the
  // same way spoke tables sit in a margin outside the env compartments.
  const generatedCompartments = new Map(inventory?.compartments.map((compartment) => [compartment.key, compartment]));
  const ownerWidths = inventory ? minimumOwnerWidths(inventory) : new Map<string, number>();
  const sharedOwners = inventory?.compartments.filter((compartment) => {
    const parent = generatedCompartments.get(compartment.parentKey ?? '');
    const tenancy = generatedCompartments.get(parent?.parentKey ?? '');
    return [generatorNames.networkCompartment, generatorNames.securityCompartment, generatorNames.platformCompartment].includes(compartment.name) && parent?.name === generatorNames.landingZone
      && tenancy?.name === 'OCI Tenancy' && !tenancy.parentKey;
  });
  // cmp-network holds the hub VCN AND, below it, the DRG + attachment pills. In
  // step 2 only the hub's own attachment is shown; the spoke attachments (one per
  // environment) join in step 3, and one per platform VCN in step 4.

  // ---- environments (right column), stored per-environment spoke networks
  const envs = model.environments.map((e, i) => {
    const hasProjectNetwork = e.projectNetworkEnabled !== false && (!projection?.projectEnvironmentIds || projection.projectEnvironmentIds.includes(e.id));
    const name = e.name.trim() || `env${i + 1}`;
    // Stale in-memory records may predate Environment.network — fall back to defaults.
    const net = e.network ?? envNetworkDefaults(i);
    const subnets: SubnetSpec[] = net.subnets.map((sn, subnetIndex) => {
      const nodeId = `cmp-env-${i}-vcn-sn-${subnetIndex}`;
      const spec: SubnetSpec = { name: generatorNames.environmentSubnet(regionTok, name, sn.name), cidr: sn.cidr };
      return showAllEndpoints || flowEndpointIds.has(nodeId) ? withEndpoint(spec, name) : spec;
    });
    const vcnH = hasProjectNetwork ? vcnHeight(subnets) : 0;
    // Projects that land in this environment ('all' or an explicit list).
    const projectRows = showSpokes
      ? model.projects
          .filter((p) => p.environments === 'all' || (Array.isArray(p.environments) && p.environments.includes(e.id)))
          .filter((p) => p.name.trim())
          .map((p) => ({ name: p.name.trim(), children: exadata.projectChildren[e.id]?.[p.id] ?? [] }))
      : [];
    const projStackH = projectRows.length > 0
      ? projectRows.reduce((sum, row) => sum + nestedHeight(row.children.length), 0) + (projectRows.length - 1) * PROJ_GAP_V
      : 0;
    const projCompH = TITLE + PAD + projStackH + PAD;
    const projectRowHeights = projectRows.map((row) => nestedHeight(row.children.length));
    // Platforms that land in this environment — each is a VCN with its own subnets,
    // derived (or overridden) for this environment.
    const platformInstances = showPlatforms
      ? platforms
          .filter((p) => platformInEnv(p, e.id))
          .map((p) => {
            const vcnCidr = platformVcnForEnv(p, e.id, i);
            const key = p.key.trim() || p.id;
            const subnetSpecs: SubnetSpec[] = platformSubnetsForEnv(p, e.id, i)
              .map((sn) => ({
                name: generatorNames.environmentPlatformSubnet(regionTok, name, key, sn.name, p.type),
                cidr: sn.cidr,
              }));
            const vcnName = generatorNames.environmentPlatformVcn(regionTok, name, key);
            return {
              id: p.id, name: key, type: p.type, vcnName,
              vcnLabel: `${vcnName}\n${vcnCidr}`,
              attachLabel: generatorNames.environmentPlatformAttachment(regionTok, name, key),
              subnetSpecs, vcnH: vcnHeight(subnetSpecs),
            };
          })
      : [];
    const platStackH = platformInstances.length > 0
      ? platformInstances.reduce((h, pl) => h + pl.vcnH, 0) + (platformInstances.length - 1) * PLAT_VCN_GAP
      : 0;
    const netH = Math.max(TITLE + PAD + vcnH + (platformInstances.length ? (hasProjectNetwork ? PLAT_VCN_GAP : 0) + platStackH : 0) + PAD, projection?.environmentLayout?.[e.id]?.networkHeight ?? 0);
    const noNetworkPlatforms = exadata.environmentsWithoutNetwork[e.id] ?? [];
    const platformRows = [
      ...platformInstances.map((instance) => ({ key: instance.name, height: nestedHeight(exadata.environmentChildren[e.id]?.[instance.name]?.length ?? 0) })),
      ...noNetworkPlatforms.map((key) => ({ key, height: nestedHeight(exadata.environmentChildren[e.id]?.[key]?.length ?? 0) })),
    ];
    const platformCompCount = platformRows.length;
    const platCompH = platformCompCount > 0
      ? TITLE + PAD + platformRows.reduce((sum, row) => sum + row.height, 0) + (platformCompCount - 1) * PROJ_GAP_V + PAD
      : COMP_H;
    const hasPlatforms = platformCompCount > 0;
    const platformCompTop = Math.max(TITLE + PAD + projCompH + COMP_GAP, projection?.environmentLayout?.[e.id]?.platformTop ?? 0);
    const rightColH = platformCompTop - TITLE - PAD + platCompH;
    return {
      id: `cmp-env-${i}`,
      sourceId: e.id,
      name,
      label: generatorNames.environmentCompartment(name),
      secure: model.foundation.stackScope !== 'regional' && e.securityZone,
      netLabel: generatorNames.environmentChildCompartment(name, 'network'),
      vcnLabel: `${generatorNames.environmentVcn(regionTok, name)}\n${net.vcnCidr}`,
      subnets,
      vcnH,
      netH,
      attachName: generatorNames.environmentAttachment(regionTok, name),
      projectRows,
      projectRowHeights,
      projCompH,
      platformInstances,
      noNetworkPlatforms,
      platformRows,
      platCompH,
      platformCompTop,
      hasPlatforms,
      hasProjectNetwork,
      compH: showSpokes ? wrapHeight(Math.max(netH, rightColH)) : COMP_H,
    };
  });
  const gutterItems: { id: string; label: string; vcn: string }[] = [];
  if (showSpokes) {
    for (const env of envs) {
      if (env.hasProjectNetwork) gutterItems.push({ id: `attach-${env.id}`, label: env.attachName, vcn: `${env.id}-vcn` });
      env.platformInstances.forEach((pl, k) => {
        gutterItems.push({ id: `attach-${env.id}-plat-${k}`, label: pl.attachLabel, vcn: `${env.id}-plat-${k}` });
      });
    }
  }
  sharedInstances.forEach((instance) => {
    gutterItems.push({
      id: `attach-shared-${instance.index}`,
      label: generatorNames.sharedPlatformAttachment(regionTok, instance.platform.key),
      vcn: instance.vcnId,
    });
  });
  const attachList = [
    { id: 'attach-hub', label: generatorNames.hubAttachment(regionTok), vcn: 'hub-vcn' },
    ...gutterItems,
  ];
  const numAttach = attachList.length;
  const drgSize = Math.max(DRG_SIZE, (Math.max(numAttach, vpns.length * 2 + circuits.length) + 1) * 12);
  const attachmentWidth = Math.max(...attachList.map((attachment) => attachmentLabelLayout(attachment.label).width));
  const drgFootprint = drgCaptionLayout(generatorNames.hubDrg(regionTok), drgSize).width;
  const attachmentGap = 2 * COMP_GAP + 8 * (numAttach - 1);
  const groupW = drgFootprint + attachmentGap + attachmentWidth;
  const leftColumnW = Math.max(showHub ? Math.max(HUB_NET_W, groupW + 2 * PAD) : COMP_W, ...(sharedOwners ?? []).map((owner) => ownerWidths.get(owner.key) ?? 0));
  const netCompW = leftColumnW;
  const securityCompW = leftColumnW;
  const stackH = numAttach * ATTACH_H + (numAttach - 1) * ATTACH_GAP_V;
  // The DRG icon is centred in the cluster; padding both sides by its caption
  // height keeps the "DRG" label clear of the compartment border (it otherwise
  // overflows when the cluster is short — e.g. step 2's single hub attachment).
  const clusterH = Math.max(drgSize + 2 * DRG_LABEL_H, stackH);
  const sharedNetworkH = sharedInstances.length
    ? sharedInstances.reduce((height, instance) => height + instance.vcnH, 0) + sharedInstances.length * PLAT_VCN_GAP
    : 0;
  const netCompH = showHub
    ? TITLE + PAD + hubVcnH + sharedNetworkH + HUB_ATTACH_GAP + clusterH + PAD + hybridHeight
    : COMP_H;
  const sharedRows = [
    ...sharedInstances.map((instance) => ({ key: instance.platform.key, height: nestedHeight(exadata.sharedChildren[instance.platform.key]?.length ?? 0) })),
    ...exadata.sharedWithoutNetwork.map((key) => ({ key, height: nestedHeight(exadata.sharedChildren[key]?.length ?? 0) })),
  ];
  const sharedChildCount = sharedRows.length;
  const sharedChildrenH = sharedChildCount
    ? TITLE + PAD + sharedRows.reduce((sum, row) => sum + row.height, 0) + (sharedChildCount - 1) * PROJ_GAP_V + PAD
    : COMP_H;
  // The shared platform compartment exists from Foundation onward.
  const leftH = netCompH + COMP_GAP + COMP_H + COMP_GAP + sharedChildrenH;

  // Project and platform compartments share the right column beside the networks.
  const environmentWidths = inventory?.compartments.filter((compartment) => {
    const parent = generatedCompartments.get(compartment.parentKey ?? '');
    return parent?.name === generatorNames.landingZone && envs.some((env) => env.label === compartment.name);
  }).map((compartment) => ownerWidths.get(compartment.key) ?? 0) ?? [];
  const envCompW = showSpokes ? ENV_COMP_W : Math.max(4 * PAD + 2 * DIAGRAM_LAYOUT.resourceMinWidth + COMP_GAP, ...environmentWidths);
  const rightH = envs.length > 0
    ? envs.reduce((sum, env) => sum + env.compH, 0) + (envs.length - 1) * COMP_GAP
    : 0;

  // ---- outer containers, innermost outward
  const contentH = Math.max(leftH, rightH);
  const innerTop = TITLE + PAD;
  const leftOffset = 0;
  const rightOffset = 0;

  // Step 2+ widens the column gap into a routing gutter that holds the spoke
  // attachment pills, so the DRG links travel a clear channel.
  const gutter = showSpokes ? ROUTE_GUTTER : COL_GAP;
  // Table callouts reserve exterior columns and association-rail gutters. Physical
  // resource ports remain on their owners when these margins shift the columns.
  const leftMargin = showLeftRT ? RT_LEFT_W : 0;
  const rightMargin = showRightRT ? RT_RIGHT_W : 0;
  const midMargin = showMidRT ? RT_GAP + RT_W + PAD : 0;
  const leftX = PAD + leftMargin;
  const hubRtColX = leftX + leftColumnW + RT_GAP; // hub tables clear every shared compartment
  const rightX = leftX + leftColumnW + midMargin + gutter;
  const lzWidth = envs.length ? rightX + envCompW + PAD + rightMargin : leftX + leftColumnW + midMargin + PAD;
  const lzHeight = innerTop + contentH + PAD;

  const tenWidth = PAD * 2 + lzWidth;
  const tenHeight = innerTop + lzHeight + PAD;

  const regWidth = PAD * 2 + tenWidth;
  const regHeight = innerTop + tenHeight + PAD;

  const nodes: DiagramNode[] = [
    { id: 'region', kind: 'region', label: region ? `OCI Region · ${region}` : 'OCI Region', x: 0, y: 0, width: regWidth, height: regHeight },
    { id: 'tenancy', kind: 'tenancy', label: 'OCI Tenancy', parentId: 'region', x: PAD, y: innerTop, width: tenWidth, height: tenHeight },
    { id: 'landingzone', kind: 'landingzone', secure: f.stackScope !== 'regional', container: true, label: generatorNames.landingZone, parentId: 'tenancy', x: PAD, y: innerTop, width: lzWidth, height: lzHeight },
  ];
  const edges: DiagramEdge[] = [];
  const pushExadataChildren = (parentId: string, parentLabel: string, parentWidth: number, children: Array<'db' | 'infra'>) => {
    children.forEach((child, index) => nodes.push({
      id: `${parentId}-${child}`, kind: 'compartment', tone: 'gray',
      label: `${parentLabel}-${child}`, parentId,
      x: PAD, y: TITLE + PAD + index * (PROJ_H + PROJ_GAP_V),
      width: parentWidth - 2 * PAD, height: PROJ_H,
    }));
  };

  // network compartment › hub VCN › gateways + hub subnets (step 2+, implemented hub kinds only)
  nodes.push({ id: 'cmp-network', kind: 'compartment', tone: 'yellow', secure: f.stackScope !== 'regional', container: showHub || undefined, label: generatorNames.networkCompartment, parentId: 'landingzone', x: leftX, y: innerTop + leftOffset, width: netCompW, height: netCompH });
  if (showHub) {
    const placed = pushVcn(nodes, 'hub-vcn', 'cmp-network', hubVcnLabel, hubSubnets);
    // Gateways straddle the left boundary: IGW by the first subnet,
    // NAT by the internal firewall subnet, SGW by the last subnet.
    const centerOf = (i: number) => placed[i].y + placed[i].height / 2;
    const natIndex = hubSubnets.findIndex((sn) => sn.name.endsWith(model.network.hubKind === 'hub_e' ? '-mgmt' : '-fw-int'));
    const anchors = placed.length > 0
      ? [centerOf(0), centerOf(natIndex >= 0 ? natIndex : Math.floor(placed.length / 2)), centerOf(placed.length - 1)]
      : [hubVcnH * 0.2, hubVcnH * 0.5, hubVcnH * 0.8];
    const gateways = [
      { id: 'gw-igw', icon: 'igw' as const, label: 'Internet\nGateway' },
      { id: 'gw-natgw', icon: 'natgw' as const, label: 'NAT\nGateway' },
      { id: 'gw-sgw', icon: 'sgw' as const, label: 'Service\nGateway' },
    ];
    let gatewayBottom = VCN_TITLE + 2 - COMP_GAP;
    gateways.forEach((gw, i) => {
      const lastTop = hubVcnH - GW_H - 2 - (gateways.length - i - 1) * (GW_H + COMP_GAP);
      const y = Math.max(gatewayBottom + COMP_GAP, Math.min(anchors[i] - GW_H / 2, lastTop));
      nodes.push({ id: gw.id, kind: 'gateway', icon: gw.icon, label: gw.label, parentId: 'hub-vcn', x: GW_X, y, width: GW_W, height: GW_H });
      gatewayBottom = y + GW_H;
    });

    // DRG + attachment cluster, centred horizontally in cmp-network below the hub
    // VCN: DRG on the left, the pills stacked to its right (hub first, then envs).
    let sharedY = TITLE + PAD + hubVcnH + PLAT_VCN_GAP;
    sharedInstances.forEach((instance) => {
      const label = `${generatorNames.sharedPlatformVcn(regionTok, instance.platform.key)}\n${instance.platform.vcnCidr}`;
      const placed = pushVcn(nodes, instance.vcnId, 'cmp-network', label, instance.subnets, VCN_X, sharedY);
      const firstAnchor = placed[0] ? placed[0].y + placed[0].height / 2 : VCN_TITLE + PAD;
      const last = placed[placed.length - 1];
      const lastAnchor = last ? last.y + last.height / 2 : firstAnchor;
      nodes.push({
        id: `shared-plat-sgw-${instance.index}`, kind: 'gateway', icon: 'sgw',
        label: 'Service\nGateway', parentId: instance.vcnId,
        x: GW_X, y: Math.min(lastAnchor - GW_H / 2, instance.vcnH - GW_H - 2), width: GW_W, height: GW_H,
      });
      if (model.network.hubKind === 'hub_e') {
        nodes.push({
          id: `shared-plat-natgw-${instance.index}`, kind: 'gateway', icon: 'natgw',
          label: 'NAT\nGateway', parentId: instance.vcnId,
          x: GW_X, y: Math.max(VCN_TITLE + 2, firstAnchor - GW_H / 2), width: GW_W, height: GW_H,
        });
      }
      sharedY += instance.vcnH + PLAT_VCN_GAP;
    });
    const clusterTop = TITLE + PAD + hubVcnH + sharedNetworkH + HUB_ATTACH_GAP;
    const groupLeft = (netCompW - groupW) / 2;
    const drgX = groupLeft + (drgFootprint - drgSize) / 2;
    const stackX = groupLeft + drgFootprint + attachmentGap;
    const stackTop = clusterTop + (clusterH - stackH) / 2;
    nodes.push({ id: 'drg', kind: 'drg', label: generatorNames.hubDrg(regionTok), parentId: 'cmp-network', x: drgX, y: clusterTop + (clusterH - drgSize) / 2, width: drgSize, height: drgSize });

    // Gutter-routed attachments: one per spoke VCN (step 3) and one per platform
    // VCN (step 4). Grouped by environment (a spoke then its platforms) so the
    // pills sit near their VCNs in the stack.
    // Absolute x of the gutter between cmp-network and the env column. The spoke
    // links pin their vertical run here so it stays in the white channel even when
    // an open hub route-table widens cmp-network (otherwise the bend, which floats
    // at the link midpoint, drifts onto the yellow / over the open table).
    // landingzone sits two PADs deep (region 0 → tenancy PAD → landing zone PAD);
    // the gutter starts past cmp-network AND any open hub-table lane (midMargin).
    const gutterCenterX = 2 * PAD + leftX + leftColumnW + midMargin + gutter / 2;
    // Stagger every gutter link's vertical run around the gutter centre so the
    // parallel spoke + platform links never overlap. Narrow the stagger as the
    // count grows so the fan stays inside the gutter.
    const gutterMid = (gutterItems.length - 1) / 2;
    const gutterStep = Math.min(18, (gutter * 0.55) / Math.max(1, gutterItems.length));
    attachList.forEach((a, i) => {
      nodes.push({ id: a.id, kind: 'attachment', label: a.label, parentId: 'cmp-network', x: stackX, y: stackTop + i * (ATTACH_H + ATTACH_GAP_V), width: attachmentWidth, height: ATTACH_H });
      // Hub VCN sits directly above its pill (vertical link); spoke + platform VCNs
      // sit to the right (horizontal link through the gutter). Every pill meets the
      // DRG on its left side.
      const hub = i === 0;
      const channel = hub ? undefined : (i - 1 - gutterMid) * gutterStep;
      edges.push({ id: `e-${a.vcn}-${a.id}`, source: a.vcn, target: a.id, sourceSide: hub ? 'bottom' : 'left', targetSide: hub ? 'top' : 'right', channel, centerX: hub ? undefined : gutterCenterX });
      // Each DRG attachment is a separate OCI connection. Give every line its
      // own port on the DRG border so the graph never collapses them into one.
      edges.push({
        id: `e-${a.id}-drg`, source: a.id, target: 'drg',
        sourceSide: 'left', targetSide: 'right', targetPort: (i + 1) / (attachList.length + 1),
      });
    });

  }

  if (showHub && hybridHeight) {
    const entries = [
      ...physicalGroups.map((name) => ({ id: `hybrid-physical-${name}`, label: `Cross-connect group ${name}\nPhysical preparation`, routed: false })),
    ];
    entries.forEach((entry, index) => {
      nodes.push({ id: entry.id, kind: 'attachment', label: entry.label, parentId: 'cmp-network', x: PAD, y: netCompH - hybridHeight + index * 80, width: netCompW - 2 * PAD, height: 60 });
      if (entry.routed) edges.push({ id: `e-${entry.id}-drg`, source: entry.id, target: 'drg', sourceSide: 'left', targetSide: 'left' });
    });
  }

  // security compartment (plain row under the network compartment)
  nodes.push({ id: 'cmp-security', kind: 'compartment', tone: 'yellow', label: generatorNames.securityCompartment, parentId: 'landingzone', x: leftX, y: innerTop + leftOffset + netCompH + COMP_GAP, width: securityCompW, height: COMP_H });

  // The shared platform root is generator-owned and always present. Optional
  // shared platform child compartments appear here; their VCNs live above in
  // cmp-lz-network.
  nodes.push({
    id: 'cmp-platform', kind: 'compartment', tone: 'yellow', container: sharedChildCount > 0 || undefined,
    label: generatorNames.platformCompartment, parentId: 'landingzone',
    x: leftX, y: innerTop + leftOffset + netCompH + COMP_GAP + COMP_H + COMP_GAP,
    width: netCompW, height: sharedChildrenH,
  });
  sharedInstances.forEach((instance, index) => {
    const id = `cmp-shared-platform-${index}`;
    const label = generatorNames.sharedPlatformCompartment(instance.platform.key);
    const children = exadata.sharedChildren[instance.platform.key] ?? [];
    nodes.push({
      id, kind: 'compartment', tone: 'gray', container: children.length > 0 || undefined,
      label, parentId: 'cmp-platform',
      x: PAD, y: TITLE + PAD + rowOffset(sharedRows.map((row) => row.height), index),
      width: netCompW - 2 * PAD, height: sharedRows[index].height,
    });
    pushExadataChildren(id, label, netCompW - 2 * PAD, children);
  });
  exadata.sharedWithoutNetwork.forEach((key, index) => {
    const rowIndex = sharedInstances.length + index;
    const id = `cmp-shared-exadata-${key}`;
    const label = generatorNames.sharedPlatformCompartment(key);
    const children = exadata.sharedChildren[key] ?? [];
    nodes.push({
      id, kind: 'compartment', tone: 'gray', container: children.length > 0 || undefined,
      label, parentId: 'cmp-platform',
      x: PAD, y: TITLE + PAD + rowOffset(sharedRows.map((row) => row.height), rowIndex),
      width: netCompW - 2 * PAD, height: sharedRows[rowIndex].height,
    });
    pushExadataChildren(id, label, netCompW - 2 * PAD, children);
  });

  // environment compartments › env network compartment › env VCN › its subnets (step 2+)
  let envY = innerTop + rightOffset;
  envs.forEach((env) => {
    const compTop = envY;
    nodes.push({ id: env.id, kind: 'compartment', tone: 'green', secure: env.secure, container: showSpokes || undefined, label: env.label, parentId: 'landingzone', x: rightX, y: compTop, width: envCompW, height: env.compH });
    envY = compTop + env.compH + COMP_GAP;
    if (!showSpokes) return;
    nodes.push({ id: `${env.id}-network`, kind: 'compartment', tone: 'yellow', container: true, label: env.netLabel, parentId: env.id, x: PAD, y: TITLE + PAD, width: NET_COMP_W, height: env.netH });
    const placed = env.hasProjectNetwork ? pushVcn(nodes, `${env.id}-vcn`, `${env.id}-network`, env.vcnLabel, env.subnets) : [];
    let platformY = TITLE + PAD + env.vcnH + (env.hasProjectNetwork ? PLAT_VCN_GAP : 0);
    env.platformInstances.forEach((pl, k) => {
      const platformVcnId = `${env.id}-plat-${k}`;
      const platformPlaced = pushVcn(nodes, platformVcnId, `${env.id}-network`, pl.vcnLabel, pl.subnetSpecs, VCN_X, platformY);
      const platformFirstAnchor = platformPlaced[0]
        ? platformPlaced[0].y + platformPlaced[0].height / 2
        : VCN_TITLE + PAD;
      const platformLast = platformPlaced[platformPlaced.length - 1];
      const platformLastAnchor = platformLast
        ? platformLast.y + platformLast.height / 2
        : platformFirstAnchor;
      nodes.push({
        id: `${platformVcnId}-sgw`, kind: 'gateway', icon: 'sgw',
        label: 'Service\nGateway',
        parentId: platformVcnId, x: GW_X,
        y: Math.min(platformLastAnchor - GW_H / 2, pl.vcnH - GW_H - 2), width: GW_W, height: GW_H,
      });
      if (model.network.hubKind === 'hub_e') {
        nodes.push({
          id: `${platformVcnId}-natgw`, kind: 'gateway', icon: 'natgw',
          label: 'NAT\nGateway',
          parentId: platformVcnId, x: GW_X,
          y: Math.max(VCN_TITLE + 2, platformFirstAnchor - GW_H / 2), width: GW_W, height: GW_H,
        });
      }
      platformY += pl.vcnH + PLAT_VCN_GAP;
    });
    // Service Gateway straddles the VCN boundary, level with the last subnet.
    const anchor = placed.length > 0
      ? placed[placed.length - 1].y + placed[placed.length - 1].height / 2
      : env.vcnH * 0.7;
    const sgwY = Math.max(VCN_TITLE + 2, Math.min(anchor - GW_H / 2, env.vcnH - GW_H - 2));
    if (env.hasProjectNetwork) nodes.push({ id: `${env.id}-sgw`, kind: 'gateway', icon: 'sgw', label: 'Service\nGateway', parentId: `${env.id}-vcn`, x: GW_X, y: sgwY, width: GW_W, height: GW_H });
    // Hub E gives every spoke its own NAT gateway, so internet egress stays
    // local rather than being hair-pinned through a hub firewall.
    if (model.network.hubKind === 'hub_e' && env.hasProjectNetwork) {
      nodes.push({
        id: `${env.id}-natgw`, kind: 'gateway', icon: 'natgw', label: 'NAT\nGateway', parentId: `${env.id}-vcn`,
        x: GW_X, y: Math.max(VCN_TITLE + 2, (placed[0]?.y ?? VCN_TITLE) - 12), width: GW_W, height: GW_H,
      });
    }

    // projects compartment to the right of the network compartment, with
    // one block per project that applies to this environment.
    nodes.push({
      id: `${env.id}-projects`, kind: 'compartment', tone: 'projects', container: true,
      label: generatorNames.environmentChildCompartment(env.name, 'projects'), parentId: env.id,
      x: PAD + NET_COMP_W + PROJ_GAP, y: TITLE + PAD, width: PROJ_COMP_W, height: env.projCompH,
    });
    env.projectRows.forEach((project, k) => {
      const projectId = `${env.id}-proj-${k}`;
      const projectLabel = generatorNames.environmentProjectCompartment(env.name, project.name);
      const projectHeight = env.projectRowHeights[k];
      nodes.push({
        id: projectId, kind: 'project', container: project.children.length > 0 || undefined,
        label: projectLabel, parentId: `${env.id}-projects`,
        x: (PROJ_COMP_W - PROJ_W) / 2,
        y: TITLE + PAD + rowOffset(env.projectRowHeights, k),
        width: PROJ_W, height: projectHeight,
      });
      project.children.forEach((type, index) => nodes.push({
        id: `${projectId}-${type}-db`, kind: 'compartment', tone: 'gray',
        label: `${projectLabel}-${type}-db`, parentId: projectId,
        x: PAD / 2, y: TITLE + PAD + index * (PROJ_H + PROJ_GAP_V),
        width: PROJ_W - PAD, height: PROJ_H,
      }));
    });

    nodes.push({
      id: `${env.id}-platforms`, kind: 'compartment', tone: 'platform', container: env.hasPlatforms || undefined,
      label: generatorNames.environmentChildCompartment(env.name, 'platform'), parentId: env.id,
      x: PAD + NET_COMP_W + PROJ_GAP, y: env.platformCompTop, width: PLAT_COMP_W, height: env.platCompH,
    });
    env.platformInstances.forEach((pl, k) => {
      const id = `${env.id}-platform-comp-${k}`;
      const label = generatorNames.environmentPlatformCompartment(env.name, pl.name);
      const children = exadata.environmentChildren[env.sourceId]?.[pl.name] ?? [];
      nodes.push({
        id, kind: 'compartment', tone: 'gray', container: children.length > 0 || undefined,
        label, parentId: `${env.id}-platforms`,
        x: PAD, y: TITLE + PAD + rowOffset(env.platformRows.map((row) => row.height), k),
        width: PLAT_COMP_W - 2 * PAD, height: env.platformRows[k].height,
      });
      pushExadataChildren(id, label, PLAT_COMP_W - 2 * PAD, children);
    });
    env.noNetworkPlatforms.forEach((key, k) => {
      const rowIndex = env.platformInstances.length + k;
      const id = `${env.id}-exadata-${key}`;
      const label = generatorNames.environmentPlatformCompartment(env.name, key);
      const children = exadata.environmentChildren[env.sourceId]?.[key] ?? [];
      nodes.push({
        id, kind: 'compartment', tone: 'gray', container: children.length > 0 || undefined,
        label, parentId: `${env.id}-platforms`,
        x: PAD, y: TITLE + PAD + rowOffset(env.platformRows.map((row) => row.height), rowIndex),
        width: PLAT_COMP_W - 2 * PAD, height: env.platformRows[rowIndex].height,
      });
      pushExadataChildren(id, label, PLAT_COMP_W - 2 * PAD, children);
    });
  });

  const resourceCompartments = new Map(inventory?.compartments.map((compartment) => [compartment.key, compartment]));
  const matchesCompartmentPath = (key: string, node: DiagramNode, seen = new Set<string>()): boolean => {
    const compartment = resourceCompartments.get(key);
    if (!compartment || seen.has(key) || compartment.name !== node.label) return false;
    if (!compartment.parentKey) return node.kind === 'tenancy';
    const parent = nodes.find((candidate) => candidate.id === node.parentId);
    return !!parent && matchesCompartmentPath(compartment.parentKey, parent, new Set([...seen, key]));
  };
  const outerResourceOwners = new Set(inventory?.compartments.filter((compartment) =>
    nodes.some((node) => ['landingzone', 'tenancy'].includes(node.kind) && matchesCompartmentPath(compartment.key, node))).map((compartment) => compartment.key));
  if (inventory) pushGeneratedResources(nodes, { ...inventory, groups: inventory.groups.filter((group) => !outerResourceOwners.has(group.compartmentKey)) });
  if (!showSpokes) stackEnvironments(nodes, envs.map((env) => env.id), rightX, innerTop);

  if (showHub && model.remotePeeringConnections?.length) {
    const lz = nodes.find((node) => node.id === 'landingzone')!;
    const start = lz.height;
    let bottom = start;
    for (const connection of model.remotePeeringConnections) {
      const height = 64 + connection.remoteCidrs.length * 18;
      const label = `RPC ${connection.name || 'Unnamed'} (${connection.role})\nPeer: ${connection.peerRegionName || 'Region pending'}\n${connection.remoteCidrs.join('\n')}`;
      const width = Math.max(380, attachmentLabelLayout(label).width);
      nodes.push({ id: `rpc-${connection.id}`, kind: 'attachment', parentId: 'landingzone',
        label, x: leftX, y: bottom, width, height });
      if (leftX + width + PAD > lz.width) {
        lz.width = leftX + width + PAD;
        const tenancy = nodes.find((node) => node.id === 'tenancy')!;
        tenancy.width = lz.width + 2 * PAD;
        nodes.find((node) => node.id === 'region')!.width = tenancy.width + 2 * PAD;
      }
      edges.push({ id: `e-rpc-${connection.id}`, source: 'drg', target: `rpc-${connection.id}` });
      bottom += height + PAD;
    }
    const growth = bottom - start;
    for (const node of nodes.filter((node) => ['landingzone', 'tenancy', 'region'].includes(node.id))) node.height += growth;
  }

  if (showHub && (hybrid.length || Object.keys(model.hybridConnectivity?.customer_premises_equipments ?? {}).length)) {
    const drg = absoluteNodeRects(nodes).get('drg')!;
    const equipment = new Map<string, {
      id: string; name: string; address?: string; existing: boolean; connections: typeof vpns;
    }>();
    for (const [name, cpe] of Object.entries(model.hybridConnectivity?.customer_premises_equipments ?? {})) {
      const id = `hybrid-cpe-${name}`;
      equipment.set(id, { id, name, address: cpe.ip_address, existing: false, connections: [] });
    }
    for (const connection of vpns) {
      const config = model.hybridConnectivity!.ipsecs[connection.name];
      const id = vpnCpeNodeId(config);
      if (!equipment.has(id)) equipment.set(id, { id, name: config.cpe_key || config.cpe_id || 'CPE pending', existing: !config.cpe_key, connections: [] });
      equipment.get(id)!.connections.push(connection);
    }
    const entries = [...equipment.values()].sort((a, b) => Number(!a.connections.length) - Number(!b.connections.length)).map((cpe) => {
      const premises: NonNullable<DiagramNode['premises']> = {
        equipmentLabel: cpe.existing ? 'Existing CPE' : 'CPE', equipmentName: cpe.name,
        equipmentAddress: cpe.address, cidrs: [...new Set(cpe.connections.flatMap((connection) => connection.cidrs))],
        connectionCount: cpe.connections.length,
      };
      const connections = cpe.connections.map((connection) => {
        const config = model.hybridConnectivity!.ipsecs[connection.name];
        const tunnels = (['tunnel_1', 'tunnel_2'] as const).map((key) => {
          const tunnel = config.tunnels_management[key];
          return {
            label: `VPN ${connection.name} · Tunnel ${key === 'tunnel_1' ? 1 : 2}`,
            customerAddress: tunnel.routing === 'BGP' ? tunnel.bgp_session_info?.customer_interface_ip : undefined,
            oracleAddress: tunnel.routing === 'BGP' ? tunnel.bgp_session_info?.oracle_interface_ip : undefined,
          };
        });
        return { id: connection.id, tunnels };
      });
      const label = cpe.existing ? 'Existing CPE' : `CPE ${cpe.name}`;
      const linkWidth = Math.max(HYBRID_LINK_WIDTH, ...connections.flatMap((connection) => connection.tunnels.map((tunnel) => attachmentLabelLayout(tunnel.label).width)));
      return { id: cpe.id, label, premises, connections, linkWidth, ...premisesLayout(premises, label) };
    });
    const fcEntries = circuits.map((connection) => {
      const config = model.hybridConnectivity!.fast_connect_virtual_circuits[connection.name];
      const premises: NonNullable<DiagramNode['premises']> = {
        equipmentLabel: 'Customer router', equipmentName: config.customer_asn ? `ASN ${config.customer_asn}` : '', cidrs: connection.cidrs,
      };
      const circuit: NonNullable<DiagramNode['fastConnect']> = {
        provider: providerServicesForRegion(model.foundation.realm, model.foundation.region).find((service) => service.ocid === config.provider_service_id)?.label
          ?? (config.provider_service_id ? 'Provider service' : 'Direct cross-connect'),
        bandwidth: config.bandwidth_shape_name,
        mappings: Object.entries(config.cross_connect_mappings ?? {}).map(([name, mapping]) => ({
          name, customerAddress: mapping.customer_bgp_peering_ip, oracleAddress: mapping.oracle_bgp_peering_ip, vlan: mapping.vlan,
        })),
      };
      const label = `FastConnect ${connection.name}`;
      const layout = premisesLayout(premises, label);
      const height = fastConnectHeight(circuit);
      const width = Math.max(HYBRID_LINK_WIDTH, attachmentLabelLayout([label, circuit.provider,
        ...circuit.mappings.map((mapping) => `${mapping.name}${mapping.vlan != null ? ` · VLAN ${mapping.vlan}` : ''}`)].join('\n')).width);
      return { id: connection.id, label, premises, circuit, ...layout,
        height: Math.max(layout.height, layout.center - FASTCONNECT_LINE_Y + height + PAD), circuitHeight: height, circuitWidth: width };
    });
    let top = Math.max(PAD, drg.y + drg.height / 2 - (entries[0] ?? fcEntries[0]).center);
    const portCount = vpns.length * 2 + fcEntries.length;
    let portIndex = 0;
    entries.forEach((entry) => {
      const tunnelX = -entry.linkWidth - HYBRID_REGION_GAP;
      const premisesId = `${entry.id}:premises`;
      nodes.push({ id: premisesId, kind: 'premises', label: entry.label, premises: entry.premises,
        x: tunnelX - entry.width - HYBRID_EQUIPMENT_GAP, y: top, width: entry.width, height: entry.height });
      nodes.push({ id: entry.id, kind: 'vpn', label: entry.label, parentId: premisesId,
        x: entry.width / 2 - 33, y: entry.center - 33, width: 66, height: 66 });
      entry.connections.forEach((connection, connectionIndex) => {
        const center = top + entry.center + (connectionIndex - (entry.connections.length - 1) / 2) * VPN_PAIR_PITCH;
        connection.tunnels.forEach((tunnel, tunnelIndex) => {
          const id = `${connection.id}:tunnel-${tunnelIndex + 1}`;
          nodes.push({ id, kind: 'vpntunnel', label: tunnel.label, vpnTunnel: tunnel, x: tunnelX,
            y: center + (tunnelIndex ? 1 : -1) * (VPN_TUNNEL_HEIGHT / 2 + 8) - VPN_TUNNEL_HEIGHT / 2,
            width: entry.linkWidth, height: VPN_TUNNEL_HEIGHT });
          edges.push({ id: `e-${entry.id}-${id}`, source: entry.id, target: id,
            sourceSide: 'right', sourcePort: (connectionIndex * 2 + tunnelIndex + 1) / (entry.connections.length * 2 + 1), targetSide: 'left', targetPort: 0.5 });
          edges.push({ id: `e-${id}-drg`, source: id, target: 'drg',
            sourceSide: 'right', sourcePort: 0.5, targetSide: 'left', targetPort: ++portIndex / (portCount + 1) });
        });
      });
      top += entry.height + PAD;
    });
    fcEntries.forEach((entry, index) => {
      const circuitX = -entry.circuitWidth - HYBRID_REGION_GAP;
      const premisesId = `${entry.id}:premises`, routerId = `${entry.id}:router`;
      nodes.push({ id: premisesId, kind: 'premises', label: entry.label, premises: entry.premises,
        x: circuitX - entry.width - HYBRID_EQUIPMENT_GAP, y: top, width: entry.width, height: entry.height });
      nodes.push({ id: routerId, kind: 'customerrouter', label: `${entry.label} customer router`, parentId: premisesId,
        x: entry.width / 2 - 33, y: entry.center - 33, width: 66, height: 66 });
      nodes.push({ id: entry.id, kind: 'fastconnect', label: entry.label, fastConnect: entry.circuit, x: circuitX,
        y: top + entry.center - FASTCONNECT_LINE_Y, width: entry.circuitWidth, height: entry.circuitHeight });
      const port = FASTCONNECT_LINE_Y / entry.circuitHeight;
      edges.push({ id: `e-${routerId}-${entry.id}`, source: routerId, target: entry.id,
        sourceSide: 'right', sourcePort: 0.5, targetSide: 'left', targetPort: port });
      edges.push({ id: `e-${entry.id}-drg`, source: entry.id, target: 'drg', sourceSide: 'right', sourcePort: port,
        targetSide: 'left', targetPort: (vpns.length * 2 + index + 1) / (portCount + 1) });
      top += entry.height + PAD;
    });
  }

  // Resource ports stay on their owners independently of callout placement and table colour.
  if (showDots && allRouteTables.length > 0) {
    const rects = absoluteNodeRects(nodes);
    const lz = rects.get('landingzone')!;
    const DOT = 16;
    const ports = new Map<string, { dotId: string; x: number; y: number; side: 'left' | 'right' | 'top' | 'bottom' }[]>();
    for (const table of allRouteTables) {
      const lane = dotLane(table);
      const tablePorts: NonNullable<ReturnType<typeof ports.get>> = [];
      for (const [index, association] of table.associations.entries()) {
        const rect = rects.get(association.nodeId);
        if (!rect) continue;
        const connection = association.kind === 'drg-attachment' || association.kind === 'rpc-attachment'
          ? edges.find((edge) => edge.source === rect.id && edge.target === 'drg' || edge.source === 'drg' && edge.target === rect.id)
          : undefined;
        const physical = connection ? rects.get('drg')! : rect;
        const sourceAtDrg = connection?.source === 'drg';
        const external = !physical.node.parentId;
        const side = connection ? (sourceAtDrg ? connection.sourceSide : connection.targetSide) ?? 'left'
          : association.kind === 'vcn-ingress' ? 'bottom' : external ? 'right' : lane === 'left' ? 'left' : 'right';
        const fraction = connection ? (sourceAtDrg ? connection.sourcePort : connection.targetPort) ?? 0.5 : 0.5;
        let x = side === 'left' ? physical.x : side === 'right' ? physical.x + physical.width : physical.x + physical.width * fraction;
        let y = side === 'bottom' ? physical.y + physical.height : side === 'top' ? physical.y : physical.y + physical.height * fraction;
        if (association.kind === 'gateway') {
          x = rect.x + rect.width / 2 + (side === 'left' ? -17 : 17);
          y = rect.y + 17;
        }
        x -= lz.x; y -= lz.y;
        const dotId = index === 0 ? `dot-${table.id}` : `dot-${table.id}-${index}`;
        const dotSize = connection ? 8 : DOT;
        tablePorts.push({ dotId, x, y, side });
        nodes.push({
          id: dotId, kind: 'rtdot', label: '', parentId: external ? undefined : 'landingzone',
          rtDotTableId: table.id, rtDotOwnerId: association.nodeId, rtDotOpen: openSet.has(table.id), rtDotConfigured: table.rules.length > 0, rtDotTone: table.kind,
          ...(connection ? { rtDotPhysicalOwnerId: 'drg' } : {}),
          x: x - dotSize / 2 + (external ? lz.x : 0), y: y - dotSize / 2 + (external ? lz.y : 0), width: dotSize, height: dotSize,
        });
      }
      ports.set(table.id, tablePorts);
    }

    const columns: Record<TableLane, number> = {
      left: PAD, middle: hubRtColX, right: rightX + envCompW + RT_GAP, external: -RT_W - HYBRID_REGION_GAP,
    };
    const occupied: Record<TableLane, { y: number; height: number }[]> = { left: [], middle: [], right: [], external: [] };
    if (hybrid.length) {
      const drg = rects.get('drg')!;
      const tunnelYs = nodes.filter((node) => node.kind === 'vpntunnel' || node.kind === 'fastconnect')
        .map((node) => node.y + (node.kind === 'fastconnect' ? FASTCONNECT_LINE_Y : node.height / 2));
      const top = Math.min(drg.y, ...tunnelYs) - lz.y - PAD;
      const bottom = Math.max(drg.y + drg.height, ...tunnelYs) - lz.y + PAD;
      occupied.left.push({ y: top, height: bottom - top });
    }
    const items = openTables.map((table) => {
      const tablePorts = ports.get(table.id) ?? [];
      const missing = table.associations.filter((association) => !rects.has(association.nodeId));
      const diagnostic = missing.length ? `Diagram resources unavailable: ${missing.map((association) => association.nodeId).join(', ')}.`
        : !tablePorts.length ? `No diagram resource association for ${table.sourceKey}.` : '';
      const note = [table.note, diagnostic].filter(Boolean).join(' ');
      const height = routeTableLayout({ label: table.name, columns: table.columns, rowCount: table.rules.length, rows: table.rules, note, width: RT_W }).height;
      const ownerCenter = tablePorts.length ? (Math.min(...tablePorts.map((port) => port.y)) + Math.max(...tablePorts.map((port) => port.y))) / 2 : TITLE + PAD + height / 2;
      const lane = tableLane(table);
      const desired = lane === 'external'
        ? Math.max(...nodes.filter((node) => node.kind === 'vpntunnel' || node.kind === 'fastconnect').map((node) => node.y + node.height)) + 2 * PAD
        : ownerCenter - height / 2;
      const drgTable = tablePorts.length > 0 && tablePorts.every((port) => nodes.find((node) => node.id === port.dotId)?.rtDotPhysicalOwnerId === 'drg');
      return { table, tablePorts, note, height, desired, lane, ownerCenter, drgTable };
    }).sort((a, b) => a.desired - b.desired || a.table.sourceKey.localeCompare(b.table.sourceKey));
    const drgItems = items.filter((item) => item.drgTable).sort((a, b) => a.ownerCenter - b.ownerCenter || a.table.sourceKey.localeCompare(b.table.sourceKey));
    const drgBottom: Partial<Record<TableLane, number>> = {};
    let drgIndex = 0;
    for (const item of items) {
      const { table, tablePorts, note, height, desired, lane, drgTable } = item.drgTable ? drgItems[drgIndex++] : item;
      // Reversing table order relative to DRG ports forces their leaders to cross.
      const minimumY = Math.max(TITLE + PAD, drgTable ? drgBottom[lane] ?? 0 : 0);
      const slots = [Math.max(minimumY, desired), minimumY,
        ...occupied[lane].flatMap((box) => [box.y - height - RT_STACK_GAP, box.y + box.height + RT_STACK_GAP])];
      const y = slots.filter((candidate) => candidate >= minimumY && occupied[lane].every((box) =>
        candidate + height + RT_STACK_GAP <= box.y || candidate >= box.y + box.height + RT_STACK_GAP))
        .sort((a, b) => Math.abs(a - desired) - Math.abs(b - desired) || a - b)[0];
      occupied[lane].push({ y, height });
      if (drgTable) drgBottom[lane] = y + height + RT_STACK_GAP;
      nodes.push({
        id: table.id, kind: 'routetable', label: table.name, parentId: lane === 'external' ? undefined : 'landingzone',
        rtRows: table.rules.map((rule) => ({ id: rule.id, destination: rule.destination, targetType: rule.targetType, target: rule.target, routeType: rule.routeType, superseded: rule.superseded })),
        rtHighlight: [...new Set(rtHighlight.get(table.id) ?? [])].sort((a, b) => a - b),
        rtColumns: table.columns, rtNote: note || undefined, rtTone: table.kind,
        x: columns[lane], y, width: RT_W, height,
      });
      tablePorts.forEach((port, index) => {
        edges.push({
          id: index === 0 ? `e-${table.id}` : `e-${table.id}-${index}`,
          source: port.dotId, target: table.id,
          sourceSide: port.side, targetSide: lane === 'external' || lane === 'left' && port.x >= columns[lane] ? 'right' : 'left',
        });
      });
    }
    const tableBottom = Math.max(TITLE + PAD, ...[occupied.left, occupied.middle, occupied.right].flat().map((box) => box.y + box.height));

    // Grow the landing zone (and its wrappers) if a lane runs past it.
    const need = tableBottom + PAD;
    if (need > lz.height) {
      lz.node.height = need;
      const ten = rects.get('tenancy')!.node; ten.height = innerTop + need + PAD;
      const reg = rects.get('region')!.node; reg.height = innerTop + ten.height + PAD;
    }
  }

  // Wrapper-owned resources follow the final table lanes as well as the compartments.
  if (inventory) pushGeneratedResources(nodes, { ...inventory, groups: inventory.groups.filter((group) => outerResourceOwners.has(group.compartmentKey)) });

  // Animated flow path: ONE multi-waypoint edge per active flow. The shared
  // geometry router draws a continuous coloured line through every hop resource,
  // keeping each leg clear of unrelated leaf resources. Live SVG and Draw.io use
  // this same polyline, so neither renderer can independently reroute the flow.
  //
  // Positions are precomputed HERE (in the same pass that lays out the diagram,
  // route-table margins included) so the overlay never reads stale live node
  // positions — reading the React Flow store lagged a layout behind when a flow
  // opened the tables and shifted everything by the route-table margin.
  edges.splice(0, edges.length, ...routeStructuralEdges(nodes, edges));
  const positionedRects = absoluteNodeRects(nodes);
  for (const dot of nodes.filter((node) => node.rtDotPhysicalOwnerId === 'drg')) {
    const connection = edges.find((edge) => edge.source === dot.rtDotOwnerId && edge.target === 'drg'
      || edge.source === 'drg' && edge.target === dot.rtDotOwnerId);
    const endpoint = connection?.source === 'drg' ? connection.points?.[0] : connection?.points?.at(-1);
    if (!endpoint) continue;
    const parent = dot.parentId ? positionedRects.get(dot.parentId) : undefined;
    const x = endpoint.x - (parent?.x ?? 0) - dot.width / 2;
    const y = endpoint.y - (parent?.y ?? 0) - dot.height / 2;
    dot.x = x;
    dot.y = y;
    const side = connection!.source === 'drg' ? connection!.sourceSide : connection!.targetSide;
    for (const leader of edges.filter((edge) => edge.source === dot.id)) {
      leader.sourceSide = side;
    }
  }
  edges.splice(0, edges.length, ...tableAssociations(nodes, tableSourceAnchors(nodes, edges)));
  const absoluteRects = absoluteNodeRects(nodes);
  const routeDots = new Map(nodes.filter((node) => node.kind === 'rtdot')
    .map((node) => [`${node.rtDotTableId}\0${node.rtDotOwnerId}`, absoluteRects.get(node.id)!]));
  // The clean vertical channel between the hub compartment and the env column —
  // the same gutter the structural VCN→attachment links run in. Routing the long
  // hub↔spoke crossings through it keeps them off the compartments.
  const gutterX = 2 * PAD + leftX + leftColumnW + midMargin + gutter / 2;
  const nodeIds = new Set(nodes.map((n) => n.id));
  const seenGroup = new Set<string>();
  const flowErrors: string[] = [];
  const routeLocal = createLocalFlowRouter(nodes);
  for (const t of flowTraces) {
    const segs = t.segments;
    if (!segs.length || segs.some((segment) => !nodeIds.has(segment.from) || !nodeIds.has(segment.to))) continue;
    const base = t.id.split('#')[0].split(':').slice(0, 2).join(':');
    const waypoints = [segs[0].from, ...segs.map((s) => s.to)];
    // Keep endpoints and shared legs on their real resources. Artificially
    // shifting complete traces made packets float beside the subnet/DRG icons;
    // same-colour endpoint traces can safely merge on their common route.
    let geometry: ReturnType<typeof connectionFlowGeometry>;
    try {
      const anchors = new Map<number, FlowVisitAnchor>();
      for (const hop of t.hops) {
        if (anchors.has(hop.visitIndex)) throw new Error('Multiple routing steps refer to the same path occurrence.');
        const dot = hop.tableId ? routeDots.get(`${hop.tableId}\0${hop.tableOwner ?? hop.node}`) : undefined;
        const binding = hop.tableId ? allRouteTables.find((table) => table.id === hop.tableId)?.associations
          .find((association) => association.nodeId === (hop.tableOwner ?? hop.node)) : undefined;
        const rect = hop.tableId ? dot : absoluteRects.get(hop.node);
        if (!rect || hop.tableId && !binding) throw new Error(`No processing anchor is available for step ${hop.seq}.`);
        anchors.set(hop.visitIndex, {
          point: dot ? { x: dot.x + dot.width / 2, y: dot.y + dot.height / 2 } : flowAnchorPoint(rect),
          owner: dot?.node.rtDotPhysicalOwnerId ?? hop.tableOwner ?? hop.node,
          anchorId: rect.id,
          phase: binding?.kind === 'gateway' ? 'entry' : 'exit',
        });
      }
      geometry = connectionFlowGeometry(nodes, edges, waypoints, gutterX, anchors, routeLocal);
    } catch (error) {
      flowErrors.push(`${t.label}: ${error instanceof Error ? error.message : 'The flow path could not be resolved.'}`);
      continue;
    }
    const { points, visits } = geometry;
    if (points.length < 2) continue;
    // Numbered hop badges render once per flow group (the first endpoint) so they
    // don't stack at the shared hub nodes.
    const isPrimary = !seenGroup.has(base);
    seenGroup.add(base);
    const flow: DiagramEdge = {
      id: `flow-${t.id}`, source: waypoints[0], target: waypoints[waypoints.length - 1],
      animated: true, color: t.color, label: t.label, waypoints, points, visits, flowHops: t.hops, showHopMarkers: isPrimary,
    };
    if (!createFlowPlayback(flow).valid) {
      flowErrors.push(`${t.label}: the numbered stops do not match the flow path.`);
      continue;
    }
    edges.push(flow);
  }

  const environmentRoots = new Set(envs.map((env) => env.id));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const compartmentScope = (node: DiagramNode): 'shared' | 'environment' => {
    if (environmentRoots.has(node.id)) return 'environment';
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    return parent ? compartmentScope(parent) : 'shared';
  };
  for (const node of nodes) {
    if (node.kind === 'compartment' || node.kind === 'project') node.compartmentScope = compartmentScope(node);
  }

  // Containment is shown by nesting; routing adds VCN → attach → DRG edges.
  const lzX = absoluteNodeRects(nodes).get('landingzone')!.x;
  return withFlowFocus({ nodes, edges,
    tableColumns: [lzX + PAD, lzX + hubRtColX, lzX + rightX + envCompW + RT_GAP],
    display: { allFlows: opts.allFlows },
    ...(flowErrors.length ? { flowErrors } : {}) }, opts.focusFlow);
}

export function buildGraph(...args: Parameters<typeof buildGraphLayout>): DiagramModel {
  const graph = buildGraphLayout(...args);
  if (!graph.tableColumns) return graph;
  const nodes = optimizeTablePlacement(graph.nodes, graph.edges, graph.tableColumns);
  return { ...graph, nodes, edges: tableAssociations(nodes, graph.edges) };
}
