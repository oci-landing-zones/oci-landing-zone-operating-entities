/**
 * Dashboard ("/") — the intro band, then the saved Landing Zones with full
 * management (open, rename, duplicate, delete) and a "New Landing Zone" action.
 * The list itself is `SavedLzList`, shared with the wizard's closing step.
 */

import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import Hero from '../components/Hero';
import DisclaimerNote from '../components/DisclaimerNote';
import SavedLzList from '../components/SavedLzList';
import { oracle } from '../theme';
import { createLZ, listLZs } from '../services/lzStore';

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
  const hasRecords = count > 0;
  const onCountChange = useCallback((n: number) => setCount(n), []);

  function handleNew() {
    const rec = createLZ();
    navigate(`/lz/${rec.id}`);
  }

  return (
    <div style={s.app}>
      <TopBar />
      {/* The intro band always sits at the top; it shrinks to a slim header once
          there are saved builds to list below it. */}
      <Hero onNew={handleNew} compact={hasRecords} />

      {hasRecords && (
        <div style={s.page}>
          <SavedLzList onCountChange={onCountChange} />
        </div>
      )}

      <DisclaimerNote />
    </div>
  );
}
