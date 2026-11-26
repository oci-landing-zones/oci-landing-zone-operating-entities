import type { LzModel } from '../model/types';
import { buildConfig, type LzConfig } from './lzConfig';
import { findRegion } from './regions';
import { hasSeparateHomePrimary } from './deploymentTopology';
import { CONFIG_FILENAME, type DeploymentStage } from '../generator/outputNames';
import { plannedDeploymentStages, deploymentReadme, expectedDeploymentFiles, HUB_C_BACKEND_STEPS, ORCHESTRATOR_RELEASE_URL, ORCHESTRATOR_VERSION, DEPLOY_TO_OCI_URL, deploymentHandover } from './deployment';
import { costCenterCoverage, costCenterCoverageError } from './costCenterCoverage';

export function shouldSplitHomePrimary(model: LzModel): boolean {
  return hasSeparateHomePrimary(model.foundation);
}

export function buildHomePrimaryConfigs(model: LzModel, configOverride?: LzConfig): { home: LzConfig; primary: LzConfig } | null {
  if (!shouldSplitHomePrimary(model)) return null;
  const config = configOverride ?? buildConfig(model);
  const home = findRegion(model.foundation.realm, model.foundation.tenancyHomeRegion!)!;
  return {
    home: { ...config, region: home.id, region_short_name: home.shortName, stack_scope: 'home', primary_region: config.region, primary_region_short_name: config.region_short_name },
    primary: { ...config, stack_scope: 'primary' },
  };
}

export interface HomePrimaryDeployment {
  name: 'Home' | 'Primary';
  folder: string;
  config: LzConfig;
  stages: DeploymentStage[];
}

function homeStages(files: string[]): DeploymentStage[] {
  const final = files.filter((file) => file.endsWith('.json') && !file.endsWith('_pre.json') && !file.endsWith('_output.json') && !file.includes('/'));
  return [{ title: 'Create Home controls', description: 'Create shared IAM, governance and Home controls. No networks or workloads are created here.', files: final }];
}

/** Uses actual scoped outputs when available; otherwise supplies a design preview. */
export function homePrimaryDeploymentPlan(model: LzModel, scopedFiles?: { home?: string[]; primary?: string[] }, configOverride?: LzConfig): HomePrimaryDeployment[] {
  const configs = buildHomePrimaryConfigs(model, configOverride);
  if (!configs) return [];
  const cis = configs.home.cis_level;
  const homeFiles = scopedFiles?.home ?? ['iam.json', 'governance.json',
    ...(configs.home.enable_cloud_guard === false ? [] : [`security_cis${cis}.json`]), `observability_cis${cis}.json`];
  const primaryFiles = scopedFiles?.primary ?? expectedDeploymentFiles(configs.primary).filter((file) => !['iam.json', 'governance.json', 'governance_pre.json'].includes(file));
  return [
    { name: 'Home', config: configs.home, folder: `home_${configs.home.region_short_name}`, stages: homeStages(homeFiles) },
    { name: 'Primary', config: configs.primary, folder: `primary_${configs.primary.region_short_name}`, stages: plannedDeploymentStages(configs.primary, primaryFiles) },
  ];
}

function requiresExternalRpcOutput(config: LzConfig): boolean {
  return Object.values(config.remote_peering_connections ?? {}).some((peer) => peer.peer_id && !peer.peer_id.startsWith('ocid1.'));
}

export function primaryRuntimeRequirements(config: LzConfig): { externalRpc: boolean; outputConsumers: string[] } {
  return {
    externalRpc: requiresExternalRpcOutput(config),
    outputConsumers: [
      ...(config.dr_region ? ['Secondary'] : []),
      ...(Object.values(config.remote_peering_connections ?? {}).some((peer) => !peer.peer_id) ? ['RPC requesters'] : []),
    ],
  };
}

export function homePrimaryReadme(operation: HomePrimaryDeployment): string {
  const home = operation.name === 'Home';
  const runtime = primaryRuntimeRequirements(operation.config);
  const externalRpc = !home && runtime.externalRpc;
  const outputInstruction = `Set save_output = true. Retain network_output.json for ${runtime.outputConsumers.join(' and ')} from this Primary stack after it completes.`;
  return [
    `${operation.name} stack (${operation.config.region}) — ${operation.folder}/`,
    `Landing Zone Orchestrator ${ORCHESTRATOR_VERSION}: ${ORCHESTRATOR_RELEASE_URL}`,
    '',
    home ? 'Deploy this Home stack first. It creates shared IAM, governance and Home controls, without networks or workloads.' : 'Deploy this separate Primary stack only after Home has completed. It creates regional networks, controls and workloads.',
    'This package is for a new installation. It does not migrate resources or Terraform state from an existing deployment.',
    '', 'OCI Resource Manager with private Object Storage',
    'Review these generated files and upload only this folder’s deployment JSON files to your customer-controlled private Object Storage bucket. Keep config.jsonnet for reproducibility; do not select it as deployment input.',
    `Create a separate stack in ${operation.config.region} using ${DEPLOY_TO_OCI_URL}. Select rms-facade as the working directory.`,
    'Set configuration_source = "ocibucket", oci_configuration_bucket and oci_configuration_objects to the exact phase list below.',
    ...(home ? ['Set save_output = true. After Home completes, retain compartments_output.json for the Primary stack. This runtime output is not included in this download.']
      : [`Copy only compartments_output.json from completed Home into the Primary stack’s private configuration bucket.${externalRpc ? ' Also copy network_output.json from the completed external RPC acceptor into that private bucket.' : ''} Set oci_dependency_objects to ${externalRpc ? '["compartments_output.json", "network_output.json"]' : '["compartments_output.json"]'}. Keep dependency files out of oci_configuration_objects.`,
        'Primary manages Security Zones, regional keys and their key-specific IAM grants, including policies using the oci.home provider alias. Keep these generated policies in Primary.']),
    ...(!home && runtime.outputConsumers.length ? [outputInstruction] : []),
    ...operation.stages.flatMap((stage, index) => [
      '', `Phase ${index + 1}: ${stage.title}`, stage.description,
      ...(index > 0 && !home && operation.config.hub.kind === 'hub_c' ? HUB_C_BACKEND_STEPS.map((step) => step.replaceAll('`', '')) : []),
      ...stage.files.map((file) => `  ${file}`),
      index === 0 ? 'Create without running an apply. Run Plan, review correctness, security and compliance, then Apply. Wait for success before continuing.' : 'Update oci_configuration_objects in this same stack and state to the exact list above. Run Plan, review, then Apply. Wait for success before continuing.',
    ]),
    '', 'Alternative: Terraform CLI or approved CI/CD',
    `Download pinned Orchestrator ${ORCHESTRATOR_VERSION}. Use rms-facade with approved OCI authentication and a separate Terraform state for each stack.`,
    `In private deployment.tfvars, set configuration_source = "file", tenancy_ocid and region = "${operation.config.region}". Set local_config_file_paths to absolute paths for this stack’s phase 1 files.`,
    ...(home ? ['Set save_output = true and retain the locally written compartments_output.json for Primary.']
      : [externalRpc ? 'Set local_dependency_file_paths to the absolute paths of compartments_output.json from completed Home and network_output.json from the completed external RPC acceptor.' : 'Set local_dependency_file_paths to the absolute path of compartments_output.json from completed Home.']),
    ...(!home && runtime.outputConsumers.length ? [outputInstruction] : []),
    'Run terraform init, then terraform plan -var-file=deployment.tfvars -out=deployment.tfplan. Review the plan, then terraform apply deployment.tfplan.',
    ...(operation.stages.length > 1 ? ['After phase 1 succeeds, replace local_config_file_paths with the phase 2 list. Plan, review and apply again using the same stack and state.'] : []),
    ...(!home ? deploymentHandover(operation.config) : []),
    ...(!home && operation.config.dr_region ? [`Deploy Secondary (${operation.config.dr_region}) third using its separate linked design and ZIP. Pass compartments_output.json from Home and network_output.json from Primary as runtime dependencies.`] : []),
    '',
  ].join('\n');
}

export async function deploymentDownloadFiles(model: LzModel, generated: { config: string; files: Record<string, string> }, configOverride?: LzConfig): Promise<Record<string, string>> {
  const config = configOverride ?? buildConfig(model);
  if (config.stack_scope === 'regional') {
    const folder = `secondary_${config.region_short_name}`;
    const index = [
      `Secondary deployment (${config.region}) — one separate stack`,
      `Complete Home and Primary first, then deploy ${folder}/ using ${folder}/README.txt. Home and Primary may share a stack when they use the same region.`,
      'Pass compartments_output.json from Home and network_output.json from Primary as runtime dependencies. These runtime outputs are not included in this ZIP.',
      'Use a separate Secondary stack and Terraform state. The folder README includes the exact phase lists, private Object Storage settings and CLI alternative.',
      'The root config.jsonnet preserves the editable Studio design for reimport. The folder contains the deployment source and generated JSON files.',
      '',
    ].join('\n');
    const folderFiles = {
      [CONFIG_FILENAME]: generated.config, ...generated.files,
      'README.txt': `Secondary stack (${config.region}) — ${folder}/\n\n${deploymentReadme(config, Object.keys(generated.files))}`,
    };
    return { [CONFIG_FILENAME]: generated.config, 'README.txt': index,
      ...Object.fromEntries(Object.entries(folderFiles).map(([name, body]) => [`${folder}/${name}`, body])) };
  }
  const configs = buildHomePrimaryConfigs(model, configOverride);
  if (!configs) return { [CONFIG_FILENAME]: generated.config, ...generated.files, 'README.txt': deploymentReadme(config, Object.keys(generated.files)) };
  const { generateFromConfigCode } = await import('../generator/generate');
  const homeSource = `${JSON.stringify(configs.home, null, 2)}\n`;
  const primarySource = `${JSON.stringify(configs.primary, null, 2)}\n`;
  const home = await generateFromConfigCode(homeSource);
  const primary = await generateFromConfigCode(primarySource);
  for (const files of [home, primary]) {
    const error = costCenterCoverageError(costCenterCoverage(files), model);
    if (error) throw new Error(error);
  }
  const plan = homePrimaryDeploymentPlan(model, { home: Object.keys(home), primary: Object.keys(primary) }, configOverride);
  const files: Record<string, string> = {
    [CONFIG_FILENAME]: generated.config,
    'README.txt': [
      `Home and Primary deployment — two separate stacks${configs.primary.dr_region ? '; Secondary uses a third separate stack' : ''}`,
      'This package is for a new installation. It does not automatically migrate resources or existing Terraform state.',
      `1. Deploy ${plan[0].folder}/ in ${configs.home.region} and finish the Home deployment first.`,
      'Set save_output = true on Home and retain compartments_output.json.',
      `2. Deploy ${plan[1].folder}/ in ${configs.primary.region}, using only compartments_output.json from Home as a dependency.`,
      ...(requiresExternalRpcOutput(configs.primary) ? ['Primary also requires network_output.json from the completed external RPC acceptor to resolve logical peer IDs. Include both runtime files in oci_dependency_objects (Object Storage) or local_dependency_file_paths (CLI), following the Primary README.'] : []),
      ...(primaryRuntimeRequirements(configs.primary).outputConsumers.length ? [`On Primary, set save_output = true and retain network_output.json for ${primaryRuntimeRequirements(configs.primary).outputConsumers.join(' and ')}.`] : []),
      ...(configs.primary.dr_region ? [`3. Deploy Secondary (${configs.primary.dr_region}) using its separate linked design and ZIP, after Primary completes. Use compartments_output.json from Home and network_output.json from Primary as dependencies.`] : []),
      'Use separate stacks and Terraform states. Follow README.txt in each folder for exact phase lists, private Object Storage and CLI settings.',
      'The root config.jsonnet preserves the complete editable Studio design for reimport. Folder configs are reproducible deployment-specific sources.',
      '',
    ].join('\n'),
  };
  for (const [index, outputs] of [home, primary].entries()) {
    const operation = plan[index];
    files[`${operation.folder}/${CONFIG_FILENAME}`] = index === 0 ? homeSource : primarySource;
    files[`${operation.folder}/README.txt`] = homePrimaryReadme(operation);
    for (const [file, body] of Object.entries(outputs)) files[`${operation.folder}/${file}`] = body;
  }
  return files;
}
