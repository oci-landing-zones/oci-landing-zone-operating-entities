import type { DiagramNode } from '../model/types';
import { oracle } from '../theme';

const escapeText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function operatorWorkstationSvg(node: Pick<DiagramNode, 'width' | 'height' | 'label'>): string {
  const [title, connection = ''] = node.label.split('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${node.width}" height="${node.height}" viewBox="0 0 240 100">
    <g fill="#ffffff" stroke="#2A5B66" stroke-width="2" stroke-linejoin="round">
      <rect x="12" y="16" width="48" height="33" rx="2"/>
      <path d="M12 49 5 59H67L60 49Z"/>
      <path d="M26 54H46" fill="none"/>
    </g>
    <path d="M29 29 24 33 29 37M36 37H44" fill="none" stroke="#2A5B66" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M36 59V69" fill="none" stroke="#2A5B66" stroke-width="1.5"/>
    <path d="M20 87a8 8 0 0 1-1-16 11 11 0 0 1 21-2 9 9 0 0 1 11 5 7 7 0 0 1-2 13Z" fill="#ffffff" stroke="#2A5B66" stroke-width="1.5" stroke-linejoin="round"/>
    <g font-family="Arial, Helvetica, sans-serif">
      <text x="80" y="33" font-size="13" font-weight="700" fill="${oracle.ink}">${escapeText(title)}</text>
      <text x="80" y="52" font-size="12" fill="${oracle.textMuted}">${escapeText(connection)}</text>
      <text x="80" y="82" font-size="12" fill="${oracle.textMuted}">Internet</text>
    </g>
  </svg>`;
}
