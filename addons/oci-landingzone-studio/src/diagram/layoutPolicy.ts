import type { GeneratedResourceInventory } from '../services/generatedResources';

export const DIAGRAM_LAYOUT = {
  padding: 16,
  gap: 12,
  resourceMinWidth: 180,
  maxResourceColumns: 3,
} as const;

export const ATTACHMENT_LABEL = {
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 11.5,
  fontWeight: 800,
  sidePadding: 16,
} as const;

/** Conservative bold Arial advances keep complete labels clear of terminal dots. */
export function attachmentLabelLayout(label: string): { textWidth: number; width: number } {
  const textWidth = Math.ceil(Math.max(...label.split('\n').map((line) => Array.from(line).reduce((sum, char) => sum + ATTACHMENT_LABEL.fontSize * (
    /[mwMW@%]/.test(char) ? 0.95 : /[iljI.,'!:;| ]/.test(char) ? 0.35
      : /[frt-]/.test(char) ? 0.46 : /[A-Z]/.test(char) ? 0.8 : char.charCodeAt(0) <= 127 ? 0.65 : 1
  ), 0))));
  return { textWidth, width: Math.max(150, textWidth + 2 * ATTACHMENT_LABEL.sidePadding) };
}

export const DRG_CAPTION = {
  fontFamily: ATTACHMENT_LABEL.fontFamily,
  fontSize: ATTACHMENT_LABEL.fontSize,
  fontWeight: ATTACHMENT_LABEL.fontWeight,
  lineHeight: 1.2,
  gap: 2,
} as const;

export function drgCaptionLayout(label: string, glyphWidth: number) {
  const textWidth = attachmentLabelLayout(label).textWidth;
  const width = Math.max(glyphWidth, textWidth);
  return { textWidth, width, overhang: (width - glyphWidth) / 2, height: DRG_CAPTION.fontSize * DRG_CAPTION.lineHeight };
}

export function drgCaptionBounds(rect: { x: number; y: number; width: number; height: number; label: string }) {
  const caption = drgCaptionLayout(rect.label, rect.width);
  return { x: rect.x + (rect.width - caption.textWidth) / 2, y: rect.y + rect.height + DRG_CAPTION.gap,
    width: caption.textWidth, height: caption.height };
}

/** Reserve readable resource columns before laying out their compartment ancestors. */
export function minimumOwnerWidths(inventory: GeneratedResourceInventory): Map<string, number> {
  const counts = new Map<string, number>();
  for (const group of inventory.groups) {
    if (group.items.length) counts.set(group.compartmentKey, (counts.get(group.compartmentKey) ?? 0) + 1);
  }
  const compartments = new Map(inventory.compartments.map((compartment) => [compartment.key, compartment]));
  const widths = new Map<string, number>();
  for (const [owner, count] of counts) {
    const columns = Math.min(count, DIAGRAM_LAYOUT.maxResourceColumns);
    let width: number = 2 * DIAGRAM_LAYOUT.padding + columns * DIAGRAM_LAYOUT.resourceMinWidth + (columns - 1) * DIAGRAM_LAYOUT.gap;
    let key: string | undefined = owner;
    const seen = new Set<string>();
    while (key) {
      const compartment = compartments.get(key);
      if (!compartment || seen.has(key)) throw new Error(`Generated resource compartment ancestry is unavailable for ${key}.`);
      seen.add(key);
      widths.set(key, Math.max(widths.get(key) ?? 0, width));
      key = compartment.parentKey;
      width += 2 * DIAGRAM_LAYOUT.padding;
    }
  }
  return widths;
}
