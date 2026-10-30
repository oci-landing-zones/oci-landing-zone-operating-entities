import type { DiagramNode } from '../model/types';
import { DRG_SVG } from './icons';
import { attachmentLabelLayout } from './layoutPolicy';

const TEAL = '#2D5967';
const INK = '#3f4750';
const LINE = 18;
export const HYBRID_LINK_WIDTH = 360;
export const HYBRID_REGION_GAP = 64;
export const VPN_TUNNEL_HEIGHT = 112;
export const VPN_PAIR_PITCH = (VPN_TUNNEL_HEIGHT + 16) * 2;
export const FASTCONNECT_LINE_Y = 72;

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function text(x: number, y: number, value: string, size = 12, anchor = 'start', fill = INK, weight = 400): string {
  return `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${fill}" font-weight="${weight}">${escapeXml(value)}</text>`;
}

function equipmentNameLines(name: string): string[] {
  return name.startsWith('ocid1.') ? name.match(/.{1,20}/g) ?? [] : [name];
}

export function premisesLayout(premises: NonNullable<DiagramNode['premises']>, label: string) {
  const names = equipmentNameLines(premises.equipmentName);
  const width = Math.max(220, attachmentLabelLayout([label, premises.equipmentLabel, ...names, premises.equipmentAddress ?? '', ...premises.cidrs].join('\n')).width);
  const halfSpan = (premises.connectionCount ?? 1) * VPN_PAIR_PITCH / 2 - 8;
  const center = Math.max(premises.connectionCount === 0 ? 130 : 180, 140 + premises.cidrs.length * LINE, halfSpan + 48);
  const height = Math.max(premises.connectionCount === 0 ? 280 : 360, center + Math.max(140 + (names.length - 1) * LINE, halfSpan + 48));
  return { width, height, center };
}

export function fastConnectHeight(circuit: NonNullable<DiagramNode['fastConnect']>) {
  return 104 + circuit.mappings.length * 42;
}

/** Equipment and transport links retain separate graph nodes and paths. */
export function hybridTopologySvg(node: DiagramNode): string {
  const { width, height } = node;
  let body: string;
  if (node.kind === 'premises') {
    const premises = node.premises!;
    const { center } = premisesLayout(premises, node.label);
    const names = equipmentNameLines(premises.equipmentName);
    const captionOffset = (names.length - 1) * LINE;
    const cpe = premises.equipmentLabel.includes('CPE');
    body = `<rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="12" fill="#f5f4f2" stroke="#b0aca8" stroke-width="1.5"/>`
      + text(14, 27, 'On-Premises', 15, 'start', INK, 700)
      + premises.cidrs.map((cidr, index) => text(14, 49 + index * LINE, cidr, 12, 'start', '#00559A')).join('')
      + text(width / 2, center - 67, premises.equipmentLabel, 13, 'middle')
      + text(width / 2, center - 47, premises.equipmentAddress ?? '', 12, 'middle')
      + names.map((name, index) => text(width / 2, center + 58 + index * LINE, name, 12, 'middle', INK, 700)).join('')
      + text(width / 2, center + 80 + captionOffset, cpe ? 'Customer Premises' : 'Customer network', 12, 'middle')
      + text(width / 2, center + 97 + captionOffset, cpe ? 'Equipment' : '', 12, 'middle')
      + text(14, height - 16, node.label, 12, 'start', INK, 700);
  } else if (node.kind === 'vpn' || node.kind === 'customerrouter') {
    body = `<rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="2" fill="#ffffff" stroke="${TEAL}" stroke-width="2"/>`
      + DRG_SVG.replace('width="40" height="40"', `x="3" y="3" width="${width - 6}" height="${height - 6}"`);
  } else if (node.kind === 'fastconnect') {
    const circuit = node.fastConnect!;
    body = text(width / 2, 14, node.label, 12, 'middle', INK, 700)
      + text(width / 2, 34, circuit.provider, 11, 'middle')
      + text(width / 2, 52, circuit.bandwidth ?? '', 11, 'middle')
      + `<path d="M0 ${FASTCONNECT_LINE_Y} H${width}" fill="none" stroke="${TEAL}" stroke-width="1.8"/>`
      + `<g transform="translate(${width / 2 - 18} ${FASTCONNECT_LINE_Y - 12})" fill="#ffffff" stroke="${TEAL}" stroke-width="1.8"><rect width="36" height="24" rx="2"/><path d="M5 8h26m-22-4-4 4 4 4m18 0 4 4-4 4M5 16h26"/></g>`
      + circuit.mappings.map((mapping, index) => {
        const y = 112 + index * 42;
        return text(width / 2, y, `${mapping.name}${mapping.vlan != null ? ` · VLAN ${mapping.vlan}` : ''}`, 10, 'middle')
          + text(0, y + 17, mapping.customerAddress ? `Customer ${mapping.customerAddress}` : '', 11)
          + text(width, y + 17, mapping.oracleAddress ? `Oracle ${mapping.oracleAddress}` : '', 11, 'end');
      }).join('');
  } else {
    const tunnel = node.vpnTunnel!;
    const middle = width / 2, y = height / 2;
    const address = (x: number, value: string | undefined, side: string, anchor: string) => value
      ? text(x, y - 29, `IPv4 inside tunnel interface · ${side}`, 9, anchor) + text(x, y - 12, value, 12, anchor)
      : '';
    body = `<path d="M0 ${y} H${width}" fill="none" stroke="${TEAL}" stroke-width="1.8"/>`
      + `<g transform="translate(${middle - 17} ${y - 21})" fill="#ffffff" stroke="${TEAL}" stroke-width="1.8"><path d="M8 18v-7a9 9 0 0 1 18 0v7h-4v-7a5 5 0 0 0-10 0v7Z"/><rect x="4" y="18" width="26" height="23" rx="1"/><path d="m0 25-5 5 5 5m34-10 5 5-5 5"/><circle cx="17" cy="28" r="2" fill="${TEAL}"/><path d="M17 30v5"/></g>`
      + text(middle, 12, node.label, 12, 'middle')
      + address(0, tunnel.customerAddress, 'CPE', 'start')
      + address(width, tunnel.oracleAddress, 'Oracle', 'end');
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"><title>${escapeXml(node.label)}</title><g font-family="Arial, Helvetica, sans-serif">${body}</g></svg>`;
}
