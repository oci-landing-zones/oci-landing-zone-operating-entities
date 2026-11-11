import { useWizard } from '../wizardContext';
import CostGovernanceSection from './CostGovernanceSection';
import { s as form } from './networkEditorStyles';
import type { UncoveredCostResource } from '../../services/costCenterCoverage';

export default function ObservabilityCostStep({ selectedTag, onTagSelect, uncoveredCostResources }: { selectedTag?: string | null; onTagSelect?: (tagName: string) => void; uncoveredCostResources?: readonly UncoveredCostResource[] }) {
  const { model, setField, homeSource } = useWizard();
  return <div style={form.col}>
    <CostGovernanceSection model={homeSource?.model ?? model} regional={model.foundation.stackScope === 'regional'}
      selectedTag={selectedTag} onTagSelect={onTagSelect}
      uncoveredCostResources={uncoveredCostResources}
      onChange={(costGovernance) => setField('foundation', { ...model.foundation, costGovernance })} />
  </div>;
}
