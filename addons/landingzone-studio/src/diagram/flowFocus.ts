import type { DiagramModel } from '../model/types';
import { flowGroup } from './flowOverlayGeometry';

/** Focus changes presentation while retaining every routed path and processing anchor. */
export function withFlowFocus(diagram: DiagramModel, focusFlow?: string): DiagramModel {
  if (!focusFlow) return diagram;
  const focused = diagram.edges.filter((edge) => edge.waypoints && flowGroup(edge.id.replace(/^flow-/, '')) === focusFlow);
  const rules = new Map<string, Set<string>>();
  for (const edge of focused) for (const hop of edge.flowHops ?? []) {
    if (!hop.tableId || !hop.ruleId) continue;
    const matched = rules.get(hop.tableId) ?? new Set<string>();
    matched.add(hop.ruleId);
    rules.set(hop.tableId, matched);
  }
  return {
    ...diagram,
    display: { ...diagram.display, focusFlow },
    nodes: focused.length ? diagram.nodes.map((node) => node.kind !== 'routetable' ? node : {
      ...node,
      rtHighlight: (node.rtRows ?? []).flatMap((row, index) => row.id && rules.get(node.id)?.has(row.id) ? [index] : []),
    }) : diagram.nodes,
  };
}
