export function tagHelpPosition(anchor: { left: number; top: number; bottom: number }, viewportWidth: number, viewportHeight: number, height: number) {
  const gap = 12;
  const fitsLeft = anchor.left >= 244;
  const width = Math.min(320, viewportWidth - gap * 2, fitsLeft ? anchor.left - gap * 2 : 320);
  const left = fitsLeft ? anchor.left - width - gap : Math.max(gap, Math.min(anchor.left, viewportWidth - width - gap));
  const preferredTop = fitsLeft ? anchor.top : anchor.bottom + gap;
  const top = Math.max(gap, Math.min(preferredTop, viewportHeight - height - gap));
  return { left, top, width };
}
