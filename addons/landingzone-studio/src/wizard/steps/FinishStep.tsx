/**
 * FinishStep — step 6 ("Finish"). The closing step: confirm this Landing Zone is
 * saved, then hand the user back to the full set of saved builds so they can open
 * another one or start fresh. Everything persists to local storage as you type, so
 * there is nothing to "submit" here.
 */

import { type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { s } from './networkEditorStyles';
import { oracle } from '../../theme';
import SavedLzList from '../../components/SavedLzList';
import { createLZ } from '../../services/lzStore';

const local: Record<string, CSSProperties> = {
  note:     { fontSize: 12.5, color: oracle.textMuted, marginBottom: 18, lineHeight: 1.55 },
  savedRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: `1px solid ${oracle.green}`, background: oracle.greenFill, borderRadius: 6, marginBottom: 22 },
  tick:     { width: 20, height: 20, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: oracle.green, color: '#fff', fontSize: 12, fontWeight: 800, lineHeight: 1 },
  savedText:{ fontSize: 13, color: oracle.text },
  actions:  { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 26 },
  primary:  { padding: '10px 18px', fontSize: 13.5, fontWeight: 800, border: `1px solid ${oracle.redDark}`, borderRadius: 4, background: oracle.red, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' },
  secondary:{ padding: '10px 15px', fontSize: 13, fontWeight: 700, border: `1px solid ${oracle.borderStrong}`, borderRadius: 4, background: oracle.surface, color: oracle.text, cursor: 'pointer', fontFamily: 'inherit' },
};

export default function FinishStep() {
  const navigate = useNavigate();
  const { id } = useParams();

  function handleNew() {
    const rec = createLZ();
    navigate(`/lz/${rec.id}`);
  }

  return (
    <div style={s.col}>
      <section style={s.panel}>
        <div style={s.accent} />
        <div style={s.body}>
          <div style={s.title}>Finish</div>

          <div style={local.savedRow}>
            <span style={local.tick} aria-hidden="true">✓</span>
            <span style={local.savedText}>
              <strong>Saved.</strong> Every change is written to this browser as you make it —
              there is nothing left to submit.
            </span>
          </div>

          <div style={local.note}>
            Grab the deployable JSON from step 5 whenever you need it. From here you can pick up
            another Landing Zone or start a new one.
          </div>

          <div style={local.actions}>
            <button type="button" style={local.primary} onClick={handleNew}>+ New Landing Zone</button>
            <button type="button" style={local.secondary} onClick={() => navigate('/')}>Back to start page</button>
          </div>

          <SavedLzList
            title="Saved Landing Zones"
            currentId={id}
            onCurrentDeleted={() => navigate('/')}
          />
        </div>
      </section>
    </div>
  );
}
