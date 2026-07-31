/**
 * WizardStepper — the six-step navigation across the top of the wizard.
 * Buttons are clickable to jump between steps; the active step is highlighted
 * in Oracle red. Step content is owned by the shell; this is pure navigation.
 */

/* eslint-disable react-refresh/only-export-components */

import React from 'react';
import { oracle } from '../theme';

export interface WizardStep {
  id: number;
  label: string;
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: 1, label: 'Foundation' },
  { id: 2, label: 'Hub Network' },
  { id: 3, label: 'Projects' },
  { id: 4, label: 'Platforms' },
  { id: 5, label: 'Review' },
  { id: 6, label: 'Finish' },
];

const css = {
  row: { display: 'flex', gap: 10, margin: '4px 0 22px', alignItems: 'stretch' } as React.CSSProperties,
  step: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '11px 14px', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
    border: `1px solid ${oracle.border}`, borderRadius: 8, background: oracle.surface,
    color: oracle.textMuted, cursor: 'pointer', whiteSpace: 'nowrap',
    transition: 'background 120ms ease, border-color 120ms ease, color 120ms ease',
  } as React.CSSProperties,
  num: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 22, height: 22, borderRadius: '50%', fontSize: 12, fontWeight: 800, flexShrink: 0,
  } as React.CSSProperties,
};

function stepStyle(active: boolean): React.CSSProperties {
  if (active) {
    return { ...css.step, background: oracle.red, borderColor: oracle.redDark, color: '#fff' };
  }
  return css.step;
}

function numStyle(active: boolean): React.CSSProperties {
  if (active) {
    return { ...css.num, background: 'rgba(255,255,255,0.22)', color: '#fff' };
  }
  return { ...css.num, background: oracle.surfaceAlt, color: oracle.textMuted };
}

export default function WizardStepper({
  steps = WIZARD_STEPS,
  active,
  onSelect,
}: {
  steps?: WizardStep[];
  active: number;
  onSelect: (id: number) => void;
}) {
  return (
    <nav style={css.row} aria-label="Wizard steps">
      {steps.map((step) => {
        const isActive = step.id === active;
        return (
          <button
            key={step.id}
            type="button"
            style={stepStyle(isActive)}
            aria-current={isActive ? 'step' : undefined}
            onClick={() => onSelect(step.id)}
          >
            <span style={numStyle(isActive)}>{step.id}</span>
            {step.label}
          </button>
        );
      })}
    </nav>
  );
}
