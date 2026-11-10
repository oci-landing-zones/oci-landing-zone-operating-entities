/**
 * Names of the generator's artifacts, split out from `generate.ts` so the UI can
 * label and order saved outputs without importing the generator itself — that
 * module eagerly bundles ~0.7 MB of vendored jsonnet.
 */

/** The canonical network artifact. */
export const PRIMARY_OUTPUTS = ['network.json'] as const;

/** Filename the wizard's own config is written under, inside the bundle. */
export const CONFIG_FILENAME = 'config.jsonnet';

/** What each surfaced artifact is for, so a reviewer knows which to deploy first. */
export const OUTPUT_BLURB: Record<string, string> = {
  'network.json': 'Creates the network and routing, resolving firewall and NLB targets from resource keys.',
};

/** Obsolete network, observability or OKE bundles must be regenerated even when their config matches. */
export function isCurrentOutputSet(output: { config: string; files: Record<string, string> } | null, config: string): boolean {
  return output !== null
    && output.config === config
    && Object.hasOwn(output.files, 'network.json')
    && !Object.hasOwn(output.files, 'network_pre.json')
    && !Object.hasOwn(output.files, 'observability_cis1_pre.json')
    && !Object.hasOwn(output.files, 'observability_cis2_pre.json')
    && !Object.hasOwn(output.files, 'oke_clusters.json')
    && !Object.hasOwn(output.files, 'oke_workers.json');
}

export interface DeploymentStage {
  title: string;
  description: string;
  files: string[];
}

const persistent = ['iam.json', 'governance.json'];

/**
 * Builds the rms-facade input sets without ever placing pre and final variants
 * of the same root configuration family in one operation.
 */
export function deploymentStages(availableFiles: string[], completionNetwork: 'network.json' | 'network_backends.json' = 'network.json'): DeploymentStage[] {
  const deployable = availableFiles.filter((file) => file.endsWith('.json')
    && !file.endsWith('_output.json') && !file.includes('/') && file !== 'network_pre.json');
  const available = new Set(deployable);
  if (!available.has(completionNetwork)) throw new Error(`Generate ${completionNetwork} before selecting it for deployment.`);
  const keep = (files: string[]) => [...new Set(files.filter((file) => available.has(file)))];
  const pre = [...available].filter((file) => file.endsWith('_pre.json'));
  const finalCore = deployable.filter((file) =>
    (file.startsWith('security_cis') || file.startsWith('observability_cis'))
    && !file.endsWith('_pre.json'),
  );
  const initialCore = finalCore.filter((file) => !available.has(file.replace(/\.json$/, '_pre.json')));
  const extensionFiles = deployable.filter((file) =>
    !persistent.includes(file)
    && file !== 'network.json'
    && file !== 'network_pre.json'
    && file !== 'network_backends.json'
    && !file.startsWith('security_cis')
    && !file.startsWith('observability_cis'),
  );

  return [
    {
      title: '1. Create the landing zone',
      description: 'Create the network and routing together. Files ending in _pre establish prerequisites; include complete control files when no _pre variant is generated.',
      files: keep([...persistent, 'network.json', ...pre, ...initialCore]),
    },
    {
      title: '2. Complete controls and workloads',
      description: 'Update the same stack: retain the network and complete control files, replace each _pre file with its final counterpart, and add workload files. Plan and apply again.',
      files: keep([...persistent, completionNetwork, ...finalCore, ...extensionFiles]),
    },
  ];
}
