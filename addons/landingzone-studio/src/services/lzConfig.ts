/**
 * lzConfig — derives the Landing Zone config object from the canonical model and
 * serialises it in the jsonnet style the generator expects.
 *
 *   {
 *     realm: 'oc1',
 *     region: 'eu-frankfurt-1',
 *     region_short_name: 'fra',
 *     hub: {                                  // from step 2 onward
 *       kind: 'hub_a',
 *       network: {
 *         vcn: '10.0.0.0/21',
 *         subnets: {
 *           'fw-dmz': '10.0.0.0/24', lb: '10.0.1.0/24',
 *           ...
 *         },
 *       },
 *     },
 *     environments: { prod: {}, preprod: {}, dev: {} },
 *     security_targets: ['prod'],
 *   }
 *
 * `environments` is keyed by environment name; `security_targets` lists the
 * environments with their Security Zone switched on. Subnets are keyed by their
 * short name — the shared `sn-<region>-<lze>-hub-` prefix is stripped, so the
 * config stays stable when the diagram-only naming context changes.
 */

import type { HubKind, LzModel, PlatformConfig } from '../model/types';
import { resolveHubName } from './hubKinds';
import { envNetworkDefaults } from '../model/defaults';
import { platformSubnetsForEnv, platformVcnForEnv } from './platforms';

/** One platform in the config — its per-env network plus its engine extension. */
export interface PlatformConfigEntry {
  network: { vcn: string; subnets: Record<string, string> };
  extension: { type: string; params?: Record<string, unknown> };
}

/** One environment in the config — its spoke network, projects, and platforms. */
export interface EnvConfigEntry {
  shared_project_network: { network: { vcn: string; subnets: Record<string, string> } };
  projects: Record<string, Record<string, never>>;
  platforms: Record<string, PlatformConfigEntry>;
}

export interface LzConfig {
  realm: string;
  region: string;
  region_short_name: string;
  hub: {
    kind: HubKind;
    network: {
      vcn: string;
      subnets: Record<string, string>;
    };
  };
  environments: Record<string, EnvConfigEntry>;
  /**
   * Shared platforms that live outside every environment (step 4). A platform with
   * no extension must declare its subnets explicitly, so the empty VCN carries an
   * empty `subnets` map rather than omitting the field.
   */
  shared_platforms: Record<string, { network: { vcn: string; subnets: Record<string, string> } }>;
  security_targets: string[];
}

/** Short subnet key for the config: the hub name prefix is stripped off. */
function subnetKey(name: string, tokens: { region: string; lze: string }): string {
  const resolved = resolveHubName(name, tokens).trim();
  const prefix = resolveHubName('sn-<region>-<lze>-hub-', tokens);
  return resolved.startsWith(prefix) ? resolved.slice(prefix.length) : resolved;
}

/** Projects (by name) that apply to a given environment — 'all' or an explicit list. */
function projectsForEnv(model: LzModel, envName: string): string[] {
  return model.projects
    .filter((p) => p.environments === 'all' || (Array.isArray(p.environments) && p.environments.includes(envName)))
    .map((p) => p.name.trim())
    .filter(Boolean);
}

/** A platform's config entry for one environment: its per-env network + extension. */
function platformEntryFor(platform: PlatformConfig, envName: string, index: number): PlatformConfigEntry {
  const subnets: Record<string, string> = {};
  for (const sn of platformSubnetsForEnv(platform, envName, index)) {
    const k = sn.name.trim();
    if (!k) continue;
    subnets[k] = sn.cidr.trim();
  }
  const network = { vcn: platformVcnForEnv(platform, envName, index).trim(), subnets };
  if (platform.type === 'oke_simple' && platform.okeParams) {
    const p = platform.okeParams;
    return {
      network,
      extension: {
        type: 'oke_simple',
        params: {
          kubernetes_version: p.kubernetesVersion,
          services_cidr: p.servicesCidr,
          api_endpoint_allowed_cidrs: p.apiAllowedCidrs,
          worker_image: p.workerImage,
        },
      },
    };
  }
  return { network, extension: { type: platform.type } };
}

export function buildConfig(model: LzModel): LzConfig {
  const f = model.foundation;
  const tokens = { region: f.regionShortName, lze: model.presentation.landingZone };

  const environments: Record<string, EnvConfigEntry> = {};
  const security_targets: string[] = [];
  model.environments.forEach((env, i) => {
    const name = env.name.trim();
    if (!name) return; // skip half-typed rows
    if (env.securityZone) security_targets.push(name);

    const net = env.network ?? envNetworkDefaults(i);
    const envSubnets: Record<string, string> = {};
    for (const sn of net.subnets) {
      // Config keys subnets by role — the last segment of the name (web/app/db/…).
      const role = (sn.name.split('-').pop() ?? '').trim();
      if (!role) continue;
      envSubnets[role] = sn.cidr.trim();
    }
    const projects: Record<string, Record<string, never>> = {};
    for (const pn of projectsForEnv(model, name)) projects[pn] = {};

    const platforms: Record<string, PlatformConfigEntry> = {};
    for (const p of model.platforms) {
      const inEnv = p.environments === 'all' || (Array.isArray(p.environments) && p.environments.includes(name));
      const key = p.id.trim() || p.name.trim();
      if (!inEnv || !key) continue;
      platforms[key] = platformEntryFor(p, name, i);
    }

    environments[name] = {
      shared_project_network: { network: { vcn: net.vcnCidr.trim(), subnets: envSubnets } },
      projects,
      platforms,
    };
  });

  const shared_platforms: LzConfig['shared_platforms'] = {};
  const sharedVcn = model.sharedPlatform?.vcnCidr?.trim();
  const sharedName = model.sharedPlatform?.name?.trim() || 'core';
  if (sharedVcn) {
    const sharedSubnets: Record<string, string> = {};
    for (const sn of model.sharedPlatform?.subnets ?? []) {
      const k = sn.name.trim();
      if (k) sharedSubnets[k] = sn.cidr.trim();
    }
    shared_platforms[sharedName] = { network: { vcn: sharedVcn, subnets: sharedSubnets } };
  }

  const subnets: Record<string, string> = {};
  for (const sn of model.network.subnets) {
    const k = subnetKey(sn.name, tokens);
    if (!k) continue; // skip half-typed rows
    subnets[k] = sn.cidr.trim();
  }

  return {
    realm: f.realm,
    region: f.region,
    region_short_name: f.regionShortName,
    hub: {
      kind: model.network.hubKind,
      network: {
        vcn: model.network.hubVcnCidr,
        subnets,
      },
    },
    environments,
    shared_platforms,
    security_targets,
  };
}

/** jsonnet object key — bare when a valid identifier, else single-quoted. */
function key(name: string): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) ? name : quote(name);
}

function quote(value: string): string {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/** Render key:value entries two-per-line at the given indent (e.g. subnet maps). */
function pairLines(entries: string[], indent: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < entries.length; i += 2) out.push(`${indent}${entries.slice(i, i + 2).join(', ')},`);
  return out;
}

/** Lines for one platform inside an environment's `platforms` block (8-space key indent). */
function platformEntryLines(name: string, entry: PlatformConfigEntry): string[] {
  const subEntries = Object.entries(entry.network.subnets).map(([k, v]) => `${key(k)}: ${quote(v)}`);
  const subnetLines = subEntries.length === 0
    ? ['            subnets: {},']
    : ['            subnets: {', ...pairLines(subEntries, '              '), '            },'];
  const ext = entry.extension;
  const extLines = ext.params
    ? [
        `          extension: { type: ${quote(ext.type)}, params: {`,
        ...pairLines(Object.entries(ext.params).map(([k, v]) => `${key(k)}: ${jsonnetValue(v)}`), '            '),
        '          } },',
      ]
    : [`          extension: { type: ${quote(ext.type)} },`];
  return [
    `        ${key(name)}: {`,
    '          network: {',
    `            vcn: ${quote(entry.network.vcn)},`,
    ...subnetLines,
    '          },',
    ...extLines,
    '        },',
  ];
}

/** Render a jsonnet value: arrays of strings as ['a', 'b'], strings quoted, else raw. */
function jsonnetValue(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map((x) => quote(String(x))).join(', ')}]`;
  if (typeof v === 'string') return quote(v);
  return String(v);
}

/** Lines for one environment entry (step 3): its spoke network + projects (+ platforms at step 4). */
function envEntryLines(name: string, entry: EnvConfigEntry, includePlatforms: boolean): string[] {
  const net = entry.shared_project_network.network;
  const subEntries = Object.entries(net.subnets).map(([k, v]) => `${key(k)}: ${quote(v)}`);
  const subnetLines = subEntries.length === 0
    ? ['          subnets: {},']
    : ['          subnets: {', ...pairLines(subEntries, '            '), '          },'];
  const projEntries = Object.keys(entry.projects).map((p) => `${key(p)}: {}`);
  const projectsLine = projEntries.length === 0 ? '      projects: {},' : `      projects: { ${projEntries.join(', ')} },`;
  const platformKeys = Object.keys(entry.platforms);
  const platformsLines = !includePlatforms
    ? []
    : platformKeys.length === 0
      ? ['      platforms: {},']
      : ['      platforms: {', ...platformKeys.flatMap((p) => platformEntryLines(p, entry.platforms[p])), '      },'];
  return [
    `    ${key(name)}: {`,
    '      shared_project_network: {',
    '        network: {',
    `          vcn: ${quote(net.vcn)},`,
    ...subnetLines,
    '        },',
    '      },',
    projectsLine,
    ...platformsLines,
    '    },',
  ];
}

/**
 * Serialise the config in the jsonnet style the generator consumes.
 * `upToStep` limits the output to the blocks the wizard has reached — on
 * step 1 the hub block is left out, so the JSON tracks where you are.
 */
export function serializeConfig(model: LzModel, upToStep = Infinity): string {
  const c = buildConfig(model);

  const envNames = Object.keys(c.environments);
  // Steps 1–2: environments are just named, empty compartments. Step 3 fills in
  // each one's spoke network + the projects dropped inside it.
  let environmentsBlock: string[];
  if (upToStep < 3) {
    const inner = envNames.map((k) => `${key(k)}: {}`).join(', ');
    environmentsBlock = [`  environments: ${inner ? `{ ${inner} }` : '{}'},`];
  } else if (envNames.length === 0) {
    environmentsBlock = ['  environments: {},'];
  } else {
    const incPlat = upToStep >= 4;
    environmentsBlock = ['  environments: {', ...envNames.flatMap((n) => envEntryLines(n, c.environments[n], incPlat)), '  },'];
  }
  const securityTargets = `[${c.security_targets.map(quote).join(', ')}]`;

  // The shared platform(s) join the output once the wizard reaches step 4.
  const sharedKeys = Object.keys(c.shared_platforms);
  const sharedPlatformsBlock = upToStep < 4 || sharedKeys.length === 0
    ? []
    : [
        '  shared_platforms: {',
        ...sharedKeys.map((k) => {
          const sn = Object.entries(c.shared_platforms[k].network.subnets)
            .map(([n, cidr]) => `${key(n)}: ${quote(cidr)}`).join(', ');
          return `    ${key(k)}: { network: { vcn: ${quote(c.shared_platforms[k].network.vcn)}, subnets: { ${sn} } } },`;
        }),
        '  },',
      ];

  // subnets render two pairs per line
  const subnetEntries = Object.entries(c.hub.network.subnets).map(([k, v]) => `${key(k)}: ${quote(v)}`);
  const subnetLines: string[] = [];
  for (let i = 0; i < subnetEntries.length; i += 2) {
    subnetLines.push(`        ${subnetEntries.slice(i, i + 2).join(', ')},`);
  }
  const subnets = subnetEntries.length === 0
    ? ['      subnets: {},']
    : ['      subnets: {', ...subnetLines, '      },'];

  // The hub block joins the output once the wizard has reached step 2.
  const hubBlock = upToStep >= 2
    ? [
        '  hub: {',
        `    kind: ${quote(c.hub.kind)},`,
        '    network: {',
        `      vcn: ${quote(c.hub.network.vcn)},`,
        ...subnets,
        '    },',
        '  },',
      ]
    : [];

  return [
    '{',
    `  realm: ${quote(c.realm)},`,
    `  region: ${quote(c.region)},`,
    `  region_short_name: ${quote(c.region_short_name)},`,
    ...hubBlock,
    ...environmentsBlock,
    ...sharedPlatformsBlock,
    `  security_targets: ${securityTargets},`,
    '}',
    '',
  ].join('\n');
}
