import regionReferenceImage from '../assets/landing-zone-regions.jpg';
import { oracle } from '../theme';

export default function RegionReference() {
  return <main style={{ minHeight: '100dvh', boxSizing: 'border-box', padding: 24,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
    background: oracle.appBg, color: oracle.text, fontFamily: '"Oracle Sans", "Helvetica Neue", system-ui, sans-serif' }}>
    <h1 style={{ margin: 0, fontSize: 20, textAlign: 'center' }}>Region reference guide</h1>
    <img src={regionReferenceImage}
      alt="OCI Landing Zone reference: tenancy Home region, Primary region and Secondary region, with their global and regional resource scopes."
      width={1753} height={897}
      style={{ display: 'block', width: '100%', maxWidth: 1040, height: 'auto', maxHeight: '72dvh', objectFit: 'contain' }} />
    <a className="guide-link" href={regionReferenceImage} style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, fontSize: 14 }}>
      View full-size image
    </a>
  </main>;
}
