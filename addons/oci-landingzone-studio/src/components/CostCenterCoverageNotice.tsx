import { costCenterCoverageError, type UncoveredCostResource } from '../services/costCenterCoverage';
import { ErrorNotice } from './FieldError';
import type { LzModel } from '../model/types';

export default function CostCenterCoverageNotice({ resources, model }: { resources?: readonly UncoveredCostResource[]; model?: LzModel }) {
  if (resources === undefined) return <p style={{ fontSize: 12, margin: 0 }}>Cost center coverage will be checked against the current configuration before download.</p>;
  const error = costCenterCoverageError(resources, model);
  if (!error) return null;
  return <ErrorNotice title="Incomplete cost center coverage">
    <p style={{ margin: '8px 0', overflowWrap: 'anywhere' }}>{error}</p>
    <details>
      <summary style={{ cursor: 'pointer', padding: '6px 0' }}>View resources without a cost center</summary>
      <ul style={{ paddingLeft: 18, margin: '6px 0', maxHeight: 260, overflowY: 'auto', overflowWrap: 'anywhere' }}>
        {resources.map((resource) => <li key={`${resource.file}:${resource.path}`} style={{ marginBottom: 10 }}>
          <strong>{resource.name}</strong>
          <div style={{ fontSize: 12 }}>{`Platform: ${resource.platform} · Environment: ${resource.environment} · Project: ${resource.project}`}</div>
        </li>)}
      </ul>
    </details>
  </ErrorNotice>;
}
