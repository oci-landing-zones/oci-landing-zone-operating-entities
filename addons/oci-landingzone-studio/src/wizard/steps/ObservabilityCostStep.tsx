import { useWizard } from '../wizardContext';
import NotificationsSection from './NotificationsSection';
import CostGovernanceSection from './CostGovernanceSection';
import { s as form } from './networkEditorStyles';

export default function ObservabilityCostStep({ selectedTag, onTagSelect }: { selectedTag?: string | null; onTagSelect?: (tagName: string) => void }) {
  const { model, setField, homeSource } = useWizard();
  return <div style={form.col}>
    <NotificationsSection />
    <CostGovernanceSection model={homeSource?.model ?? model} regional={model.foundation.stackScope === 'regional'}
      selectedTag={selectedTag} onTagSelect={onTagSelect}
      onChange={(costGovernance) => setField('foundation', { ...model.foundation, costGovernance })} />
  </div>;
}
