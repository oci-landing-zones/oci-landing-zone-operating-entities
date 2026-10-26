import { buildGraph } from '../diagram/buildGraph';
import { withFlowFocus } from '../diagram/flowFocus';
import type { DiagramModel, DiagramOptions, LzModel } from '../model/types';
import type { DiagramPreview } from '../services/diagramPreview.worker';

/** Keep the overview and chosen layers together for this exact generated snapshot. */
export function createDiagramGraph(model: LzModel, preview: DiagramPreview) {
  const graphs = new Map<string, DiagramModel>();
  return (step: number, options: DiagramOptions): DiagramModel => {
    const { focusFlow, ...layers } = options;
    const key = JSON.stringify([step, layers]);
    let diagram = graphs.get(key);
    if (!diagram) {
      diagram = buildGraph(model, step, layers, undefined, preview.tables, preview.inventory);
      if (graphs.size === 2) graphs.delete(graphs.keys().next().value!);
      graphs.set(key, diagram);
    }
    return withFlowFocus(diagram, focusFlow);
  };
}
