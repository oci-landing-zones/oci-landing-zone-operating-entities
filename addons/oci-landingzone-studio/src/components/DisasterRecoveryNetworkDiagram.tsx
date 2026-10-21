import { useMemo } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import LzDiagram from '../diagram/LzDiagram';
import type { LzModel } from '../model/types';
import type { DrDesignDraft } from '../services/disasterRecoveryDesign';
import { buildDrComparisonDiagram } from '../services/disasterRecoveryDiagram';
import { oracle } from '../theme';

export default function DisasterRecoveryNetworkDiagram({ model, draft }: { model: LzModel; draft: DrDesignDraft }) {
  const diagram = useMemo(() => buildDrComparisonDiagram(model, draft), [model, draft]);
  return <section aria-labelledby="dr-network-diagram-title" style={{ marginTop: 28 }}>
    <h4 id="dr-network-diagram-title" style={{ margin: '0 0 16px', fontSize: 18 }}>Network Diagram</h4>
    <p style={{ margin: '0 0 16px', color: oracle.textMuted, fontSize: 13, lineHeight: 1.6 }}>Home and DR hub, projects and platform networks. DR shows the selected resources; unconfigured address ranges appear as CIDR pending.</p>
    {!draft.region && <p style={{ fontSize: 13, color: oracle.textMuted }}>Select a DR region to add its network to this diagram.</p>}
    <div aria-label="Home and DR network diagram" style={{ minWidth: 0, height: 640, border: `1px solid ${oracle.border}`, borderRadius: 12, overflow: 'hidden', background: oracle.surface }}>
      <ReactFlowProvider><LzDiagram diagram={diagram} minZoom={0.05} /></ReactFlowProvider>
    </div>
  </section>;
}
