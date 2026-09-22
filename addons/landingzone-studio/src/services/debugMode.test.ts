import { describe, expect, it } from 'vitest';
import { EMPTY_DEBUG_SEQUENCE, registerDebugClick } from './debugMode';

describe('debug-mode click gesture', () => {
  it('activates on five clicks within five seconds', () => {
    let sequence = EMPTY_DEBUG_SEQUENCE;
    let activated = false;
    for (const now of [1_000, 1_800, 2_600, 3_400, 5_900]) {
      ({ sequence, activated } = registerDebugClick(sequence, now));
    }
    expect(activated).toBe(true);
    expect(sequence).toEqual(EMPTY_DEBUG_SEQUENCE);
  });

  it('restarts after the five-second window expires', () => {
    let sequence = EMPTY_DEBUG_SEQUENCE;
    ({ sequence } = registerDebugClick(sequence, 1_000));
    ({ sequence } = registerDebugClick(sequence, 2_000));
    const result = registerDebugClick(sequence, 6_001);
    expect(result).toEqual({ sequence: { count: 1, startedAt: 6_001 }, activated: false });
  });
});
