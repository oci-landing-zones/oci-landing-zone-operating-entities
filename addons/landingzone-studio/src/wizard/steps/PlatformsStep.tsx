import type { ReactNode } from 'react';
import { useWizard } from '../wizardContext';
import { exadataReadiness, platformReadiness } from '../../services/platformReadiness';
import { oracle } from '../../theme';
import PlatformTemplatesStep from './PlatformTemplatesStep';
import ExadataStep from './ExadataStep';

function PlatformSection({ title, description, status, errors = [], children }: {
  title: string;
  description: string;
  status: string;
  errors?: string[];
  children: ReactNode;
}) {
  return (
    <details className="platform-section">
      <summary className="platform-section-summary">
        <span className="platform-section-copy">
          <span className="platform-section-title">{title}</span>
          <span className="platform-section-description">{description}</span>
        </span>
        <span className="platform-section-status" style={status === 'Needs attention' ? { color: oracle.redDark } : undefined}>{status}</span>
      </summary>
      <div className="platform-section-content">
        {errors.length > 0 && <details style={{ padding: '10px 4px', color: oracle.text, fontSize: 13 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Review {errors.length} issues before generating</summary>
          <ul style={{ margin: '8px 0', paddingLeft: 20 }}>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </details>}
        {children}
      </div>
    </details>
  );
}

export default function PlatformsStep() {
  const { model } = useWizard();
  const oke = platformReadiness(model, 'oke_simple');
  const ocvs = platformReadiness(model, 'ocvs');
  const exacc = exadataReadiness(model, 'exacc');
  const exacs = exadataReadiness(model, 'exacs');
  const hasCustom = model.platforms.some((platform) => platform.type === 'custom')
    || model.sharedPlatforms.some((platform) => (platform.type ?? 'custom') === 'custom');
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section aria-labelledby="platforms-heading">
        <h2 id="platforms-heading" style={{ fontSize: 15, fontWeight: 700, color: oracle.ink, marginBottom: 8 }}>Platforms</h2>
        <p style={{ fontSize: 12.5, lineHeight: 1.5, color: oracle.textMuted }}>
          Add a platform when a workload needs its own network or dedicated management. Dedicated compartments, IAM groups, policies, and events will be added to the landing zone to manage the platform.
        </p>
      </section>
      <PlatformSection title="OKE" description="Kubernetes platforms per environment" status={oke.status} errors={oke.errors}>
        <PlatformTemplatesStep platformType="oke_simple" />
      </PlatformSection>
      <PlatformSection title="OCVS" description="Shared or environment VMware platforms" status={ocvs.status} errors={ocvs.errors}>
        <PlatformTemplatesStep platformType="ocvs" />
      </PlatformSection>
      <PlatformSection title="EXACC" description="Exadata Database Service on Cloud@Customer" status={exacc.status} errors={exacc.errors}>
        <ExadataStep type="exacc" />
      </PlatformSection>
      <PlatformSection title="EXACS" description="Exadata Database Service on Dedicated Infrastructure" status={exacs.status} errors={exacs.errors}>
        <ExadataStep type="exacs" />
      </PlatformSection>
      {hasCustom && <PlatformSection title="Existing custom networks" description="Retained from this saved design and included in exports. Review or remove them here." status="Retained">
        <PlatformTemplatesStep platformType="custom" existingOnly />
      </PlatformSection>}
    </div>
  );
}
