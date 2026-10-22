/**
 * Dashboard ("/") — the intro band, then the saved Landing Zones with full
 * management (open, duplicate, delete) and a "New Landing Zone" action.
 * Naming is edited only as the first field in Foundation.
 */

import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import Hero from '../components/Hero';
import LicenseNotice from '../components/LicenseNotice';
import SavedLzList from '../components/SavedLzList';
import { oracle } from '../theme';
import { createLZ, listLZs } from '../services/lzStore';
import { newLzModel } from '../model/defaults';
import ImportLandingZoneDialog from '../components/ImportLandingZoneDialog';

const FONT = '"Oracle Sans", "Helvetica Neue", system-ui, -apple-system, sans-serif';

const s: Record<string, React.CSSProperties> = {
  app:  { minHeight: '100vh', background: oracle.appBg, fontFamily: FONT, color: oracle.text },
  page: { maxWidth: 1100, margin: '0 auto', padding: '40px 24px 64px' },
};

export default function Dashboard() {
  const navigate = useNavigate();
  // Seeded from the store, then kept in step with the list — deleting the last
  // build has to bring the full-size Hero back.
  const [count, setCount] = useState(() => listLZs().length);
  const [showImport, setShowImport] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const hasRecords = count > 0;
  const onCountChange = useCallback((n: number) => setCount(n), []);

  function handleNew() {
    const result = createLZ(undefined, newLzModel());
    if (!result.ok || !result.record) { setStorageError(result.message ?? 'Could not create the Landing Zone.'); return; }
    navigate(`/lz/${result.record.id}`);
  }

  return (
    <div style={s.app}>
      <TopBar />
      {/* The intro band always sits at the top; it shrinks to a slim header once
          there are saved builds to list below it. */}
      <Hero onNew={handleNew} onImport={() => setShowImport(true)} compact={hasRecords} />
      {showImport && <ImportLandingZoneDialog onClose={() => setShowImport(false)} onImported={(id) => navigate(`/lz/${id}`)} />}
      {storageError && <p role="alert" style={{ ...s.page, color: oracle.redDark }}>{storageError}</p>}


      {hasRecords && (
        <div style={s.page}>
          <SavedLzList onCountChange={onCountChange} />
        </div>
      )}

      <LicenseNotice />
    </div>
  );
}
