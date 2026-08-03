/**
 * Names of the generator's artifacts, split out from `generate.ts` so the UI can
 * label and order saved outputs without importing the generator itself — that
 * module eagerly bundles ~0.7 MB of vendored jsonnet.
 */

/** The network artifacts in deployment order when both are emitted. */
export const PRIMARY_OUTPUTS = ['network_pre.json', 'network.json'] as const;

/** Filename the wizard's own config is written under, inside the bundle. */
export const CONFIG_FILENAME = 'config.jsonnet';

/** What each surfaced artifact is for, so a reviewer knows which to deploy first. */
export const OUTPUT_BLURB: Record<string, string> = {
  'network_pre.json': 'Initial phase — creates the network before generated final-route dependencies exist.',
  'network.json': 'Completion phase — replaces network_pre.json after required private IP OCIDs are available.',
};

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
export function deploymentStages(availableFiles: string[]): DeploymentStage[] {
  const available = new Set(availableFiles);
  const keep = (files: string[]) => [...new Set(files.filter((file) => available.has(file)))];
  const pre = availableFiles.filter((file) => file.endsWith('_pre.json'));
  const finalCore = availableFiles.filter((file) =>
    (file === 'network.json' || file.startsWith('security_cis') || file.startsWith('observability_cis'))
    && !file.endsWith('_pre.json'),
  );
  const extensionFiles = availableFiles.filter((file) =>
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
      description: available.has('network_pre.json')
        ? 'Use the pre-phase network, security, and observability files. Plan and apply this set before completing generated routes.'
        : 'Use the generated network with the pre-phase security and observability files. Plan and apply this set first.',
      files: keep([...persistent, available.has('network_pre.json') ? 'network_pre.json' : 'network.json', ...pre]),
    },
    {
      title: '2. Complete routing and controls',
      description: 'Edit the existing stack source: replace each pre file with its final counterpart, then plan, review, and apply again.',
      files: keep([...persistent, ...finalCore, ...extensionFiles]),
    },
  ];
}
