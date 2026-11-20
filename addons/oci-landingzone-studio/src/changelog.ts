/**
 * changelog.ts — release history for OCI Landing Zone Studio.
 *
 * Single source of truth for the app version: the newest entry (first in the
 * list) is the current release, and package.json must carry the same version
 * (enforced by changelog.test.ts). To ship a release, add an entry at the top
 * and bump package.json to match.
 *
 * Versioning follows semver while Studio is pre-1.0: minor for new features,
 * patch for fixes, docs and dependency updates.
 */

export type ChangeKind = 'added' | 'changed' | 'fixed' | 'security' | 'docs';

export interface ChangelogChange {
  kind: ChangeKind;
  text: string;
}

export interface ChangelogEntry {
  /** Semver, without a leading "v". */
  version: string;
  /** Release date, ISO yyyy-mm-dd. */
  date: string;
  /** One-line headline for the release. */
  title: string;
  /** Pull requests in github.com/oci-landing-zones/oci-landing-zone-operating-entities. */
  prs?: number[];
  changes: ChangelogChange[];
}

export const REPO_URL = 'https://github.com/oci-landing-zones/oci-landing-zone-operating-entities';

export const CHANGE_KIND_LABEL: Record<ChangeKind, string> = {
  added: 'Added',
  changed: 'Changed',
  fixed: 'Fixed',
  security: 'Security',
  docs: 'Docs',
};

/** Newest first. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.6.2',
    date: '2026-11-13',
    title: 'No more DRG attachment drift',
    prs: [274],
    changes: [
      { kind: 'fixed', text: 'Generated network configurations no longer cause recurring DRG attachment-type drift on re-apply: attachments matched by ID omit the attachment type.' },
    ],
  },
  {
    version: '0.6.1',
    date: '2026-11-10',
    title: 'OKE spoke NAT defaults follow the hub model',
    prs: [273],
    changes: [
      { kind: 'fixed', text: 'OKE extension spoke NAT defaults are derived from the selected hub and apply only to Hub E.' },
    ],
  },
  {
    version: '0.6.0',
    date: '2026-11-09',
    title: 'OKE 0.3.0, Orchestrator v2.4.1 and smoother DR deployment',
    prs: [265, 262],
    changes: [
      { kind: 'added', text: 'Independent OKE clusters in selected environments, with connectivity-aware previews that check worker and pod reachability over hybrid flows.' },
      { kind: 'added', text: 'Kubernetes versions can be entered as free text.' },
      { kind: 'changed', text: 'Adopts the consolidated CIS OKE v0.3.0 contract and Orchestrator v2.4.1.' },
      { kind: 'changed', text: 'Streamlined DR deployment guidance and diagram exports for linked Home and DR designs, with one consistent deployment guide layout.' },
      { kind: 'changed', text: 'OKE uses the shared VCN editor with profile-owned subnets.' },
      { kind: 'fixed', text: 'OKE placement and connectivity previews corrected; invalid peer CIDRs stay editable after connectivity changes.' },
    ],
  },
  {
    version: '0.5.1',
    date: '2026-11-05',
    title: 'FastConnect BGP mapping fix',
    prs: [268],
    changes: [
      { kind: 'fixed', text: 'The option to add a BGP mapping is offered only for FastConnect circuits that do not have one yet.' },
    ],
  },
  {
    version: '0.5.0',
    date: '2026-11-03',
    title: 'Site-to-Site VPN, private FastConnect and cleaner diagrams',
    prs: [266],
    changes: [
      { kind: 'added', text: 'Hybrid connectivity: Site-to-Site VPN and private FastConnect, with region- and realm-aware service choices, custom attachment routing and customer guidance.' },
      { kind: 'added', text: 'Pre-shared keys are kept for the session only and never saved.' },
      { kind: 'added', text: 'Clickable route-table dots pulse to show they can be opened, respecting reduced-motion settings.' },
      { kind: 'changed', text: 'Diagram layout: VCNs and subnets centred, a compact DRG beneath the hub, and tidier route-table placement that stays put between Endpoint and Flow views.' },
      { kind: 'changed', text: 'Flow labels use environment names instead of "Spoke".' },
      { kind: 'fixed', text: 'Adding OKE keeps the hub load balancer and ingress flow choices.' },
    ],
  },
  {
    version: '0.4.1',
    date: '2026-10-28',
    title: 'Hide flows hides everything',
    prs: [263],
    changes: [
      { kind: 'fixed', text: 'Hide flows now also hides route tables and active traces. Picked flows come back when you choose Show flows again.' },
    ],
  },
  {
    version: '0.4.0',
    date: '2026-10-26',
    title: 'Regional disaster recovery and design import',
    prs: [261],
    changes: [
      { kind: 'added', text: 'Regional DR designs linked to a Home Region design, built with the standard wizard and kept in sync with its environments.' },
      { kind: 'added', text: 'Remote peering (RPC) deployment steps, per-region downloads and Home/DR comparison diagrams.' },
      { kind: 'added', text: 'Independent DR networks and cluster settings for EXACS, OCVS and OKE, including the Home IAM prerequisite and CIDR validation.' },
      { kind: 'added', text: 'Import an existing config.jsonnet, and add a description to each design.' },
      { kind: 'changed', text: 'Resource and routing diagrams are built from Blueprint Factory output and share geometry with Draw.io exports and flow playback.' },
      { kind: 'changed', text: 'Deployment options are labelled Home Region and DR throughout Foundation, Review and RPC guidance.' },
      { kind: 'fixed', text: 'OKE networks no longer overlap when resizing Studio profiles.' },
      { kind: 'fixed', text: 'OKE omits redundant DRG routes when a default route exists.' },
    ],
  },
  {
    version: '0.3.1',
    date: '2026-10-20',
    title: 'License notice and hosted app link',
    prs: [256, 258],
    changes: [
      { kind: 'changed', text: 'The start-up disclaimer is replaced by a license notice on the dashboard.' },
      { kind: 'docs', text: 'The README links to the hosted Studio app.' },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-10-16',
    title: 'Exadata platforms and notification routing',
    prs: [252],
    changes: [
      { kind: 'added', text: 'Exadata Cloud@Customer (EXACC) and Exadata Database Service (EXACS) platforms, available as shared or environment platforms.' },
      { kind: 'added', text: 'Exadata notifications routed by team and environment, with notification controls per topic.' },
      { kind: 'changed', text: 'One-OE CIDR defaults aligned with the framework; Exadata CIDRs are pinned.' },
      { kind: 'changed', text: 'Unified platform setup with configuration readiness checks; platform sections start collapsed.' },
      { kind: 'changed', text: 'Add-on renamed to oci-landingzone-studio.' },
      { kind: 'fixed', text: 'Observability notification emails must be valid addresses.' },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-10-15',
    title: 'Traffic-flow tracing reworked',
    prs: [254],
    changes: [
      { kind: 'added', text: 'Trace traffic flows from the split view, with a flow picker, endpoint chips and a hop list that tags firewall inspection.' },
      { kind: 'added', text: 'Show all flows: every flow per environment, coloured by traffic type with a legend; click a path to focus it and open its route tables.' },
      { kind: 'changed', text: 'New flow overlay with parallel lanes for shared legs, direction chevrons and an animated packet.' },
      { kind: 'changed', text: 'Flow controls appear from step 3, where spoke endpoints first exist. Up to four flows are traced at once.' },
    ],
  },
  {
    version: '0.1.1',
    date: '2026-10-07',
    title: 'Dependency updates',
    prs: [249],
    changes: [
      { kind: 'security', text: 'Updated vulnerable dependencies.' },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-09-18',
    title: 'First release',
    prs: [244, 245],
    changes: [
      { kind: 'added', text: 'Guided wizard for One-OE designs: foundation, hub network (Hub A, B, C or E), environments and projects, platforms and review.' },
      { kind: 'added', text: 'Live architecture diagram with traffic-flow tracing.' },
      { kind: 'added', text: 'OKE, OCVS and custom platforms.' },
      { kind: 'added', text: 'The official Jsonnet generator runs in the browser via WebAssembly, so the downloaded ZIP matches the command-line output.' },
      { kind: 'added', text: 'Hosted on GitHub Pages.' },
    ],
  },
];

export const CURRENT_VERSION = CHANGELOG[0].version;

/** "2026-10-28" → "28 Oct 2026", fixed to UTC so it never shifts a day. */
export function formatReleaseDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}
