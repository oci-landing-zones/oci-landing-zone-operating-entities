/**
 * Canonical Landing Zone model — the single source of truth.
 *
 * The wizard writes into this object; every downstream view (JSON preview,
 * on-screen diagram and .drawio export) is a PURE derivation of it.
 * Each new wizard step adds fields here and the diagram grows to match.
 *
 * Milestone 0 is deliberately tiny: a tenancy and a hub VCN. That's enough to
 * exercise the whole pipeline (two nodes + one edge → live diagram → drawio).
 */

export interface FoundationConfig {
  realm: string;           // e.g. oc1
  region: string;          // region identifier, e.g. eu-frankfurt-1
  regionShortName: string; // three-letter region key, e.g. fra
  /** Generator security and observability baseline. */
  cisLevel: 1 | 2;
}

/** Per-environment spoke network — seeded with defaults, user-adjustable in step 2. */
export interface EnvNetworkConfig {
  vcnCidr: string;
  subnets: Subnet[];
}

export interface Environment {
  /** Stable browser identity; editable names never serve as relationships. */
  id: string;
  name: string;            // e.g. prod
  securityZone: boolean;   // enrol this environment in an OCI Security Zone
  network: EnvNetworkConfig;
}

/**
 * A project — an (initially empty) compartment dropped inside one or more
 * environments. `environments: 'all'` applies it to every environment
 * dynamically; otherwise it lists the specific environment names.
 */
export interface ProjectConfig {
  /** Stable browser identity; never serialized to Jsonnet. */
  id: string;
  name: string;
  /** Stable environment IDs, resolved to config names during serialization. */
  environments: 'all' | string[];
}

/** Hub kinds accepted by the current config-driven Jsonnet schema. */
export type HubKind = 'hub_a' | 'hub_b' | 'hub_c' | 'hub_e';

export interface Subnet {
  /** Jsonnet subnet-map key. OCI display names are generator-derived. */
  name: string;
  cidr: string;
  /** Mandatory subnet shipped by a platform type (e.g. OKE's int-lb/workers) —
   * cannot be deleted in the editor. Custom subnets omit it. */
  locked?: boolean;
}

/** Platform types currently exposed by the config-driven Studio. */
export type PlatformType = 'oke_simple' | 'ocvs' | 'custom';

/** OKE settings — the extension params for an oke_simple platform. */
export interface OkePlatformParams {
  kubernetesVersion: string;   // e.g. v1.35.2
  servicesCidr: string;        // e.g. 10.96.0.0/16
  apiAllowedCidrs: string[];   // e.g. ['10.0.1.0/24']
  workerImage: string;         // image-name selector, e.g. 9\.[0-9]+
  workerBootVolumeSize: number;
  cniType: 'native' | 'overlay';
  /** Omit for a manual subnet map; profiles own their subnet map. */
  clusterSize?: 'small' | 'medium' | 'large';
  /** Required for overlay; optional passthrough for native. */
  podsCidr?: string;
  createFss: boolean;
  publicLoadBalancer: boolean;
}

/** OCVS's one-SDDC management-cluster input contract. */
export interface OcvsPlatformParams {
  sshAuthorizedKeys: string;
  sddcDisplayName: string;
  clusterDisplayName: string;
  vmwareSoftwareVersion: string;
  computeAvailabilityDomain: string;
  esxiHostsCount: number;
  vsphereType: string;
  initialHostOcpuCount: number;
  initialHostShapeName: string;
  workloadNetworkCidr: string;
}

/** Per-environment override for a platform: a custom VCN and/or subnet set. */
export interface PlatformEnvOverride {
  vcnCidr?: string;
  subnets?: Subnet[];
}

/**
 * An environment platform (step 4): a compartment + VCN dropped inside one or
 * more environments. Unlike a project (compartment only), a platform carries its
 * own network. The base `vcnCidr`/`subnets` describe the first environment; every
 * other environment derives its VCN by index shift unless an override pins it.
 */
export interface PlatformConfig {
  /** Stable browser identity; never serialized to Jsonnet. */
  id: string;
  /** Key in environments.<env>.platforms. */
  key: string;
  type: PlatformType;
  /** 'all' applies it to every environment; otherwise the listed environment IDs. */
  environments: 'all' | string[];
  /** Base VCN CIDR (env-0); other envs derive from it. */
  vcnCidr: string;
  /** Default (locked) + custom subnets, relative to the base VCN. */
  subnets: Subnet[];
  /** OKE settings — present only when type === 'oke_simple'. */
  okeParams?: OkePlatformParams;
  /** OCVS settings — present only when type === 'ocvs'. */
  ocvsParams?: OcvsPlatformParams;
  /** Per-env VCN / subnet overrides, keyed by stable environment ID. */
  overrides?: Record<string, PlatformEnvOverride>;
}

/**
 * A shared platform. Its resources live in a child of cmp-lz-platform while
 * its network lives in cmp-lz-network, matching the generator topology.
 */
export interface SharedPlatformConfig {
  /** Stable browser identity; never serialized to Jsonnet. */
  id: string;
  /** Key in the top-level shared_platforms map. */
  key: string;
  /** Shared OCVS uses the same extension contract as an environment platform. */
  type?: 'custom' | 'ocvs';
  /**
   * Keys the `shared_platforms` config block and names the generated VCN. The
   * generator folds it into an OCI DNS label (`vcn` + region + `lz` + `sh` + name),
   * which OCI caps at 15 chars — so with a 3-char region this has ~5 to spend.
   */
  vcnCidr: string;
  /**
   * The generator asserts every platform VCN declares at least one subnet
   * (`lib/subnets.libsonnet`), so the shared platform always carries one.
   */
  subnets: Subnet[];
  /** Present only when this shared platform is an OCVS management cluster. */
  ocvsParams?: OcvsPlatformParams;
}

export interface NetworkConfig {
  hubKind: HubKind;
  hubVcnCidr: string;
  subnets: Subnet[];
}

export interface LzModel {
  /** Schema version of this canonical object. */
  version: string;
  foundation: FoundationConfig;
  environments: Environment[];
  network: NetworkConfig;
  /** Projects dropped into environments (step 3). */
  projects: ProjectConfig[];
  /** Environment platforms — VCN-bearing compartments inside environments (step 4). */
  platforms: PlatformConfig[];
  /** Optional shared platforms outside all environments (step 4). */
  sharedPlatforms: SharedPlatformConfig[];
}

/**
 * Renderer-agnostic diagram intermediate. `buildGraph(model)` produces this;
 * the React Flow renderer and the drawio/SVG exporters both consume it, so the
 * on-screen diagram and the exported file always agree without sharing an
 * engine.
 */
export interface DiagramNode {
  id: string;
  /** Semantic kind — drives styling in each renderer. */
  kind: 'region' | 'tenancy' | 'landingzone' | 'compartment' | 'vcn' | 'subnet' | 'gateway' | 'drg' | 'attachment' | 'routetable' | 'rtdot' | 'project';
  label: string;
  /** Compartment fill: yellow (shared), green (environment) or gray (projects). */
  tone?: 'yellow' | 'green' | 'gray';
  /** Compartment explicitly targeted by an OCI Security Zone (shows a shield). */
  secure?: boolean;
  /** Compartment that holds nested children — label renders top-left. */
  container?: boolean;
  /** Icon glyph: gateways use it as the node body, subnets show it centred. */
  icon?: 'igw' | 'natgw' | 'sgw' | 'firewall' | 'lb';
  /** Caption under a subnet icon (e.g. nfw-<region>-hub-dmz). */
  caption?: string;
  /** Caption colour. */
  captionTone?: 'green' | 'orange';
  /** Extra line under the caption — e.g. a firewall instance IP address. */
  ipNote?: string;
  /** Endpoint (VM) shown inside an icon-less subnet when the endpoints layer is on. */
  endpointName?: string;
  endpointIp?: string;
  /** Public subnet (IGW-routed) — e.g. the hub LB / DMZ-firewall subnets. */
  publicSubnet?: boolean;
  /** Route-table box payload (kind === 'routetable'). */
  rtRows?: { destination: string; targetType: string; target: string; routeType: string }[];
  rtColumns?: 'vcn' | 'drg';
  rtNote?: string;
  rtTone?: 'hub' | 'gateway' | 'drg' | 'spoke';
  /** Rows (by index) to highlight when a flow traverses this table. */
  rtHighlight?: number[];
  /** Route-table dot (kind === 'rtdot'): the table it opens, its state, its colour. */
  rtDotTableId?: string;
  rtDotOpen?: boolean;
  rtDotConfigured?: boolean;
  rtDotTone?: 'hub' | 'gateway' | 'drg' | 'spoke';
  /** Container nesting — id of the parent node; x/y are then relative to it. */
  parentId?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type EdgeSide = 'left' | 'right' | 'top' | 'bottom';

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  /** When true, renderers show a moving/packet-flow animation on the edge. */
  animated?: boolean;
  /** Per-flow stroke colour (set on flow-trace edges; absent on structural links). */
  color?: string;
  /** Flow overlay: ordered node ids the packet visits (used by the .drawio export
   * + auto-fit). The on-screen path uses the precomputed `points` below. */
  waypoints?: string[];
  /** Flow overlay: absolute centre of each waypoint, precomputed by buildGraph so
   * the overlay never reads (and lags behind) the live node positions. */
  points?: { x: number; y: number }[];
  /** Flow overlay: numbered hop badges with their precomputed absolute centres. */
  badges?: { node: string; seq: number; x: number; y: number }[];
  /** Fixed connection sides — pins endpoints to a specific border for clean routing. */
  sourceSide?: EdgeSide;
  targetSide?: EdgeSide;
  /** Normalized position along the selected source/target border (0..1). */
  sourcePort?: number;
  targetPort?: number;
  /** Horizontal nudge (px) for the orthogonal mid-bend, so parallel links don't overlap. */
  channel?: number;
  /**
   * Absolute x (canvas coords) to pin the orthogonal vertical bend to — used to
   * hold a link's vertical run in a fixed channel (e.g. the gutter) regardless of
   * how the boxes either side resize. `channel` still applies as a stagger on top.
   */
  centerX?: number;
}

export interface DiagramModel {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

/** Toggle layers on the diagram (route-table dots/boxes, endpoints, a flow). */
export interface DiagramOptions {
  /** Show the route-table dots (click a dot to open its table). */
  showDots?: boolean;
  /** Ids of the route tables currently opened on the diagram. */
  openTables?: string[];
  showEndpoints?: boolean;
  /** Show the docked flow picker (right-side sidebar). */
  showFlows?: boolean;
  /** Selected flow ids — composite `<env>:<flowKind>` (e.g. "prod:egress"). */
  activeFlows?: string[];
}
