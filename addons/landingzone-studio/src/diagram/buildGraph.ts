import type { DiagramEdge, DiagramModel, DiagramNode, DiagramOptions, LzModel } from '../model/types';
import { getHubKind, resolveHubName } from '../services/hubKinds';
import { envNetworkDefaults, envRoutingDefaults, hubRoutingDefaults } from '../model/defaults';
import { hostIpInSubnet } from '../services/cidr';
import { buildRouteTables } from '../services/routeTables';
import { buildFlowTraces } from '../services/flowTrace';
import { platformInEnv, platformSubnetsForEnv, platformVcnForEnv } from '../services/platforms';

/**
 * Pure: canonical LzModel → renderer-agnostic DiagramModel.
 *
 * Containment hierarchy (each nested inside the previous):
 *   OCI Region
 *     └─ OCI Tenancy / Operating Entity      (named by presentation.customer)
 *          └─ landing zone container         (named by presentation.landingZone)
 *               ├─ cmp-<lze>-network  (yellow)
 *               │    ├─ hub VCN                  (step 2: kind, name, CIDR)
 *               │    │    └─ hub subnets         (step 2 subnet table)
 *               │    └─ gateways (IGW / NAT / SGW) on the VCN's left border
 *               ├─ cmp-<lze>-security (yellow)
 *               └─ cmp-<lze>-<env>   (green)     one per environment
 *                    └─ cmp-<lze>-<env>-network  (yellow)
 *                         └─ vcn-<region>-<env>-projects
 *                              └─ 4 fixed subnets: web / app / db / infra
 *
 * Hub subnets matching the hub_a roles get an icon + caption: *-fw-dmz and
 * *-fw-int show the OCI Network Firewall (caption nfw-<region>-hub-dmz/-int,
 * region from the Foundation step), *-lb shows the Load Balancer.
 *
 * The per-environment spoke network (VCN CIDR + subnets) lives on each
 * Environment in the model — seeded with defaults (10.0.<8·(i+1)>.0/21,
 * web/app/db/infra /24s) and adjustable in step 2.
 *
 * Child x/y are relative to the immediate parent (parentId). Both the React
 * Flow renderer and the .drawio exporter consume this, so screen and export
 * agree. presentation.customer / presentation.landingZone are diagram-only.
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
const GW_W = 66;       // gateway icon + two-line label
const GW_H = 64;
const GW_STRIP = 76;   // hub VCN x-inset — the strip the gateways live in

const VCN_W = VCN_PAD * 2 + SUB_W;
const HUB_NET_W = GW_STRIP + VCN_W + PAD; // hub network compartment (gateway strip left)
const NET_COMP_W = HUB_NET_W;             // env network compartment — same strip, for its Service Gateway
// Projects: a gray compartment to the right of each env network compartment,
// holding one block per project that applies to the environment.
const PROJ_COMP_W = 156;
const PROJ_GAP = 16;       // gap between the network and projects compartments
const PROJ_W = 116;        // a single project block
const PROJ_H = 34;
const PROJ_GAP_V = 12;     // vertical gap between stacked project blocks
const ENV_COMP_W = PAD * 2 + NET_COMP_W + PROJ_GAP + PROJ_COMP_W;
// Platforms (step 4): a gray compartment to the right of the projects one,
// holding one VCN per platform that applies to the environment — each platform
// is network-bearing (a VCN with its own subnets), unlike the network-less
// project blocks. A shared-platform row sits in the left column (outside envs).
// Platform compartments sit directly under the network compartment in the same
// column, so they take its exact width and inset their VCN by the same gateway
// strip — the two VCNs then line up edge to edge. The strip is empty here: a
// platform VCN has no Service Gateway.
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
      x: VCN_PAD, y: sy, width: SUB_W, height,
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
function decorateHubSubnet(name: string, cidr: string, regionTok: string, fwIps: { dmz: string; int: string }): SubnetSpec {
  if (name.endsWith('-fw-dmz')) {
    return { name, cidr, icon: 'firewall', caption: `nfw-${regionTok}-hub-dmz`, captionTone: 'green', ipNote: fwIps.dmz.trim() || hostIpInSubnet(cidr), isPublic: true };
  }
  if (name.endsWith('-lb')) {
    return { name, cidr, icon: 'lb', caption: 'Load Balancer', captionTone: 'green', isPublic: true };
  }
  if (name.endsWith('-fw-int')) {
    return { name, cidr, icon: 'firewall', caption: `nfw-${regionTok}-hub-int`, captionTone: 'orange', ipNote: fwIps.int.trim() || hostIpInSubnet(cidr) };
  }
  return { name, cidr };
}

/**
 * `upToStep` limits the diagram to what the wizard has reached — on step 1 the
 * compartments render as plain rows; the network nesting appears from step 2.
 */
export function buildGraph(model: LzModel, upToStep = Infinity, opts: DiagramOptions = {}): DiagramModel {
  // Placeholder hub kinds (b/c/d/e) aren't specified yet — the network layer
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
  const sharedPlatform = model.sharedPlatform ?? { name: 'core', vcnCidr: '', subnets: [] };
  const sharedPlatSubnets: SubnetSpec[] = (sharedPlatform.subnets ?? []).map((sn) => ({ name: sn.name, cidr: sn.cidr }));
  // Title strip + the VCN (with its own subnets) + bottom padding.
  const sharedPlatH = TITLE + PAD + vcnHeight(sharedPlatSubnets) + PAD;
  // The "Show endpoints" button shows/hides the dots; clicking a dot opens its
  // table. The route-table layer is a step-3 (spoke) concern.
  const allRouteTables = showSpokes ? buildRouteTables(model) : [];
  // Active flow traces (step 3, diagram-only). A flow walks the route tables, so
  // selecting one implies the endpoints + route-table layer: it auto-opens every
  // table the packet consults, highlights the matched rows, and draws an animated
  // coloured path along the hop sequence.
  const activeFlows = showSpokes ? (opts.activeFlows ?? []) : [];
  const flowTraces = activeFlows.length > 0 ? buildFlowTraces(model, activeFlows) : [];
  const flowActive = flowTraces.length > 0;
  const rtHighlight = new Map<string, number[]>();
  const flowOpenIds = new Set<string>();
  for (const t of flowTraces) {
    for (const h of t.highlights) {
      flowOpenIds.add(h.tableId);
      rtHighlight.set(h.tableId, [...(rtHighlight.get(h.tableId) ?? []), ...h.rows]);
    }
  }
  const showDots = showSpokes && ((opts.showDots ?? false) || flowActive);
  // The endpoints layer draws a VM inside every icon-less subnet (hub mgmt/mon/
  // dns + all spoke subnets); the firewall/LB subnets stay endpoint-free.
  const showEndpoints = showSpokes && ((opts.showEndpoints ?? false) || flowActive);
  const openSet = new Set<string>([...(opts.openTables ?? []), ...flowOpenIds]);
  const openTables = showDots ? allRouteTables.filter((t) => openSet.has(t.id)) : [];
  const showMidRT = openTables.some((t) => t.kind === 'hub');
  const showLeftRT = openTables.some((t) => t.kind === 'gateway' || t.kind === 'drg');
  const showRightRT = openTables.some((t) => t.kind === 'spoke');
  const f = model.foundation;
  const region = f.region.trim();
  const customer = model.presentation.customer.trim();
  // Field holds the bare LZ name; the compartment label carries the cmp- prefix.
  const lzRaw = model.presentation.landingZone.trim();
  const lzName = lzRaw.replace(/^cmp-/, '') || 'landingzone';
  const landingZone = `cmp-${lzName}`;
  const tokens = { region: f.regionShortName.trim(), lze: lzRaw };
  const regionTok = f.regionShortName.trim() || '<region>';

  // ---- hub network (left column), driven by the step 2 fields
  const fwIps = { dmz: model.network.fwDmzIp ?? '', int: model.network.fwIntIp ?? '' };
  const hubSubnets = model.network.subnets.map((sn) => {
    const spec = decorateHubSubnet(resolveHubName(sn.name, tokens), sn.cidr, regionTok, fwIps);
    return showEndpoints ? withEndpoint(spec) : spec;
  });
  const hubVcnLabel = `${resolveHubName(model.network.hubVcnName, tokens)}\n${model.network.hubVcnCidr}`;
  const hubVcnH = vcnHeight(hubSubnets);
  // cmp-network keeps its natural width whether or not a hub table is open — an
  // open hub table sits in a reserved lane OUTSIDE it (see midMargin below), the
  // same way spoke tables sit in a margin outside the env compartments.
  const netCompW = !showHub ? COMP_W : HUB_NET_W;
  // cmp-network holds the hub VCN AND, below it, the DRG + attachment pills. In
  // step 2 only the hub's own attachment is shown; the spoke attachments (one per
  // environment) join in step 3, and one per platform VCN in step 4.
  const platformVcnCount = showPlatforms
    ? model.environments.reduce((sum, e) => sum + platforms.filter((p) => platformInEnv(p, e.name.trim())).length, 0)
    : 0;
  const numAttach = 1 + (showSpokes ? model.environments.length : 0) + platformVcnCount;
  const stackH = numAttach * ATTACH_H + (numAttach - 1) * ATTACH_GAP_V;
  // The DRG icon is centred in the cluster; padding both sides by its caption
  // height keeps the "DRG" label clear of the compartment border (it otherwise
  // overflows when the cluster is short — e.g. step 2's single hub attachment).
  const clusterH = Math.max(DRG_H + 2 * DRG_LABEL_H, stackH);
  const netCompH = showHub
    ? TITLE + PAD + hubVcnH + HUB_ATTACH_GAP + clusterH + PAD
    : COMP_H;
  // network compartment + security row (+ the shared-platform row at step 4)
  const sharedPlatRow = showPlatforms ? COMP_GAP + sharedPlatH : 0;
  const leftH = netCompH + COMP_GAP + COMP_H + sharedPlatRow;

  // ---- environments (right column), stored per-environment spoke networks
  const envs = model.environments.map((e, i) => {
    const name = e.name.trim() || `env${i + 1}`;
    const envTokens = { ...tokens, env: name };
    // Stale in-memory records may predate Environment.network — fall back to defaults.
    const net = e.network ?? envNetworkDefaults(i);
    const subnets: SubnetSpec[] = net.subnets.map((sn) => {
      const spec: SubnetSpec = { name: resolveHubName(sn.name, envTokens), cidr: sn.cidr };
      return showEndpoints ? withEndpoint(spec, name) : spec;
    });
    const vcnH = vcnHeight(subnets);
    const netH = wrapHeight(vcnH);
    const routing = net.routing ?? envRoutingDefaults();
    // Projects that land in this environment ('all' or an explicit list).
    const projectNames = showSpokes
      ? model.projects
          .filter((p) => p.environments === 'all' || (Array.isArray(p.environments) && p.environments.includes(e.name.trim())))
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
          .filter((p) => platformInEnv(p, e.name.trim()))
          .map((p) => {
            const vcnCidr = platformVcnForEnv(p, e.name.trim(), i);
            const subnetSpecs: SubnetSpec[] = platformSubnetsForEnv(p, e.name.trim(), i)
              .map((sn) => ({ name: sn.name, cidr: sn.cidr }));
            const vcnName = p.vcnName?.trim() || `vcn-${p.id}`;
            return {
              id: p.id, name: p.name.trim() || p.id, vcnName,
              vcnLabel: `${vcnName}\n${vcnCidr}`,
              attachLabel: resolveHubName(p.attachmentName || `vcn-${p.id}-<env>-attach`, envTokens),
              subnetSpecs, vcnH: vcnHeight(subnetSpecs),
            };
          })
      : [];
    const platStackH = platformInstances.length > 0
      ? platformInstances.reduce((h, pl) => h + pl.vcnH, 0) + (platformInstances.length - 1) * PLAT_VCN_GAP
      : 0;
    const platCompH = TITLE + PAD + platStackH + PAD;
    // Platforms stack BELOW the network compartment in the left column, so their
    // VCNs sit on the routing gutter (like the spoke VCN) and attach cleanly.
    const hasPlatforms = platformInstances.length > 0;
    const leftColH = netH + (hasPlatforms ? COMP_GAP + platCompH : 0);
    return {
      id: `cmp-env-${i}`,
      name,
      label: `cmp-${lzName}-${name}`,
      secure: e.securityZone,
      netLabel: `cmp-${lzName}-${name}-network`,
      vcnLabel: `vcn-${regionTok}-${name}-projects\n${net.vcnCidr}`,
      subnets,
      vcnH,
      netH,
      sgwName: routing.sgwName || 'Service Gateway',
      attachName: resolveHubName(routing.attachmentName, envTokens),
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
    { id: 'tenancy', kind: 'tenancy', label: `OCI Tenancy - ${customer || 'Operating Entity'}`, parentId: 'region', x: PAD, y: innerTop, width: tenWidth, height: tenHeight },
    { id: 'landingzone', kind: 'landingzone', label: landingZone, parentId: 'tenancy', x: PAD, y: innerTop, width: lzWidth, height: lzHeight },
  ];
  const edges: DiagramEdge[] = [];

  // network compartment › hub VCN › hub subnets, gateways on the VCN border (step 2+, implemented hub kinds only)
  nodes.push({ id: 'cmp-network', kind: 'compartment', tone: 'yellow', container: showHub || undefined, label: `cmp-${lzName}-network`, parentId: 'landingzone', x: leftX, y: innerTop + leftOffset, width: netCompW, height: netCompH });
  if (showHub) {
    const placed = pushVcn(nodes, 'hub-vcn', 'cmp-network', hubVcnLabel, hubSubnets, GW_STRIP);
    // Gateways straddle the hub VCN's left border: IGW by the first subnet,
    // NAT by the internal firewall subnet, SGW by the last subnet.
    const vcnY = TITLE + PAD;
    const centerOf = (i: number) => vcnY + placed[i].y + placed[i].height / 2;
    const natIndex = hubSubnets.findIndex((sn) => sn.name.endsWith('-fw-int'));
    const anchors = placed.length > 0
      ? [centerOf(0), centerOf(natIndex >= 0 ? natIndex : Math.floor(placed.length / 2)), centerOf(placed.length - 1)]
      : [vcnY + hubVcnH * 0.2, vcnY + hubVcnH * 0.5, vcnY + hubVcnH * 0.8];
    const r = model.network.routing ?? hubRoutingDefaults();
    const gateways = [
      { id: 'gw-igw', icon: 'igw' as const, label: r.igwName || 'Internet Gateway' },
      { id: 'gw-natgw', icon: 'natgw' as const, label: r.natName || 'NAT Gateway' },
      { id: 'gw-sgw', icon: 'sgw' as const, label: r.sgwName || 'Service Gateway' },
    ];
    gateways.forEach((gw, i) => {
      const y = Math.max(TITLE + 2, Math.min(anchors[i] - GW_H / 2, netCompH - GW_H - 2));
      nodes.push({ id: gw.id, kind: 'gateway', icon: gw.icon, label: gw.label, parentId: 'cmp-network', x: GW_STRIP - GW_W / 2, y, width: GW_W, height: GW_H });
    });

    // DRG + attachment cluster, centred horizontally in cmp-network below the hub
    // VCN: DRG on the left, the pills stacked to its right (hub first, then envs).
    const clusterTop = TITLE + PAD + hubVcnH + HUB_ATTACH_GAP;
    const groupW = DRG_W + ATTACH_DRG_GAP + ATTACH_W;
    const groupLeft = GW_STRIP + (VCN_W - groupW) / 2; // centred under the hub VCN
    const drgX = groupLeft;
    const stackX = groupLeft + DRG_W + ATTACH_DRG_GAP;
    const stackTop = clusterTop + (clusterH - stackH) / 2;
    nodes.push({ id: 'drg', kind: 'drg', label: (model.network.drgName ?? '').trim() || 'DRG', parentId: 'cmp-network', x: drgX, y: clusterTop + (clusterH - DRG_H) / 2, width: DRG_W, height: DRG_H });

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
    const attachList = [
      { id: 'attach-hub', label: resolveHubName(r.attachmentName, tokens), vcn: 'hub-vcn' },
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
      edges.push({ id: `e-${a.id}-drg`, source: a.id, target: 'drg', sourceSide: 'left', targetSide: 'right' });
    });

  }

  // security compartment (plain row under the network compartment)
  nodes.push({ id: 'cmp-security', kind: 'compartment', tone: 'yellow', label: `cmp-${lzName}-security`, parentId: 'landingzone', x: leftX, y: innerTop + leftOffset + netCompH + COMP_GAP, width: netCompW, height: COMP_H });

  // shared platform row (step 4): a gray compartment + VCN that lives OUTSIDE every
  // environment, directly in the landing zone, below the security compartment.
  if (showPlatforms) {
    const sharedVcnName = sharedPlatform.name?.trim() || 'core';
    nodes.push({
      id: 'cmp-shared-platform', kind: 'compartment', tone: 'gray', container: true,
      label: `cmp-${lzName}-platform-shared`, parentId: 'landingzone',
      x: leftX, y: innerTop + leftOffset + netCompH + COMP_GAP + COMP_H + COMP_GAP, width: netCompW, height: sharedPlatH,
    });
    // Inset by the gateway strip so it lines up with the hub VCN above it.
    pushVcn(nodes, 'shared-plat-vcn', 'cmp-shared-platform', `vcn-${sharedVcnName}\n${sharedPlatform.vcnCidr}`, sharedPlatSubnets, GW_STRIP);
  }

  // environment compartments › env network compartment › env VCN › its subnets (step 2+)
  let envY = innerTop + rightOffset;
  envs.forEach((env) => {
    const compTop = envY;
    nodes.push({ id: env.id, kind: 'compartment', tone: 'green', secure: env.secure, container: showSpokes || undefined, label: env.label, parentId: 'landingzone', x: rightX, y: compTop, width: envCompW, height: env.compH });
    envY = compTop + env.compH + COMP_GAP;
    if (!showSpokes) return;
    nodes.push({ id: `${env.id}-network`, kind: 'compartment', tone: 'yellow', container: true, label: env.netLabel, parentId: env.id, x: PAD, y: TITLE + PAD, width: NET_COMP_W, height: env.netH });
    const placed = pushVcn(nodes, `${env.id}-vcn`, `${env.id}-network`, env.vcnLabel, env.subnets, GW_STRIP);
    // Service Gateway straddling the env VCN's left border, level with the last subnet.
    const vcnTop = TITLE + PAD;
    const anchor = placed.length > 0
      ? vcnTop + placed[placed.length - 1].y + placed[placed.length - 1].height / 2
      : vcnTop + env.vcnH * 0.7;
    const sgwY = Math.max(TITLE + 2, Math.min(anchor - GW_H / 2, env.netH - GW_H - 2));
    nodes.push({ id: `${env.id}-sgw`, kind: 'gateway', icon: 'sgw', label: env.sgwName, parentId: `${env.id}-network`, x: GW_STRIP - GW_W / 2, y: sgwY, width: GW_W, height: GW_H });

    // projects compartment (gray) to the right of the network compartment, with
    // one block per project that applies to this environment.
    nodes.push({
      id: `${env.id}-projects`, kind: 'compartment', tone: 'gray', container: true,
      label: `cmp-${lzName}-${env.name}-projects`, parentId: env.id,
      x: PAD + NET_COMP_W + PROJ_GAP, y: TITLE + PAD, width: PROJ_COMP_W, height: env.projCompH,
    });
    env.projectNames.forEach((pname, k) => {
      nodes.push({
        id: `${env.id}-proj-${k}`, kind: 'project', label: pname, parentId: `${env.id}-projects`,
        x: (PROJ_COMP_W - PROJ_W) / 2, y: TITLE + PAD + k * (PROJ_H + PROJ_GAP_V), width: PROJ_W, height: PROJ_H,
      });
    });

    // platforms compartment (gray) stacked BELOW the network compartment in the
    // left column, holding one VCN (with its subnets) per platform in this env —
    // so the platform VCNs sit on the routing gutter and attach cleanly (below).
    if (env.hasPlatforms) {
      nodes.push({
        id: `${env.id}-platforms`, kind: 'compartment', tone: 'gray', container: true,
        label: `cmp-${lzName}-${env.name}-platforms`, parentId: env.id,
        x: PAD, y: TITLE + PAD + env.netH + COMP_GAP, width: PLAT_COMP_W, height: env.platCompH,
      });
      let py = TITLE + PAD;
      env.platformInstances.forEach((pl, k) => {
        pushVcn(nodes, `${env.id}-plat-${k}`, `${env.id}-platforms`, pl.vcnLabel, pl.subnetSpecs, GW_STRIP, py);
        py += pl.vcnH + PLAT_VCN_GAP;
      });
    }
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
    const byEl = new Map<string, typeof allRouteTables>();
    for (const rt of allRouteTables) byEl.set(rt.attachTo, [...(byEl.get(rt.attachTo) ?? []), rt]);
    for (const [elId, rts] of byEl) {
      const a = abs(elId);
      if (!a) continue;
      rts.forEach((rt, k) => {
        const cx = onLeft(rt) ? a.x : a.x + a.w;
        const cy = a.y + a.h / 2 + (k - (rts.length - 1) / 2) * (DOT + 4);
        nodes.push({
          id: `dot-${rt.id}`, kind: 'rtdot', label: '', parentId: 'landingzone',
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
        const disp = flowActive && flowOpenIds.has(rt.id) && used && used.length
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
  // Count endpoint sub-traces per base flow so each gets its own parallel lane
  // (a small diagonal offset) instead of all overlapping into one thick line.
  const flowCount = new Map<string, number>();
  for (const t of flowTraces) {
    const base = t.id.split('#')[0];
    flowCount.set(base, (flowCount.get(base) ?? 0) + 1);
  }
  const seenGroup = new Set<string>();
  for (const t of flowTraces) {
    const segs = t.segments.filter((s) => nodeIds.has(s.from) && nodeIds.has(s.to));
    if (segs.length === 0) continue;
    const base = t.id.split('#')[0];
    const k = parseInt(t.id.split('#')[1] ?? '0', 10) || 0;
    const cnt = flowCount.get(base) ?? 1;
    const off = (k - (cnt - 1) / 2) * 9; // centred lane offset
    const shift = (p: { x: number; y: number }) => ({ x: p.x + off, y: p.y + off });
    const waypoints = [segs[0].from, ...segs.map((s) => s.to)];
    const points = routeFlow(waypoints).map(shift);
    if (points.length < 2) continue;
    // Numbered hop badges render once per flow group (the first endpoint) so they
    // don't stack at the shared hub nodes.
    const isPrimary = !seenGroup.has(base);
    seenGroup.add(base);
    const badges = isPrimary
      ? t.hops
          .map((h) => ({ h, c: absCenter(h.node) }))
          .filter((b): b is { h: typeof t.hops[number]; c: { x: number; y: number } } => b.c !== null)
          .map(({ h, c }) => ({ node: h.node, seq: h.seq, ...shift(c) }))
      : [];
    edges.push({
      id: `flow-${t.id}`, source: waypoints[0], target: waypoints[waypoints.length - 1],
      animated: true, color: t.color, label: t.label, waypoints, points, badges,
    });
  }

  // Containment is shown by nesting; routing adds VCN → attach → DRG edges.
  return { nodes, edges };
}
