import type { LzModel } from '../model/types';
import { generatePreview } from '../generator/preview';
import { buildRouteTables, type RouteTable } from './routeTables';
import type { GeneratedResourceInventory } from './generatedResources';
import type { UncoveredCostResource } from './costCenterCoverage';

export interface DiagramPreview { tables: RouteTable[]; inventory: GeneratedResourceInventory; files: string[]; uncoveredCostResources?: UncoveredCostResource[] }
export type DiagramPreviewResult = { ok: true; preview: DiagramPreview } | { ok: false; message: string };

self.onmessage = async (event: MessageEvent<LzModel>) => {
  let result: DiagramPreviewResult;
  try {
    const { network, inventory, files, uncoveredCostResources } = await generatePreview(event.data);
    result = { ok: true, preview: { tables: buildRouteTables(event.data, network), inventory, files, uncoveredCostResources } };
  } catch (error) {
    result = { ok: false, message: error instanceof Error ? error.message : 'Could not generate the diagram resources.' };
  }
  self.postMessage(result);
};
