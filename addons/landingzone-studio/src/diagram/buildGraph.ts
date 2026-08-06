import type { DiagramEdge, DiagramModel, DiagramNode, DiagramOptions, LzModel } from '../model/types';
import { getHubKind } from '../services/hubKinds';
import { envNetworkDefaults } from '../model/defaults';
import { hostIpInSubnet } from '../services/cidr';
import { buildRouteTables } from '../services/routeTables';
import { buildFlowTraces } from '../services/flowTrace';
import { ocvsDefaultSubnets, platformInEnv, platformSubnetsForEnv, platformVcnForEnv } from '../services/platforms';
import { generatorNames } from '../services/generatorNaming';

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
 *               ├─ cmp-lz-platform (yellow, always present)
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
const COMP_GAP = 12;
const COL_GAP = 18;
const TITLE = 30;      // one-line container title strip
const VCN_TITLE = 46;  // VCN titles are two lines (name + CIDR)
const PAD = 16;
const SUB_W = 300;     // subnet box (two-line label, room for an icon + caption)
const SUB_H = 50;      // plain subnet row
const SUB_H_ICON = 124; // subnet with an icon + caption inside
const SUB_GAP = 12;
const VCN_PAD = 22;    // breathing room between subnets and the VCN border
const GW_W = 116;      // gateway icon + readable generated name
const GW_H = 74;
const GW_STRIP = 150;  // gateway rail inside the left side of each VCN
// The gateway node centres its icon, so half its width outside the VCN makes the
// icon centre sit exactly on the VCN's left boundary line.
const GW_X = -GW_W / 2;

const VCN_CONTENT_W = VCN_PAD * 2 + SUB_W;
const VCN_W = GW_STRIP + VCN_CONTENT_W;
const HUB_NET_W = PAD * 2 + VCN_W;
const NET_COMP_W = HUB_NET_W;
// Projects: a gray compartment to the right of each env network compartment,
// holding one block per project that applies to the environment.
const PROJ_COMP_W = 216;
const PROJ_GAP = 16;       // gap between the network and projects compartments
const PROJ_W = 184;        // a generated project-compartment name without clipping
const PROJ_H = 42;
const PROJ_GAP_V = 12;     // vertical gap between stacked project blocks
const ENV_COMP_W = PAD * 2 + NET_COMP_W + PROJ_GAP + PROJ_COMP_W;
// Platforms (step 4): a gray compartment to the right of the projects one,
// holding one VCN per platform that applies to the environment — each platform
// is network-bearing (a VCN with its own subnets), unlike the network-less
// project blocks. A shared-platform row sits in the left column (outside envs).
// Platform compartments sit directly under the network compartment in the same
// column, so they take its exact width and the VCNs line up edge to edge.
const PLAT_COMP_W = NET_COMP_W;
const PLAT_VCN_GAP = 16;   // vertical gap between stacked platform VCNs

// ---- DRG + VCN attachments. The DRG and ALL attachment pills cluster together
// inside cmp-network, below the hub VCN: the DRG on the left, the pills stacked
// to its right (one per VCN). Each VCN links to its pill, each pill to the DRG.
const DRG_W = 48;          // icon-only box — the "DRG" label is an overlay below it
const DRG_H = 48;
const DRG_LABEL_H = 18;    // the "DRG" caption hangs below the icon — reserve room for it
const ATTACH_W = 150;      // vcn-<env>-attach pill
const ATTACH_H = 26;
const ATTACH_GAP_V = 10;   // vertical gap between stacked attachment pills
const ATTACH_DRG_GAP = 26; // gap between the DRG and the attachment stack
const HUB_ATTACH_GAP = 18; // gap below the hub VCN before the DRG/attachment cluster
const ROUTE_GUTTER = 132;  // column gap (step 2+) — the channel the spoke links run up

// ---- route-table boxes (revealed by clicking a dot). Heights are generous so
// the ONTV 4-column layout (whose headers wrap to two lines) never clips a row.
const RT_W = 310;          // route-table box width
const RT_GAP = 26;         // gap between a VCN and its route-table column
const RT_HEADER = 26;      // coloured title strip (name + close ✕)
const RT_ROW = 18;         // one route row
const RT_NOTE = 20;        // optional banner line height
const RT_COLHEAD = 30;     // the Destination | Target Type … header row (two lines)
const RT_PAD = 10;
const RT_STACK_GAP = 16;   // vertical gap between stacked tables in a lane
const RT_LEFT_W = RT_W + RT_GAP + PAD;  // reserved left margin (gateway + DRG tables)
const RT_RIGHT_W = RT_W + RT_GAP + PAD; // reserved right margin (spoke tables)
const rtHeight = (rows: number, hasNote: boolean) => RT_HEADER + (hasNote ? RT_NOTE : 0) + RT_COLHEAD + rows * RT_ROW + RT_PAD;

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

/** Emit a VCN node + its subnet children; returns each subnet's y/height (relative to the VCN). */
function pushVcn(
  nodes: DiagramNode[],
  id: string,
  parentId: string,
  label: string,
  subnets: SubnetSpec[],
  x = PAD,
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
      x: GW_STRIP + VCN_PAD, y: sy, width: SUB_W, height,
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
export function buildGraph(model: LzModel, upToStep = Infinity, opts: DiagramOptions = {}): DiagramModel {
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
  const platforms = model.platforms ?? [];
  const sharedPlatforms = model.sharedPlatforms ?? [];
  const sharedInstances = showPlatforms ? sharedPlatforms.map((platform, index) => {
    const subnets: SubnetSpec[] = (platform.type === 'ocvs'
      ? ocvsDefaultSubnets(platform.vcnCidr)
      : platform.subnets).map((sn) => ({
        name: generatorNames.environmentSubnet(model.foundation.regionShortName, 'shared', `${platform.key}-${sn.name}`),
        cidr: sn.cidr,
      }));
    return {
      index,
      platform,
      subnets,
      vcnH: vcnHeight(subnets),
      vcnId: `shared-plat-vcn-${index}`,
    };
  }) : [];
  // The "Show endpoints" button shows/hides the dots; clicking a dot opens its
  // table. The route-table layer is a step-3 (spoke) concern.
  // Every selectable hub has its own derived route-table adapter.
  const supportsFlowTracing = model.network.hubKind === 'hub_a' || model.network.hubKind === 'hub_b' || model.network.hubKind === 'hub_c' || model.network.hubKind === 'hub_e';
  const allRouteTables = showSpokes && supportsFlowTracing ? buildRouteTables(model) : [];
  // Active flow traces (step 3, diagram-only). A flow walks the route tables, so
  // selecting one implies the endpoints + route-table layer: it auto-opens every
  // table the packet consults, highlights the matched rows, and draws an animated
  // coloured path along the hop sequence.
  const activeFlows = showSpokes && supportsFlowTracing ? (opts.activeFlows ?? []) : [];
  const flowTraces = activeFlows.length > 0 ? buildFlowTraces(model, activeFlows) : [];
  const flowActive = flowTraces.length > 0;
  const rtHighlight = new Map<string, number[]>();
  const flowTableIds = new Set<string>();
  const flowTableNodes = new Map<string, Set<string>>();
  const flowEndpointIds = new Set<string>();
  for (const t of flowTraces) {
    for (const h of t.highlights) {
      flowTableIds.add(h.tableId);
      rtHighlight.set(h.tableId, [...(rtHighlight.get(h.tableId) ?? []), ...h.rows]);
    }
    for (const hop of t.hops) {
      if (!hop.tableId) continue;
      const governed = flowTableNodes.get(hop.tableId) ?? new Set<string>();
      governed.add(hop.node);
      flowTableNodes.set(hop.tableId, governed);
    }
    for (const segment of t.segments) {
      if (/^cmp-env-\d+-vcn-sn-\d+$/.test(segment.from)) flowEndpointIds.add(segment.from);
      if (/^cmp-env-\d+-vcn-sn-\d+$/.test(segment.to)) flowEndpointIds.add(segment.to);
    }
  }
  const showDots = showSpokes && ((opts.showDots ?? false) || flowActive);
  // Manual endpoint mode shows all eligible endpoints. A flow adds only its
  // actual source/destination VMs so unrelated subnets do not become clutter.
  const showAllEndpoints = showSpokes && (opts.showEndpoints ?? false);
  // Flow selection identifies the relevant tables but does not force every one
  // open. The sidebar already explains the route; dots stay available for
  // on-demand inspection without shrinking the topology around many tables.
  const openSet = new Set<string>(opts.openTables ?? []);
  const openTables = showDots ? allRouteTables.filter((t) => openSet.has(t.id)) : [];
  const showMidRT = openTables.some((t) => t.kind === 'hub');
  const showLeftRT = openTables.some((t) => t.kind === 'gateway' || t.kind === 'drg');
  const showRightRT = openTables.some((t) => t.kind === 'spoke');
  const f = model.foundation;
  const region = f.region.trim();
  const regionTok = f.regionShortName.trim() || '<region>';

  // ---- hub network (left column), driven by the step 2 fields
  const hubSubnets = model.network.subnets.map((sn) => {
    const spec = decorateHubSubnet(generatorNames.hubSubnet(regionTok, sn.name), sn.cidr, regionTok);
    return showAllEndpoints ? withEndpoint(spec) : spec;
  });
  const hubVcnLabel = `${generatorNames.hubVcn(regionTok)}\n${model.network.hubVcnCidr}`;
  const hubVcnH = vcnHeight(hubSubnets);
  // cmp-network keeps its natural width whether or not a hub table is open — an
  // open hub table sits in a reserved lane OUTSIDE it (see midMargin below), the
  // same way spoke tables sit in a margin outside the env compartments.
  const netCompW = !showHub ? COMP_W : HUB_NET_W;
  // cmp-network holds the hub VCN AND, below it, the DRG + attachment pills. In
  // step 2 only the hub's own attachment is shown; the spoke attachments (one per
  // environment) join in step 3, and one per platform VCN in step 4.
  const platformVcnCount = showPlatforms
    ? model.environments.reduce((sum, e) => sum + platforms.filter((p) => platformInEnv(p, e.id)).length, 0)
    : 0;
  const numAttach = 1 + (showSpokes ? model.environments.length : 0) + platformVcnCount + sharedInstances.length;
  const stackH = numAttach * ATTACH_H + (numAttach - 1) * ATTACH_GAP_V;
  // The DRG icon is centred in the cluster; padding both sides by its caption
  // height keeps the "DRG" label clear of the compartment border (it otherwise
  // overflows when the cluster is short — e.g. step 2's single hub attachment).
  const clusterH = Math.max(DRG_H + 2 * DRG_LABEL_H, stackH);
  const sharedNetworkH = sharedInstances.length
    ? sharedInstances.reduce((height, instance) => height + instance.vcnH, 0) + sharedInstances.length * PLAT_VCN_GAP
    : 0;
  const netCompH = showHub
    ? TITLE + PAD + hubVcnH + sharedNetworkH + HUB_ATTACH_GAP + clusterH + PAD
    : COMP_H;
  const sharedChildrenH = sharedInstances.length
    ? TITLE + PAD + sharedInstances.length * PROJ_H + (sharedInstances.length - 1) * PROJ_GAP_V + PAD
    : COMP_H;
  // The shared platform compartment exists from Foundation onward.
  const leftH = netCompH + COMP_GAP + COMP_H + COMP_GAP + sharedChildrenH;

  // ---- environments (right column), stored per-environment spoke networks
  const envs = model.environments.map((e, i) => {
    const name = e.name.trim() || `env${i + 1}`;
    // Stale in-memory records may predate Environment.network — fall back to defaults.
    const net = e.network ?? envNetworkDefaults(i);
    const subnets: SubnetSpec[] = net.subnets.map((sn, subnetIndex) => {
      const spec: SubnetSpec = { name: generatorNames.environmentSubnet(regionTok, name, sn.name), cidr: sn.cidr };
      const nodeId = `cmp-env-${i}-vcn-sn-${subnetIndex}`;
      return showAllEndpoints || flowEndpointIds.has(nodeId) ? withEndpoint(spec, name) : spec;
    });
    const vcnH = vcnHeight(subnets);
    // Projects that land in this environment ('all' or an explicit list).
    const projectNames = showSpokes
      ? model.projects
          .filter((p) => p.environments === 'all' || (Array.isArray(p.environments) && p.environments.includes(e.id)))
          .map((p) => p.name.trim())
          .filter(Boolean)
      : [];
    const projStackH = projectNames.length > 0
      ? projectNames.length * PROJ_H + (projectNames.length - 1) * PROJ_GAP_V
      : 0;
    const projCompH = TITLE + PAD + projStackH + PAD;
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
    const netH = TITLE + PAD + vcnH + (platformInstances.length ? PLAT_VCN_GAP + platStackH : 0) + PAD;
    const platCompH = platformInstances.length > 0
      ? TITLE + PAD + platformInstances.length * PROJ_H + (platformInstances.length - 1) * PROJ_GAP_V + PAD
      : COMP_H;
    const hasPlatforms = platformInstances.length > 0;
    const leftColH = netH + COMP_GAP + platCompH;
    return {
      id: `cmp-env-${i}`,
      name,
      label: generatorNames.environmentCompartment(name),
      secure: e.securityZone,
      netLabel: generatorNames.environmentChildCompartment(name, 'network'),
      vcnLabel: `${generatorNames.environmentVcn(regionTok, name)}\n${net.vcnCidr}`,
      subnets,
      vcnH,
      netH,
      sgwName: generatorNames.environmentGateway(regionTok, name, 'sgw'),
      attachName: generatorNames.environmentAttachment(regionTok, name),
      projectNames,
      projCompH,
      platformInstances,
      platCompH,
      hasPlatforms,
      // The env compartment wraps whichever is taller: the left column (network +
      // any platforms stacked below it) or the projects column.
      compH: showSpokes ? wrapHeight(Math.max(leftColH, projCompH)) : COMP_H,
    };
  });
  // The env column width is unchanged by platforms — they stack under the network
  // compartment in the left column, they don't add a third column.
  const envCompW = showSpokes ? ENV_COMP_W : COMP_W;
  const rightH = envs.length > 0
    ? envs.reduce((sum, env) => sum + env.compH, 0) + (envs.length - 1) * COMP_GAP
    : 0;

  // ---- outer containers, innermost outward
  const contentH = Math.max(leftH, rightH);
  const innerTop = TITLE + PAD;
  // Centre the shorter column against the taller one so neither hugs the top.
  const leftOffset = (contentH - leftH) / 2;
  const rightOffset = (contentH - rightH) / 2;

  // Step 2+ widens the column gap into a routing gutter that holds the spoke
  // attachment pills, so the DRG links travel a clear channel.
  const gutter = showSpokes ? ROUTE_GUTTER : COL_GAP;
  // Route tables reserve margins so no compartment ever has to grow: gateway + DRG
  // tables on the left, hub subnet tables in a lane just right of cmp-network, and
  // spoke tables on the far right. Opening a table shifts everything outward.
  const leftMargin = showLeftRT ? RT_LEFT_W : 0;
  const rightMargin = showRightRT ? RT_RIGHT_W : 0;
  const midMargin = showMidRT ? RT_GAP + RT_W + PAD : 0;
  const leftX = PAD + leftMargin;
  const hubRtColX = leftX + netCompW + RT_GAP; // hub table column — outside cmp-network
  const rightX = leftX + netCompW + midMargin + gutter;
  const lzWidth = rightX + envCompW + PAD + rightMargin;
  const lzHeight = innerTop + contentH + PAD;

  const tenWidth = PAD * 2 + lzWidth;
  const tenHeight = innerTop + lzHeight + PAD;

  const regWidth = PAD * 2 + tenWidth;
  const regHeight = innerTop + tenHeight + PAD;

  const nodes: DiagramNode[] = [
    { id: 'region', kind: 'region', label: region ? `OCI Region · ${region}` : 'OCI Region', x: 0, y: 0, width: regWidth, height: regHeight },
    { id: 'tenancy', kind: 'tenancy', label: 'OCI Tenancy', parentId: 'region', x: PAD, y: innerTop, width: tenWidth, height: tenHeight },
    { id: 'landingzone', kind: 'landingzone', secure: true, container: true, label: generatorNames.landingZone, parentId: 'tenancy', x: PAD, y: innerTop, width: lzWidth, height: lzHeight },
  ];
  const edges: DiagramEdge[] = [];

  // network compartment › hub VCN › gateways + hub subnets (step 2+, implemented hub kinds only)
  nodes.push({ id: 'cmp-network', kind: 'compartment', tone: 'yellow', secure: true, container: showHub || undefined, label: generatorNames.networkCompartment, parentId: 'landingzone', x: leftX, y: innerTop + leftOffset, width: netCompW, height: netCompH });
  if (showHub) {
    const placed = pushVcn(nodes, 'hub-vcn', 'cmp-network', hubVcnLabel, hubSubnets);
    // Gateways use the rail inside the hub VCN: IGW by the first subnet,
    // NAT by the internal firewall subnet, SGW by the last subnet.
    const centerOf = (i: number) => placed[i].y + placed[i].height / 2;
    const natIndex = hubSubnets.findIndex((sn) => sn.name.endsWith('-fw-int'));
    const anchors = placed.length > 0
      ? [centerOf(0), centerOf(natIndex >= 0 ? natIndex : Math.floor(placed.length / 2)), centerOf(placed.length - 1)]
      : [hubVcnH * 0.2, hubVcnH * 0.5, hubVcnH * 0.8];
    const gateways = [
      { id: 'gw-igw', icon: 'igw' as const, label: generatorNames.hubGateway(regionTok, 'igw') },
      { id: 'gw-natgw', icon: 'natgw' as const, label: generatorNames.hubGateway(regionTok, 'ngw') },
      { id: 'gw-sgw', icon: 'sgw' as const, label: generatorNames.hubGateway(regionTok, 'sgw') },
    ];
    gateways.forEach((gw, i) => {
      const y = Math.max(VCN_TITLE + 2, Math.min(anchors[i] - GW_H / 2, hubVcnH - GW_H - 2));
      nodes.push({ id: gw.id, kind: 'gateway', icon: gw.icon, label: gw.label, parentId: 'hub-vcn', x: GW_X, y, width: GW_W, height: GW_H });
    });

    // DRG + attachment cluster, centred horizontally in cmp-network below the hub
    // VCN: DRG on the left, the pills stacked to its right (hub first, then envs).
    let sharedY = TITLE + PAD + hubVcnH + PLAT_VCN_GAP;
    sharedInstances.forEach((instance) => {
      const label = `${generatorNames.sharedPlatformVcn(regionTok, instance.platform.key)}\n${instance.platform.vcnCidr}`;
      const placed = pushVcn(nodes, instance.vcnId, 'cmp-network', label, instance.subnets, PAD, sharedY);
      const firstAnchor = placed[0] ? placed[0].y + placed[0].height / 2 : VCN_TITLE + PAD;
      const last = placed[placed.length - 1];
      const lastAnchor = last ? last.y + last.height / 2 : firstAnchor;
      nodes.push({
        id: `shared-plat-sgw-${instance.index}`, kind: 'gateway', icon: 'sgw',
        label: generatorNames.sharedPlatformGateway(regionTok, instance.platform.key, 'sgw'), parentId: instance.vcnId,
        x: GW_X, y: Math.min(lastAnchor - GW_H / 2, instance.vcnH - GW_H - 2), width: GW_W, height: GW_H,
      });
      if (model.network.hubKind === 'hub_e' && instance.platform.type !== 'ocvs') {
        nodes.push({
          id: `shared-plat-natgw-${instance.index}`, kind: 'gateway', icon: 'natgw',
          label: generatorNames.sharedPlatformGateway(regionTok, instance.platform.key, 'ngw'), parentId: instance.vcnId,
          x: GW_X, y: Math.max(VCN_TITLE + 2, firstAnchor - GW_H / 2), width: GW_W, height: GW_H,
        });
      }
      sharedY += instance.vcnH + PLAT_VCN_GAP;
    });
    const clusterTop = TITLE + PAD + hubVcnH + sharedNetworkH + HUB_ATTACH_GAP;
    const groupW = DRG_W + ATTACH_DRG_GAP + ATTACH_W;
    const groupLeft = PAD + (VCN_W - groupW) / 2; // centred under the hub VCN
    const drgX = groupLeft;
    const stackX = groupLeft + DRG_W + ATTACH_DRG_GAP;
    const stackTop = clusterTop + (clusterH - stackH) / 2;
    nodes.push({ id: 'drg', kind: 'drg', label: generatorNames.hubDrg(regionTok), parentId: 'cmp-network', x: drgX, y: clusterTop + (clusterH - DRG_H) / 2, width: DRG_W, height: DRG_H });

    // Gutter-routed attachments: one per spoke VCN (step 3) and one per platform
    // VCN (step 4). Grouped by environment (a spoke then its platforms) so the
    // pills sit near their VCNs in the stack.
    const gutterItems: { id: string; label: string; vcn: string }[] = [];
    if (showSpokes) {
      for (const env of envs) {
        gutterItems.push({ id: `attach-${env.id}`, label: env.attachName, vcn: `${env.id}-vcn` });
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
    // Absolute x of the gutter between cmp-network and the env column. The spoke
    // links pin their vertical run here so it stays in the white channel even when
    // an open hub route-table widens cmp-network (otherwise the bend, which floats
    // at the link midpoint, drifts onto the yellow / over the open table).
    // landingzone sits two PADs deep (region 0 → tenancy PAD → landing zone PAD);
    // the gutter starts past cmp-network AND any open hub-table lane (midMargin).
    const gutterCenterX = 2 * PAD + leftX + netCompW + midMargin + gutter / 2;
    // Stagger every gutter link's vertical run around the gutter centre so the
    // parallel spoke + platform links never overlap. Narrow the stagger as the
    // count grows so the fan stays inside the gutter.
    const gutterMid = (gutterItems.length - 1) / 2;
    const gutterStep = Math.min(18, (gutter * 0.55) / Math.max(1, gutterItems.length));
    attachList.forEach((a, i) => {
      nodes.push({ id: a.id, kind: 'attachment', label: a.label, parentId: 'cmp-network', x: stackX, y: stackTop + i * (ATTACH_H + ATTACH_GAP_V), width: ATTACH_W, height: ATTACH_H });
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

  // security compartment (plain row under the network compartment)
  nodes.push({ id: 'cmp-security', kind: 'compartment', tone: 'yellow', label: generatorNames.securityCompartment, parentId: 'landingzone', x: leftX, y: innerTop + leftOffset + netCompH + COMP_GAP, width: netCompW, height: COMP_H });

  // The shared platform root is generator-owned and always present. Optional
  // shared platform child compartments appear here; their VCNs live above in
  // cmp-lz-network.
  nodes.push({
    id: 'cmp-platform', kind: 'compartment', tone: 'yellow', container: sharedInstances.length > 0 || undefined,
    label: generatorNames.platformCompartment, parentId: 'landingzone',
    x: leftX, y: innerTop + leftOffset + netCompH + COMP_GAP + COMP_H + COMP_GAP,
    width: netCompW, height: sharedChildrenH,
  });
  sharedInstances.forEach((instance, index) => {
    nodes.push({
      id: `cmp-shared-platform-${index}`, kind: 'compartment', tone: 'gray',
      label: generatorNames.sharedPlatformCompartment(instance.platform.key), parentId: 'cmp-platform',
      x: PAD, y: TITLE + PAD + index * (PROJ_H + PROJ_GAP_V), width: netCompW - 2 * PAD, height: PROJ_H,
    });
  });

  // environment compartments › env network compartment › env VCN › its subnets (step 2+)
  let envY = innerTop + rightOffset;
  envs.forEach((env) => {
    const compTop = envY;
    nodes.push({ id: env.id, kind: 'compartment', tone: 'green', secure: env.secure, container: showSpokes || undefined, label: env.label, parentId: 'landingzone', x: rightX, y: compTop, width: envCompW, height: env.compH });
    envY = compTop + env.compH + COMP_GAP;
    if (!showSpokes) return;
    nodes.push({ id: `${env.id}-network`, kind: 'compartment', tone: 'yellow', container: true, label: env.netLabel, parentId: env.id, x: PAD, y: TITLE + PAD, width: NET_COMP_W, height: env.netH });
    const placed = pushVcn(nodes, `${env.id}-vcn`, `${env.id}-network`, env.vcnLabel, env.subnets);
    let platformY = TITLE + PAD + env.vcnH + PLAT_VCN_GAP;
    env.platformInstances.forEach((pl, k) => {
      const platformVcnId = `${env.id}-plat-${k}`;
      const platformPlaced = pushVcn(nodes, platformVcnId, `${env.id}-network`, pl.vcnLabel, pl.subnetSpecs, PAD, platformY);
      const platformFirstAnchor = platformPlaced[0]
        ? platformPlaced[0].y + platformPlaced[0].height / 2
        : VCN_TITLE + PAD;
      const platformLast = platformPlaced[platformPlaced.length - 1];
      const platformLastAnchor = platformLast
        ? platformLast.y + platformLast.height / 2
        : platformFirstAnchor;
      nodes.push({
        id: `${platformVcnId}-sgw`, kind: 'gateway', icon: 'sgw',
        label: generatorNames.environmentPlatformGateway(regionTok, env.name, pl.name, 'sgw'),
        parentId: platformVcnId, x: GW_X,
        y: Math.min(platformLastAnchor - GW_H / 2, pl.vcnH - GW_H - 2), width: GW_W, height: GW_H,
      });
      if (model.network.hubKind === 'hub_e' && pl.type !== 'ocvs') {
        nodes.push({
          id: `${platformVcnId}-natgw`, kind: 'gateway', icon: 'natgw',
          label: generatorNames.environmentPlatformGateway(regionTok, env.name, pl.name, 'ngw'),
          parentId: platformVcnId, x: GW_X,
          y: Math.max(VCN_TITLE + 2, platformFirstAnchor - GW_H / 2), width: GW_W, height: GW_H,
        });
      }
      platformY += pl.vcnH + PLAT_VCN_GAP;
    });
    // Service Gateway sits in the VCN's gateway rail, level with the last subnet.
    const anchor = placed.length > 0
      ? placed[placed.length - 1].y + placed[placed.length - 1].height / 2
      : env.vcnH * 0.7;
    const sgwY = Math.max(VCN_TITLE + 2, Math.min(anchor - GW_H / 2, env.vcnH - GW_H - 2));
    nodes.push({ id: `${env.id}-sgw`, kind: 'gateway', icon: 'sgw', label: env.sgwName, parentId: `${env.id}-vcn`, x: GW_X, y: sgwY, width: GW_W, height: GW_H });
    // Hub E gives every spoke its own NAT gateway, so internet egress stays
    // local rather than being hair-pinned through a hub firewall.
    if (model.network.hubKind === 'hub_e') {
      nodes.push({
        id: `${env.id}-natgw`, kind: 'gateway', icon: 'natgw', label: generatorNames.environmentGateway(regionTok, env.name, 'ngw'), parentId: `${env.id}-vcn`,
        x: GW_X, y: Math.max(VCN_TITLE + 2, (placed[0]?.y ?? VCN_TITLE) - 12), width: GW_W, height: GW_H,
      });
    }

    // projects compartment (gray) to the right of the network compartment, with
    // one block per project that applies to this environment.
    nodes.push({
      id: `${env.id}-projects`, kind: 'compartment', tone: 'gray', container: true,
      label: generatorNames.environmentChildCompartment(env.name, 'projects'), parentId: env.id,
      x: PAD + NET_COMP_W + PROJ_GAP, y: TITLE + PAD, width: PROJ_COMP_W, height: env.projCompH,
    });
    env.projectNames.forEach((pname, k) => {
      nodes.push({
        id: `${env.id}-proj-${k}`, kind: 'project', label: generatorNames.environmentProjectCompartment(env.name, pname), parentId: `${env.id}-projects`,
        x: (PROJ_COMP_W - PROJ_W) / 2, y: TITLE + PAD + k * (PROJ_H + PROJ_GAP_V), width: PROJ_W, height: PROJ_H,
      });
    });

    nodes.push({
      id: `${env.id}-platforms`, kind: 'compartment', tone: 'gray', container: env.hasPlatforms || undefined,
      label: generatorNames.environmentChildCompartment(env.name, 'platform'), parentId: env.id,
      x: PAD, y: TITLE + PAD + env.netH + COMP_GAP, width: PLAT_COMP_W, height: env.platCompH,
    });
    env.platformInstances.forEach((pl, k) => {
      nodes.push({
        id: `${env.id}-platform-comp-${k}`, kind: 'compartment', tone: 'gray',
        label: generatorNames.environmentPlatformCompartment(env.name, pl.name), parentId: `${env.id}-platforms`,
        x: PAD, y: TITLE + PAD + k * (PROJ_H + PROJ_GAP_V), width: PLAT_COMP_W - 2 * PAD, height: PROJ_H,
      });
    });
  });

  // Route-table dots + opened tables. Every table gets a small clickable dot on
  // its element (subnet / gateway / attachment / DRG); clicking the dot opens the
  // table and a line runs from the dot to it. Opened tables sit in three lanes:
  // hub subnet tables in cmp-network's right column, gateway + DRG tables in the
  // left margin, spoke tables in the right margin — each stacked to avoid overlap.
  if (showDots && allRouteTables.length > 0) {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const abs = (id: string): { x: number; y: number; w: number; h: number } | null => {
      const cur = byId.get(id);
      if (!cur) return null;
      let x = cur.x, y = cur.y, p = cur.parentId;
      while (p && p !== 'landingzone') {
        const pn = byId.get(p);
        if (!pn) break;
        x += pn.x; y += pn.y; p = pn.parentId;
      }
      return { x, y, w: cur.width, h: cur.height };
    };
    const DOT = 16;
    const onLeft = (rt: typeof allRouteTables[number]) => rt.kind === 'gateway' || rt.kind === 'drg';

    // A dot per table, on the edge of its element facing the table; stacked when
    // several tables share an element (e.g. the DRG's two tables).
    const dotTables = flowActive
      ? allRouteTables.filter((table) => flowTableIds.has(table.id) || openSet.has(table.id))
      : allRouteTables;
    const byEl = new Map<string, { rt: typeof allRouteTables[number]; dotId: string }[]>();
    for (const rt of dotTables) {
      const attachmentPoints = [rt.attachTo, ...(rt.attachExtra ?? [])];
      const visiblePoints = flowActive && flowTableIds.has(rt.id) && !openSet.has(rt.id)
        ? attachmentPoints.filter((elementId) => flowTableNodes.get(rt.id)?.has(elementId))
        : attachmentPoints;
      visiblePoints.forEach((elementId, index) => {
        const dotId = index === 0 ? `dot-${rt.id}` : `dot-${rt.id}-${index}`;
        byEl.set(elementId, [...(byEl.get(elementId) ?? []), { rt, dotId }]);
      });
    }
    for (const [elId, entries] of byEl) {
      const a = abs(elId);
      if (!a) continue;
      entries.forEach(({ rt, dotId }, k) => {
        const cx = onLeft(rt) ? a.x : a.x + a.w;
        const cy = a.y + a.h / 2 + (k - (entries.length - 1) / 2) * (DOT + 4);
        nodes.push({
          id: dotId, kind: 'rtdot', label: '', parentId: 'landingzone',
          rtDotTableId: rt.id, rtDotOpen: openSet.has(rt.id), rtDotConfigured: rt.rules.length > 0, rtDotTone: rt.kind,
          x: cx - DOT / 2, y: cy - DOT / 2, width: DOT, height: DOT,
        });
      });
    }

    // Stack opened tables in their lane and wire each from its dot.
    const placeLane = (rts: typeof allRouteTables, colX: number, side: 'left' | 'right'): number => {
      const items = rts
        .map((rt) => ({ rt, a: abs(rt.attachTo) }))
        .filter((it): it is { rt: typeof rts[number]; a: { x: number; y: number; w: number; h: number } } => it.a !== null)
        .sort((p, q) => p.a.y - q.a.y);
      let prevBottom = -Infinity;
      for (const { rt, a } of items) {
        // A flow-opened table shows ONLY the rows the active flow(s) actually use
        // (the route taken) — more selected flows → more rows. A manually-opened
        // table (no flow on it) still shows the full rule set.
        const used = rtHighlight.get(rt.id);
        // Dedupe: many endpoints/flows can hit the SAME row — show it once.
        const disp = flowActive && flowTableIds.has(rt.id) && used && used.length
          ? [...new Set(used)].sort((x, y2) => x - y2).map((i) => rt.rules[i])
          : rt.rules;
        const h = rtHeight(disp.length, !!rt.note);
        const y = Math.max(a.y, prevBottom + RT_STACK_GAP);
        prevBottom = y + h;
        nodes.push({
          id: rt.id, kind: 'routetable', label: rt.name, parentId: 'landingzone',
          rtRows: disp.map((r) => ({ destination: r.destination, targetType: r.targetType, target: r.target, routeType: r.routeType })),
          rtColumns: rt.columns, rtNote: rt.note, rtTone: rt.kind,
          x: colX, y, width: RT_W, height: h,
        });
        edges.push({
          id: `e-${rt.id}`, source: `dot-${rt.id}`, target: rt.id,
          sourceSide: side === 'left' ? 'left' : 'right', targetSide: side === 'left' ? 'right' : 'left',
        });
      }
      return prevBottom;
    };

    const midBottom = placeLane(openTables.filter((rt) => rt.kind === 'hub'), hubRtColX, 'right');
    const leftBottom = placeLane(openTables.filter(onLeft), PAD, 'left');
    const rightBottom = placeLane(openTables.filter((rt) => rt.kind === 'spoke'), rightX + envCompW + RT_GAP, 'right');

    // Grow the landing zone (and its wrappers) if a lane runs past it.
    const need = Math.max(midBottom, leftBottom, rightBottom) + PAD;
    if (need > lzHeight) {
      const lz = byId.get('landingzone')!; lz.height = need;
      const ten = byId.get('tenancy')!; ten.height = innerTop + need + PAD;
      const reg = byId.get('region')!; reg.height = innerTop + ten.height + PAD;
    }
  }

  // Animated flow path: ONE multi-waypoint edge per active flow. The renderer
  // draws a continuous coloured line through every hop node with a single moving
  // packet (ONTV-style) and numbered hop badges; the .drawio exporter expands it
  // back into per-segment animated cells.
  //
  // Positions are precomputed HERE (in the same pass that lays out the diagram,
  // route-table margins included) so the overlay never reads stale live node
  // positions — reading the React Flow store lagged a layout behind when a flow
  // opened the tables and shifted everything by the route-table margin.
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const absRect = (id: string): { x: number; y: number; w: number; h: number; cx: number; cy: number } | null => {
    const cur = nodeById.get(id);
    if (!cur) return null;
    let x = cur.x, y = cur.y;
    let p = cur.parentId;
    while (p) {
      const pn = nodeById.get(p);
      if (!pn) break;
      x += pn.x; y += pn.y; p = pn.parentId;
    }
    return { x, y, w: cur.width, h: cur.height, cx: x + cur.width / 2, cy: y + cur.height / 2 };
  };
  const absCenter = (id: string) => {
    const r = absRect(id);
    return r ? { x: r.cx, y: r.cy } : null;
  };
  // The clean vertical channel between the hub compartment and the env column —
  // the same gutter the structural VCN→attachment links run in. Routing the long
  // hub↔spoke crossings through it keeps them off the compartments.
  const gutterX = 2 * PAD + leftX + netCompW + midMargin + gutter / 2;
  // Orthogonal route through the waypoint nodes: straight elbows, with any segment
  // that crosses the gutter pinned to run vertically inside it.
  const routeFlow = (ids: string[]): { x: number; y: number }[] => {
    const rects = ids.map(absRect).filter((r): r is NonNullable<typeof r> => r !== null);
    if (rects.length < 2) return [];
    const verts: { x: number; y: number }[] = [{ x: rects[0].cx, y: rects[0].cy }];
    const push = (p: { x: number; y: number }) => {
      const last = verts[verts.length - 1];
      if (last.x !== p.x || last.y !== p.y) verts.push(p);
    };
    for (let i = 1; i < rects.length; i++) {
      const a = verts[verts.length - 1];
      const b = rects[i];
      const crosses = (a.x - gutterX) * (b.cx - gutterX) < 0;
      if (crosses) {
        push({ x: gutterX, y: a.y });
        push({ x: gutterX, y: b.cy });
        push({ x: b.cx, y: b.cy });
      } else if (Math.abs(b.cx - a.x) >= Math.abs(b.cy - a.y)) {
        push({ x: b.cx, y: a.y });
        push({ x: b.cx, y: b.cy });
      } else {
        push({ x: a.x, y: b.cy });
        push({ x: b.cx, y: b.cy });
      }
    }
    return verts;
  };
  const nodeIds = new Set(nodes.map((n) => n.id));
  const seenGroup = new Set<string>();
  for (const t of flowTraces) {
    const segs = t.segments.filter((s) => nodeIds.has(s.from) && nodeIds.has(s.to));
    if (segs.length === 0) continue;
    const base = t.id.split('#')[0];
    const waypoints = [segs[0].from, ...segs.map((s) => s.to)];
    // Keep endpoints and shared legs on their real resources. Artificially
    // shifting complete traces made packets float beside the subnet/DRG icons;
    // same-colour endpoint traces can safely merge on their common route.
    const points = routeFlow(waypoints);
    if (points.length < 2) continue;
    // Numbered hop badges render once per flow group (the first endpoint) so they
    // don't stack at the shared hub nodes.
    const isPrimary = !seenGroup.has(base);
    seenGroup.add(base);
    const badges = isPrimary
      ? t.hops
          .map((h) => ({ h, c: absCenter(h.node) }))
          .filter((b): b is { h: typeof t.hops[number]; c: { x: number; y: number } } => b.c !== null)
          .map(({ h, c }) => ({ node: h.node, seq: h.seq, ...c }))
      : [];
    edges.push({
      id: `flow-${t.id}`, source: waypoints[0], target: waypoints[waypoints.length - 1],
      animated: true, color: t.color, label: t.label, waypoints, points, badges,
    });
  }

  // Containment is shown by nesting; routing adds VCN → attach → DRG edges.
  return { nodes, edges };
}
