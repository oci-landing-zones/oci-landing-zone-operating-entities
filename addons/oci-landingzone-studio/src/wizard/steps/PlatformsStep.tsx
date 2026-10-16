import { oracle } from '../../theme';
import PlatformTemplatesStep from './PlatformTemplatesStep';

export default function PlatformsStep() {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section aria-labelledby="platforms-heading">
        <h2 id="platforms-heading" style={{ fontSize: 15, fontWeight: 700, color: oracle.ink, marginBottom: 8 }}>Platforms</h2>
        <p style={{ fontSize: 12.5, lineHeight: 1.5, color: oracle.textMuted }}>
          Add a platform when a workload needs its own network or dedicated management. Dedicated compartments, IAM groups, policies, and events will be added to the landing zone to manage the platform.
        </p>
      </section>
      <PlatformTemplatesStep />
    </div>
  );
}
