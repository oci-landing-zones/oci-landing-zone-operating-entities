import type { LzModel } from '../model/types';
import type { DrDesignDraft } from '../services/disasterRecoveryDesign';
import { ocvsDefaultParams } from '../services/platforms';
import { validateOcvsParams } from '../services/ocvsValidation';
import { oracle } from '../theme';
import OcvsSettingsFields from './OcvsSettingsFields';

export default function DisasterRecoveryOcvsSettingsEditor({ model, draft, platformId, environmentId, onChange }: {
  model: LzModel; draft: DrDesignDraft; platformId: string; environmentId?: string; onChange: (draft: DrDesignDraft) => void;
}) {
  const source = environmentId
    ? model.platforms.find((platform) => platformId === `platform:${platform.id}:${environmentId}`)
    : model.sharedPlatforms.find((platform) => platformId === `shared:${platform.id}`);
  const value = draft.platformOcvsParams?.[platformId] ?? source?.ocvsParams ?? ocvsDefaultParams();
  const errors = validateOcvsParams(value);
  return <details style={{ marginTop: 20 }} aria-label="DR OCVS management cluster settings">
    <summary style={{ fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>OCVS cluster configuration</summary>
    <p style={{ fontSize: 13, lineHeight: 1.6, color: oracle.textMuted }}>Configure the SDDC and management cluster deployed in the DR region. Values start from Home and can be changed independently. Use an availability domain in the selected DR region.</p>
    <OcvsSettingsFields showHeading={false} id={`dr-ocvs-${platformId}`} value={value}
      onChange={(patch) => onChange({ ...draft, platformOcvsParams: { ...draft.platformOcvsParams, [platformId]: { ...value, ...patch } } })} />
    {!!errors.length && <ul style={{ fontSize: 13, lineHeight: 1.6, color: oracle.redDark }} aria-label="DR OCVS validation errors">{errors.map((error) => <li key={error}>{error}</li>)}</ul>}
  </details>;
}
