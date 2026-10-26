import type { LzModel } from '../model/types';
import { serializeConfig } from '../services/lzConfig';
import { extractGeneratedResources, GENERATED_RESOURCE_COLLECTIONS, type GeneratedResourceInventory } from '../services/generatedResources';
import { evaluate } from './jsonnetVm';
import { buildVirtualFs } from './virtualFs';

export interface GeneratedPreview {
  network: unknown;
  inventory: GeneratedResourceInventory;
}

/** One canonical evaluation keeps the diagram's routes and resource inventory in the same snapshot. */
export async function generatePreview(model: LzModel): Promise<GeneratedPreview> {
  const { files } = buildVirtualFs();
  const entry = 'studio_preview.jsonnet';
  const result = await evaluate(entry, {
    ...files,
    [entry]: `function(config)
      local outputs = (import 'landing_zone_multi.jsonnet')(config);
      local configurations = ${JSON.stringify([...new Set(GENERATED_RESOURCE_COLLECTIONS.map((entry) => entry.configuration))])};
      {
        network: outputs['network.json'],
        artifacts: {
          [filename]: {
            [configuration]: outputs[filename][configuration]
            for configuration in std.objectFields(outputs[filename])
            if std.member(configurations, configuration)
          }
          for filename in std.objectFields(outputs)
          if !std.endsWith(filename, '_pre.json') && !std.member(['network.json', 'network_backends.json', 'iam.json', 'governance.json'], filename)
        },
        compartments: if std.objectHas(outputs, 'iam.json') then outputs['iam.json'].compartments_configuration
          else (import 'landing_zone.libsonnet')(config).iam.compartments_configuration,
      }`,
  }, { config: serializeConfig(model) });
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('The generated diagram preview is unavailable.');
  const preview = result as Record<string, unknown>;
  if (!preview.network || !preview.artifacts || typeof preview.artifacts !== 'object' || Array.isArray(preview.artifacts)) {
    throw new Error('The generated diagram preview is incomplete.');
  }
  return { network: preview.network, inventory: extractGeneratedResources(preview.artifacts as Record<string, unknown>, preview.compartments) };
}
