import { useEffect, useRef } from 'react';
import ObservabilityCostStep from '../wizard/steps/ObservabilityCostStep';
import { governanceTheme } from '../wizard/steps/costGovernanceStyles';
import type { UncoveredCostResource } from '../services/costCenterCoverage';

export default function TagConfigurationSidebar({ selectedTag, onTagSelect, onClose, uncoveredCostResources }: {
  selectedTag: string | null;
  onTagSelect: (tag: string) => void;
  onClose: () => void;
  uncoveredCostResources?: readonly UncoveredCostResource[];
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  return <aside style={governanceTheme} className="studio-tag-sidebar" aria-labelledby="tag-configuration-title">
    <div className="studio-tag-sidebar-header">
      <h2 id="tag-configuration-title" ref={heading} tabIndex={-1}>Tag configuration</h2>
      <button type="button" onClick={onClose}>Back to Governance</button>
    </div>
    <div className="studio-tag-sidebar-content">
      <p className="studio-tag-sidebar-help">Configure FinOps tags and use the eye icons to highlight where each tag applies in the diagram. Changes are saved with your design.</p>
      <ObservabilityCostStep tagsOnly selectedTag={selectedTag} onTagSelect={onTagSelect} uncoveredCostResources={uncoveredCostResources} />
    </div>
  </aside>;
}
