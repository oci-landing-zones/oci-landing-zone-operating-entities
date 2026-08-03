export interface DebugClickSequence {
  count: number;
  startedAt: number;
}

export const EMPTY_DEBUG_SEQUENCE: DebugClickSequence = { count: 0, startedAt: 0 };

/** Register one click in the hidden debug gesture: five clicks within five seconds. */
export function registerDebugClick(
  sequence: DebugClickSequence,
  now: number,
): { sequence: DebugClickSequence; activated: boolean } {
  const withinWindow = sequence.count > 0 && now - sequence.startedAt <= 5_000;
  const next = withinWindow
    ? { count: sequence.count + 1, startedAt: sequence.startedAt }
    : { count: 1, startedAt: now };

  if (next.count >= 5) {
    return { sequence: EMPTY_DEBUG_SEQUENCE, activated: true };
  }
  return { sequence: next, activated: false };
}
