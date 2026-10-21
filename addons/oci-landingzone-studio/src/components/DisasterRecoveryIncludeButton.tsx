import { oracle } from '../theme';

export default function DisasterRecoveryIncludeButton({ included, resourceName, disabled = false, onClick }: {
  included: boolean; resourceName: string; disabled?: boolean; onClick: () => void;
}) {
  return <button type="button" disabled={disabled} aria-label={`${included ? 'Remove' : 'Add'} ${resourceName} ${included ? 'from' : 'to'} DR`} aria-pressed={included}
    title={included ? 'Included in DR — click to remove' : 'Add to DR'}
    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0, padding: '8px 10px', marginTop: 8, border: `1px solid ${oracle.greenDark}`, borderRadius: 4, background: included ? oracle.greenDark : oracle.greenFill, color: included ? oracle.surface : oracle.greenDark, fontSize: 12.5, fontWeight: 700, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap' }}
    onClick={onClick}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{included ? <path d="m5 12 4 4L19 6" /> : <path d="M12 5v14M5 12h14" />}</svg>
    {included ? 'Included in DR' : 'Add to DR'}
  </button>;
}
