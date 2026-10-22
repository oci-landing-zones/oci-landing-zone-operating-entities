import { oracle } from '../../theme';
import PlatformTemplatesStep from './PlatformTemplatesStep';
import { useWizard } from '../wizardContext';

export default function PlatformsStep() {
  const { model } = useWizard();
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section aria-labelledby="platforms-heading">
        <h2 id="platforms-heading" style={{ fontSize: 15, fontWeight: 700, color: oracle.ink, marginBottom: 8 }}>Platforms</h2>
        <p style={{ fontSize: 12.5, lineHeight: 1.5, color: oracle.textMuted }}>
          {model.foundation.stackScope === 'regional' ? 'Add only the regional platforms needed for DR. Matching platform compartments and IAM must already exist in Home.' : 'Add a platform when a workload needs its own network or dedicated management. Dedicated compartments, IAM groups, policies, and events will be added to the landing zone to manage the platform.'}
        </p>
      </section>
      <PlatformTemplatesStep />
    </div>
  );
}
