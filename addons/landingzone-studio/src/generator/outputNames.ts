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
  'network_pre.json': 'Initial phase — creates the network before final-route dependencies are available.',
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
        ? 'Use this first set once. Files ending in _pre create resources before their final route targets exist.'
        : 'Use this first set once. This hub does not need a preliminary network file.',
      files: keep([...persistent, available.has('network_pre.json') ? 'network_pre.json' : 'network.json', ...pre]),
    },
    {
      title: '2. Complete routing and controls',
      description: 'Update the same stack: replace every _pre file with its final counterpart, then plan and apply again.',
      files: keep([...persistent, ...finalCore, ...extensionFiles]),
    },
  ];
}
