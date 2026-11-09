import { deploymentStages } from '../generator/outputNames';
import type { LzConfig } from './lzConfig';

export const ORCHESTRATOR_VERSION = 'v2.4.1';
export const ORCHESTRATOR_URL = 'https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator';
export const ORCHESTRATOR_RELEASE_URL = `${ORCHESTRATOR_URL}/releases/tag/${ORCHESTRATOR_VERSION}`;
export const RESOURCE_MANAGER_STACKS_URL = 'https://cloud.oracle.com/resourcemanager/stacks';
export const DEPLOY_TO_OCI_URL = `${RESOURCE_MANAGER_STACKS_URL}/create?${new URLSearchParams({
  zipUrl: `${ORCHESTRATOR_URL}/archive/refs/tags/${ORCHESTRATOR_VERSION}.zip`,
  zipUrlVariables: JSON.stringify({ configuration_source: 'ocibucket' }),
})}`;

export const PRIVATE_SOURCE_STEP = 'Unzip the download and review the generated JSON files. Replace any required placeholders, then upload the JSON files to your private Object Storage bucket.';
export const APPLY_STEP = 'Select Create without running an apply. From the stack details page, select Plan, review the changes and policy impact, then select Apply. Wait for a successful apply before starting phase 2.';
export const UPDATE_STEP = 'Save the updated variables. Run Plan, review the changes, then Apply in the same stack. Wait for a successful apply.';
export const EXISTING_DEPLOYMENT_STEP = 'Use the existing stack and Terraform state. Retain the complete desired configuration, including resources already managed by that stack.';

export function completionNetwork(config: LzConfig): 'network.json' | 'network_backends.json' {
  return config.hub.kind === 'hub_c' ? 'network_backends.json' : 'network.json';
}

export function expectedDeploymentFiles(config: LzConfig): string[] {
  const cis = config.cis_level;
  const hasOke = Object.values(config.environments).some((env) => Object.values(env.platforms).some((platform) => platform.extension?.type === 'oke_simple'));
  return [
    ...(config.stack_scope === 'regional' ? [] : ['iam.json', 'governance.json']), 'network.json',
    `security_cis${cis}_pre.json`, `security_cis${cis}.json`,
    `observability_cis${cis}_pre.json`, `observability_cis${cis}.json`,
    ...(config.hub.kind === 'hub_c' ? ['network_backends.json'] : []),
    ...(hasOke ? ['oke.json'] : []),
  ];
}

export function deploymentPrerequisites(config: LzConfig): string[] {
  const regional = config.stack_scope === 'regional';
  const peers = Object.values(config.remote_peering_connections ?? {});
  const tunnels = Object.values(config.hybrid_connectivity?.ipsecs ?? {}).flatMap((vpn) => Object.values(vpn.tunnels_management));
  return [
    ...(regional ? [
      'Deploy the Home Region stack first with matching compartments, project and platform IAM, and governance.'
        + (config.cis_level === 2 ? ' Select this DR region in Home to grant Object Storage access to its encryption keys.' : ''),
      'On Home, set `save_output = true` and complete its deployment to obtain `compartments_output.json` and `network_output.json`. These runtime outputs are not included in the Studio download.',
    ] : []),
    ...(peers.length ? [
      ...(peers.some((peer) => peer.peer_id) ? ['RPC requester: deploy the acceptor first. Use its RPC OCID or the RPC resource key from its `network_output.json` as the peer ID.'] : []),
      ...(peers.some((peer) => peer.peer_tenancy_ocid) ? ['For cross-tenancy peering, establish the required IAM policies in both tenancies before connecting the requester.'] : [])] : []),
    ...(tunnels.some((tunnel) => tunnel.shared_secret?.startsWith('ocid1.vaultsecret.'))
      ? ['Existing VPN Vault secrets must exist and be readable by the deployment account before the connectivity apply. Studio does not create or copy these secrets.'] : []),
  ];
}

function dependencyFiles(config: LzConfig): string[] {
  if (config.stack_scope === 'regional') return ['compartments_output.json', 'network_output.json'];
  return Object.values(config.remote_peering_connections ?? {}).some((peer) => peer.peer_id && !peer.peer_id.startsWith('ocid1.'))
    ? ['network_output.json'] : [];
}

function outputFiles(config: LzConfig): string[] {
  if (config.stack_scope === 'regional') return [];
  if (config.dr_region) return ['compartments_output.json', 'network_output.json'];
  return Object.values(config.remote_peering_connections ?? {}).some((peer) => !peer.peer_id) ? ['network_output.json'] : [];
}

export function deploymentSettings(config: LzConfig): string[] {
  const dependencies = dependencyFiles(config);
  const names = dependencies.map((file) => '`' + file + '`').join(' and ');
  return [
    ...(dependencies.length ? [`Copy ${names} from the completed ${config.stack_scope === 'regional' ? 'Home' : 'RPC acceptor'} deployment to this stack's private configuration bucket. Set \`oci_dependency_objects\` to ${names}. Keep these files out of \`oci_configuration_objects\`.`] : []),
    ...(outputFiles(config).length ? [`Set \`save_output = true\` to write runtime outputs for the ${config.dr_region ? 'DR stack' : 'RPC requester'}.`] : []),
  ];
}

export function deploymentOutputs(config: LzConfig): string[] {
  const outputs = outputFiles(config);
  const names = outputs.map((file) => '`' + file + '`').join(' and ');
  return outputs.length ? [`Retain ${names} from this stack's configuration bucket for the separate ${config.dr_region ? 'DR stack' : 'RPC requester'}.`] : [];
}

export const HUB_C_BACKEND_STEPS = [
  'Configure the third-party firewall VMs outside Studio before continuing to phase 2.',
  'In `network_backends.json`, replace each firewall backend `target_id` with the appropriate private-IP OCID, instance OCID or existing instance dependency key. For separate trust and untrust interfaces, use their private-IP OCIDs or qualified `instance.vnic` keys.',
  'Upload the edited `network_backends.json` to the configuration bucket. Use it instead of `network.json` for phase 2 and subsequent updates. Select exactly one network file.',
];

export function deploymentHandover(config: LzConfig): string[] {
  const hybrid = config.hybrid_connectivity;
  const tunnels = Object.values(hybrid?.ipsecs ?? {}).flatMap((vpn) => Object.values(vpn.tunnels_management));
  const platforms = [...Object.values(config.shared_platforms), ...Object.values(config.environments).flatMap((env) => Object.values(env.platforms))];
  return [
    ...(Object.keys(hybrid?.ipsecs ?? {}).length ? ['VPN: obtain both Oracle tunnel endpoints and their keys from OCI. Your network team configures both router tunnels, matching IKE settings and return routes.'
      + (tunnels.some((tunnel) => tunnel.routing === 'BGP') ? ' For the BGP tunnels, also configure the agreed neighbors and advertisements.' : '')
      + ' A tunnel can remain Down until the router is ready.'] : []),
    ...(Object.values(hybrid?.fast_connect_virtual_circuits ?? {}).some((circuit) => circuit.provision_fc_virtual_circuit !== false) ? ["FastConnect: complete the provider activation or physical connection work, then configure the peer's VLAN and BGP settings as required by the service. OCI resource creation does not activate the provider's side."] : []),
    ...(Object.keys(hybrid?.cross_connect_groups ?? {}).length ? ['Physical ports: complete cabling and activation before adding circuits that reference the provisioned port/group OCIDs. Keep the managed groups and ports in the design when adding the circuits.'] : []),
    ...(platforms.some((platform) => ['exacc', 'exacs'].includes(platform.extension?.type ?? '')) ? ['Exadata: the generated files prepare platform compartments, IAM, observability and networks where configured. Provision the Exadata infrastructure and database services separately.'] : []),
    ...(platforms.some((platform) => platform.extension?.type === 'oke_simple' && platform.extension.params?.create_fss) ? ['OKE File Storage: the selected option prepares networking and worker utilities. Create and configure the file system separately.'] : []),
  ];
}

export function deploymentCliSteps(config: LzConfig): string[] {
  const dependencies = dependencyFiles(config);
  const outputs = outputFiles(config);
  const dependencyNames = dependencies.map((file) => '`' + file + '`').join(' and ');
  const outputNames = outputs.map((file) => '`' + file + '`').join(' and ');
  return [
    `Download and extract Orchestrator ${ORCHESTRATOR_VERSION}. Use \`rms-facade\` as the working directory, with your approved OCI authentication and Terraform state. Keep the generated JSON files locally instead of uploading them to a bucket.`,
    'In a private `deployment.tfvars` file, set `configuration_source = "file"`, `tenancy_ocid` and `region`. Set `local_config_file_paths` to absolute paths for the phase 1 files listed above.',
    ...(dependencies.length ? [`Set \`local_dependency_file_paths\` to the absolute paths of ${dependencyNames} from the completed ${config.stack_scope === 'regional' ? 'Home' : 'RPC acceptor'} deployment.`] : []),
    ...(outputs.length ? [`Set \`save_output = true\`. Retain ${outputNames} written locally for the separate ${config.dr_region ? 'DR stack' : 'RPC requester'}.`] : []),
    'Run `terraform init`, then `terraform plan -var-file=deployment.tfvars -out=deployment.tfplan`. Review the plan, then run `terraform apply deployment.tfplan`.',
    `After phase 1 succeeds, ${config.hub.kind === 'hub_c' ? 'prepare the firewall backends and edit `network_backends.json` as described above. Then ' : ''}replace \`local_config_file_paths\` with the phase 2 list. Save \`deployment.tfvars\`, then plan, review and apply again using the same commands and state.`,
  ];
}

export function deploymentReadme(config: LzConfig, files: string[]): string {
  const scope = config.stack_scope === 'regional' ? 'DR' : 'Home Region';
  const [first, second] = deploymentStages(files, completionNetwork(config));
  const handover = deploymentHandover(config);
  return [
    `${scope} deployment (${config.region})`,
    `Landing Zone Orchestrator ${ORCHESTRATOR_VERSION}: ${ORCHESTRATOR_RELEASE_URL}`,
    '',
    'Deploy with OCI Resource Manager',
    'Use one stack for both phases.',
    '',
    '1. Prepare the files',
    ...deploymentPrerequisites(config),
    PRIVATE_SOURCE_STEP,
    'Upload only the generated deployment JSON files; do not mix them with published blueprint files.',
    '',
    '2. Create and apply phase 1',
    `Open ${DEPLOY_TO_OCI_URL} and select rms-facade as the working directory.`,
    'Confirm configuration_source = "ocibucket". Enter your bucket in oci_configuration_bucket and set oci_configuration_objects to exactly these phase 1 files:',
    ...first.files.map((file) => `  ${file}`),
    ...deploymentSettings(config),
    APPLY_STEP,
    '',
    '3. Update and apply phase 2',
    ...(config.hub.kind === 'hub_c' ? HUB_C_BACKEND_STEPS : []),
    'In the same stack, edit the variables. Replace oci_configuration_objects with exactly these phase 2 files. The final security and observability files replace their _pre counterparts:',
    ...second.files.map((file) => `  ${file}`),
    UPDATE_STEP,
    ...deploymentOutputs(config),
    ...(handover.length ? ['', '4. Complete external setup', ...handover] : []),
    '', 'Updating an existing landing zone', EXISTING_DEPLOYMENT_STEP,
    '', 'Alternative: Terraform CLI or CI/CD', ...deploymentCliSteps(config).map((step, i) => `${i + 1}. ${step}`),
    '',
  ].join('\n').replaceAll('`', '');
}
