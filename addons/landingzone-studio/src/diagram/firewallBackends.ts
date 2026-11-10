import { FIREWALL_SVG } from './icons';

export const FIREWALL_BACKEND_GAP = 72;

/** Illustrative third-party NLB backends, not additional deployed resources. */
export function firewallBackendBridgeSvg(width: number, upperArm = 0, lowerArm = 0): string {
  const height = upperArm + FIREWALL_BACKEND_GAP + lowerArm;
  const symbols = [0.28, 0.72].map((fraction, index) => {
    const x = width * fraction;
    const upperPortX = x - 26, upperPortY = Math.max(4, upperArm - 12);
    const iconY = upperArm + 20, iconCenterY = iconY + 21;
    const lowerPortX = x + 26;
    const lowerPortY = iconCenterY + (iconCenterY - upperPortY) + 14;
    const icon = FIREWALL_SVG.replace('width="48" height="48"', `x="${x - 21}" y="${iconY}" width="42" height="42"`);
    return `<path d="M${upperPortX},${upperPortY} V${iconCenterY} H${x - 18} M${x + 18},${iconCenterY} H${lowerPortX} V${lowerPortY}" fill="none" stroke="#2D5967" stroke-width="1.2" stroke-linejoin="round"/>
      <circle cx="${upperPortX}" cy="${upperPortY}" r="2.5" fill="#2D5967"/>
      <circle cx="${lowerPortX}" cy="${lowerPortY}" r="2.5" fill="#2D5967"/>
      ${icon}<text x="${x}" y="${upperArm + 19}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="9" font-weight="700" fill="#2D5967">Firewall ${index + 1}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>Illustrative third-party firewall backends for the untrust and trust NLBs</title><g opacity="0.45">${symbols}</g></svg>`;
}
