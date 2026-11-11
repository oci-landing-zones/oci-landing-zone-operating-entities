import type { LzModel } from '../model/types';
import { serializeConfig } from '../services/lzConfig';
import { extractGeneratedResources, type GeneratedResourceInventory } from '../services/generatedResources';
import { costCenterCoverage, type UncoveredCostResource } from '../services/costCenterCoverage';
import { evaluate } from './jsonnetVm';
import { buildVirtualFs } from './virtualFs';

export interface GeneratedPreview {
  network: unknown;
  inventory: GeneratedResourceInventory;
  files: string[];
  uncoveredCostResources: UncoveredCostResource[];
}

/** One canonical evaluation keeps the diagram's routes and resource inventory in the same snapshot. */
export async function generatePreview(model: LzModel): Promise<GeneratedPreview> {
  const { files } = buildVirtualFs();
  const entry = 'studio_preview.jsonnet';
  const result = await evaluate(entry, {
    ...files,
    [entry]: `function(config)
      local outputs = (import 'landing_zone_multi.jsonnet')(config);
      {
        files: std.objectFields(outputs),
        network: outputs['network.json'],
        artifacts: {
          [filename]: {
            [configuration]: outputs[filename][configuration]
            for configuration in std.objectFields(outputs[filename])
            if std.endsWith(configuration, '_configuration')
          }
          for filename in std.objectFields(outputs)
          if !std.endsWith(filename, '_pre.json') && filename != 'network.json'
        },
        compartments: if std.objectHas(outputs, 'iam.json') then outputs['iam.json'].compartments_configuration
          else (import 'landing_zone.libsonnet')(config).iam.compartments_configuration,
      }`,
  }, { config: serializeConfig(model) });
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('The generated diagram preview is unavailable.');
  const preview = result as Record<string, unknown>;
  if (!preview.network || !preview.artifacts || typeof preview.artifacts !== 'object' || Array.isArray(preview.artifacts)
    || !Array.isArray(preview.files) || !preview.files.every((file) => typeof file === 'string')) {
    throw new Error('The generated diagram preview is incomplete.');
  }
  const artifacts = preview.artifacts as Record<string, unknown>;
  return { network: preview.network, inventory: extractGeneratedResources(artifacts, preview.compartments), files: preview.files,
    uncoveredCostResources: model.foundation.stackScope === 'regional' ? [] : costCenterCoverage({ ...artifacts, 'network.json': preview.network }) };
}
