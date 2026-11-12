import type { CSSProperties } from 'react';
import { oracle } from '../../theme';

/** Keep CSS-based Governance surfaces on the same palette as the wizard forms. */
export const governanceTheme = {
  '--oracle-border': oracle.border,
  '--oracle-border-strong': oracle.borderStrong,
  '--oracle-text': oracle.text,
  '--oracle-text-muted': oracle.textMuted,
  '--oracle-white': oracle.surface,
  '--governance-surface-alt': oracle.surfaceAlt,
  '--governance-red-dark': oracle.redDark,
} as CSSProperties;
