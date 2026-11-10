import type { DiagramNode } from '../model/types';
import { oracle } from '../theme';

/** Canvas, minimap and export use the same ancestry-aware compartment palette. */
export function compartmentStyle(node: Pick<DiagramNode, 'tone' | 'compartmentScope'>) {
  const neutral = { stroke: oracle.compGrayBorder, text: '#3f4750', dotted: false };
  switch (node.tone) {
    case 'platform': return { ...neutral, fill: oracle.compPlatformFill, text: '#ffffff' };
    case 'projects': return { ...neutral, fill: oracle.compProjectsFill, text: oracle.ink };
    case 'gray': return { ...neutral, fill: oracle.compGrayFill };
    case 'green': return { fill: oracle.compGreenFill, stroke: oracle.compGreenBorder, text: '#3f4750', dotted: true };
    default: return {
      fill: node.compartmentScope === 'environment' ? oracle.compEnvironmentFill : oracle.compYellowFill,
      stroke: oracle.compYellowBorder, text: '#3f4750', dotted: true,
    };
  }
}
