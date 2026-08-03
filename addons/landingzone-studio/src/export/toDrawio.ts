import type { DiagramModel, DiagramNode } from '../model/types';
import { oracle } from '../theme';
import { SHIELD_SVG } from '../diagram/shieldSvg';
import { ROUTE_TABLE_SVG } from '../diagram/routeTableSvg';
import { IGW_SVG, NATGW_SVG, SGW_SVG, FIREWALL_SVG, LB_SVG, OSN_SVG, DRG_SVG, VM_SVG } from '../diagram/icons';

const svgUri = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;
const SHIELD_URI = svgUri(SHIELD_SVG);
const ROUTE_TABLE_URI = svgUri(ROUTE_TABLE_SVG);
const OSN_URI = svgUri(OSN_SVG);
const DRG_URI = svgUri(DRG_SVG);
const VM_URI = svgUri(VM_SVG);
const ICON_URIS: Record<string, string> = {
  igw: svgUri(IGW_SVG),
  natgw: svgUri(NATGW_SVG),
  sgw: svgUri(SGW_SVG),
  firewall: svgUri(FIREWALL_SVG),
  lb: svgUri(LB_SVG),
};
const CAPTION_COLORS = { green: '#1E7B2F', orange: '#C25425' } as const;

/** A Security Zone shield, anchored to the top-right of its compartment cell. */
function shieldCell(node: DiagramNode): string {
  const style = `shape=image;imageAspect=0;aspect=fixed;noLabel=1;image=${SHIELD_URI};`;
  return (
    `        <mxCell id="${node.id}-shield" value="" style="${style}" vertex="1" parent="${node.id}">\n` +
    `          <mxGeometry x="${node.width - 22}" y="5" width="15" height="15" as="geometry" />\n` +
    `        </mxCell>`
  );
}

/** An Oracle Services Network glyph straddling the bottom-right corner of a VCN. */
function osnCell(node: DiagramNode): string {
  const style = `shape=image;imageAspect=0;aspect=fixed;noLabel=1;image=${OSN_URI};`;
  return (
    `        <mxCell id="${node.id}-osn" value="" style="${style}" vertex="1" parent="${node.id}">\n` +
    `          <mxGeometry x="${node.width - 13}" y="${node.height - 13}" width="26" height="26" as="geometry" />\n` +
    `        </mxCell>`
  );
}

/** A route-table icon straddling the right border of its subnet cell (half outside). */
function routeTableCell(node: DiagramNode): string {
  const style = `shape=image;imageAspect=0;aspect=fixed;noLabel=1;image=${ROUTE_TABLE_URI};`;
  return (
    `        <mxCell id="${node.id}-rt" value="" style="${style}" vertex="1" parent="${node.id}">\n` +
    `          <mxGeometry x="${node.width - 10}" y="${Math.round((node.height - 20) / 2)}" width="20" height="20" as="geometry" />\n` +
    `        </mxCell>`
  );
}

/** Centred icon + coloured caption inside a decorated subnet (firewall / LB). */
function subnetIconCells(node: DiagramNode): string[] {
  if (!node.icon) return [];
  const cells = [
    `        <mxCell id="${node.id}-icon" value="" style="shape=image;imageAspect=0;aspect=fixed;noLabel=1;image=${ICON_URIS[node.icon]};" vertex="1" parent="${node.id}">\n` +
    `          <mxGeometry x="${Math.round((node.width - 42) / 2)}" y="40" width="42" height="42" as="geometry" />\n` +
    `        </mxCell>`,
  ];
  if (node.caption) {
    const color = CAPTION_COLORS[node.captionTone ?? 'orange'];
    const captionY = node.ipNote ? node.height - 44 : node.height - 26;
    cells.push(
      `        <mxCell id="${node.id}-caption" value="${htmlTextAttribute(node.caption)}" style="text;html=1;align=center;verticalAlign=middle;fontStyle=1;fontSize=12;fontColor=${color};" vertex="1" parent="${node.id}">\n` +
      `          <mxGeometry x="0" y="${captionY}" width="${node.width}" height="20" as="geometry" />\n` +
      `        </mxCell>`,
    );
  }
  if (node.ipNote) {
    cells.push(
      `        <mxCell id="${node.id}-ip" value="${htmlTextAttribute(node.ipNote)}" style="text;html=1;align=center;verticalAlign=middle;fontStyle=1;fontSize=11;fontColor=${oracle.cidrBlue};" vertex="1" parent="${node.id}">\n` +
      `          <mxGeometry x="0" y="${node.height - 24}" width="${node.width}" height="18" as="geometry" />\n` +
      `        </mxCell>`,
    );
  }
  return cells;
}

/** VM endpoint inside an icon-less subnet: name (top), VM glyph, in-subnet IP. */
function subnetEndpointCells(node: DiagramNode): string[] {
  if (!node.endpointName) return [];
  const iconX = Math.round((node.width - 30) / 2);
  const cells = [
    `        <mxCell id="${node.id}-ep-name" value="${htmlTextAttribute(node.endpointName)}" style="text;html=1;align=center;verticalAlign=middle;fontStyle=1;fontSize=11;fontColor=${oracle.ink};" vertex="1" parent="${node.id}">\n` +
    `          <mxGeometry x="0" y="38" width="${node.width}" height="16" as="geometry" />\n` +
    `        </mxCell>`,
    `        <mxCell id="${node.id}-ep-icon" value="" style="shape=image;imageAspect=0;aspect=fixed;noLabel=1;image=${VM_URI};" vertex="1" parent="${node.id}">\n` +
    `          <mxGeometry x="${iconX}" y="55" width="30" height="30" as="geometry" />\n` +
    `        </mxCell>`,
  ];
  if (node.endpointIp) {
    cells.push(
      `        <mxCell id="${node.id}-ep-ip" value="${htmlTextAttribute(node.endpointIp)}" style="text;html=1;align=center;verticalAlign=middle;fontStyle=1;fontSize=10;fontColor=${oracle.cidrBlue};" vertex="1" parent="${node.id}">\n` +
      `          <mxGeometry x="0" y="${node.height - 22}" width="${node.width}" height="16" as="geometry" />\n` +
      `        </mxCell>`,
    );
  }
  return cells;
}

/** Gateway: teal icon with its label underneath, straddling the VCN border. */
function gatewayStyle(node: DiagramNode): string {
  return `shape=image;imageAspect=0;aspect=fixed;image=${ICON_URIS[node.icon ?? 'igw']};` +
    'verticalLabelPosition=bottom;verticalAlign=top;labelBackgroundColor=#ffffff;fontSize=9;fontStyle=1;html=1;whiteSpace=wrap;';
}

/**
 * Pure: DiagramModel → draw.io (.drawio) XML.
 *
 * A .drawio file is just mxGraph XML wrapped in <mxfile><diagram>. We emit it
 * uncompressed so it's human-readable, diffable, and unit-testable, and opens
 * directly in draw.io / diagrams.net. Animated edges map to draw.io's native
 * `flowAnimation=1` edge style — the same "packet flow" the live canvas shows.
 */

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Escape untrusted text before it is embedded in a draw.io HTML label. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Plain text consumed by draw.io's html=1 renderer, then stored in XML. */
function htmlTextAttribute(value: string): string {
  return escapeXml(escapeHtml(value));
}

function nodeStyle(node: DiagramNode): string {
  // Matches the on-screen canvas (labels top-left): Region = light container,
  // Tenancy = black dashed, Landing zone = red dotted, compartments = yellow
  // (shared) or green (environment).
  const containerTop = 'whiteSpace=wrap;html=1;container=1;collapsible=0;verticalAlign=top;align=left;spacingLeft=6;spacingTop=4;fontStyle=1;';
  const compTop = 'whiteSpace=wrap;html=1;verticalAlign=middle;align=left;spacingLeft=8;';
  switch (node.kind) {
    case 'region':
      return `rounded=0;${containerTop}fillColor=#fbfbfb;strokeColor=${oracle.borderStrong};fontColor=${oracle.ink};`;
    case 'tenancy':
      return `rounded=0;${containerTop}dashed=1;dashPattern=8 6;strokeWidth=2;fillColor=none;strokeColor=${oracle.ink};fontColor=${oracle.ink};`;
    case 'landingzone':
      return `rounded=0;${containerTop}dashed=1;dashPattern=1 4;strokeWidth=2;fillColor=#ffffff;strokeColor=${oracle.red};fontColor=${oracle.ink};`;
    case 'compartment': {
      // Compartments that hold nested children render as top-aligned containers.
      const base = node.container ? containerTop : compTop;
      // Gray compartments are solid; compartment boundaries are always square.
      if (node.tone === 'gray')
        return `rounded=0;${base}fillColor=${oracle.compGrayFill};strokeColor=${oracle.compGrayBorder};fontColor=#3f4750;`;
      return node.tone === 'green'
        ? `rounded=0;${base}dashed=1;dashPattern=1 3;fillColor=${oracle.compGreenFill};strokeColor=${oracle.compGreenBorder};fontColor=#3f4750;`
        : `rounded=0;${base}dashed=1;dashPattern=1 3;fillColor=${oracle.compYellowFill};strokeColor=${oracle.compYellowBorder};fontColor=#3f4750;`;
    }
    case 'vcn':
      return `rounded=0;${containerTop}dashed=1;dashPattern=6 4;strokeWidth=2;fillColor=#ffffff;strokeColor=${oracle.vcnBorder};fontColor=${oracle.vcnBorder};`;
    case 'subnet': {
      // Decorated subnets (icon + caption) and endpoint subnets anchor their label to the top.
      const align = node.icon || node.endpointName ? 'whiteSpace=wrap;html=1;verticalAlign=top;align=left;spacingLeft=8;spacingTop=2;' : compTop;
      return `rounded=0;${align}dashed=1;dashPattern=6 4;fillColor=#fffdfb;strokeColor=${oracle.vcnBorder};fontColor=#3f4750;`;
    }
    case 'gateway':
      return gatewayStyle(node);
    case 'drg':
      return `shape=image;imageAspect=0;aspect=fixed;image=${DRG_URI};` +
        `verticalLabelPosition=bottom;verticalAlign=top;fontSize=10;fontStyle=1;fontColor=${oracle.ink};html=1;`;
    case 'attachment':
      return `rounded=1;whiteSpace=wrap;html=1;align=center;verticalAlign=middle;fillColor=#ffffff;strokeColor=#6b7a99;fontColor=#1f3a63;fontStyle=1;fontSize=10;`;
    case 'project':
      return `rounded=0;whiteSpace=wrap;html=1;align=center;verticalAlign=middle;fillColor=#ffffff;strokeColor=${oracle.compGrayBorder};fontColor=${oracle.ink};fontStyle=1;fontSize=11;`;
    case 'routetable':
      return `rounded=0;whiteSpace=wrap;html=1;verticalAlign=top;align=left;spacing=0;spacingLeft=0;spacingTop=0;fillColor=#ffffff;strokeColor=${RT_TONE_COLORS[node.rtTone ?? 'hub']};`;
    case 'rtdot':
      return `ellipse;html=1;fillColor=${node.rtDotConfigured === false ? '#b0aca8' : RT_TONE_COLORS[node.rtDotTone ?? 'hub']};strokeColor=#ffffff;strokeWidth=1.5;`;
  }
}

const RT_TONE_COLORS = { hub: '#8C3A80', gateway: '#8C3A80', drg: '#B23A48', spoke: '#3A8A4E' } as const;

/** HTML label for a route-table cell: coloured header + ONTV columns. */
function routeTableValue(node: DiagramNode): string {
  const color = RT_TONE_COLORS[node.rtTone ?? 'hub'];
  const headers = node.rtColumns === 'drg' ? ['Dest CIDR', 'Next Hop Type', 'Next Hop Name'] : ['Destination', 'Target Type', 'Target', 'Route Type'];
  const cellsOf = (r: NonNullable<DiagramNode['rtRows']>[number]) =>
    node.rtColumns === 'drg' ? [r.destination, r.targetType, r.target] : [r.destination, r.targetType, r.target, r.routeType];
  const th = headers.map((h) => `<td style="color:#999;padding:0 5px;">${escapeHtml(h)}</td>`).join('');
  const rows = (node.rtRows ?? []).map((r) =>
    `<tr>${cellsOf(r).map((c, j) => `<td style="padding:0 5px;${j === 0 ? 'font-family:monospace;color:#3f4750;' : j === 2 ? `color:${color};font-weight:bold;` : 'color:#6b6660;'}">${escapeHtml(c)}</td>`).join('')}</tr>`,
  ).join('');
  const note = node.rtNote
    ? `<div style="font-size:8px;color:#B23A48;font-weight:bold;padding:2px 5px;background:#fdecea;">${escapeHtml(node.rtNote)}</div>`
    : '';
  return `<div style="background:${color};color:#fff;font-weight:bold;padding:3px 6px;">${escapeHtml(node.label)}</div>${note}` +
    `<table style="width:100%;border-collapse:collapse;font-size:8.5px;"><tr>${th}</tr>${rows}</table>`;
}

const PAGE_W = 850;
const PAGE_H = 1100;

/** Two-line subnet label: public names green, private names orange-red. */
function subnetHtmlLabel(node: DiagramNode): string {
  const [name, cidr] = node.label.split('\n');
  const nameColor = node.publicSubnet ? CAPTION_COLORS.green : oracle.subnetName;
  return `<font color="${nameColor}"><b>${escapeHtml(name ?? '')}</b></font><br><font color="${oracle.cidrBlue}">${escapeHtml(cidr ?? '')}</font>`;
}

function nodeCell(node: DiagramNode, dx = 0, dy = 0): string {
  // draw.io renders \n in a value as a line break when html=1 via &#10;.
  // A child cell's `parent` is its container; x/y are then relative to it. The
  // root node (no parent) is offset by (dx, dy) to centre it on the page.
  // Subnet labels colour the two lines (name / CIDR) via an HTML value.
  const value = node.kind === 'routetable'
    ? escapeXml(routeTableValue(node))
    : node.kind === 'subnet' && node.label.includes('\n')
    ? escapeXml(subnetHtmlLabel(node))
    : htmlTextAttribute(node.label).replace(/\n/g, '&#10;');
  const style = nodeStyle(node);
  const parent = escapeXml(node.parentId ?? '1');
  // Gateways/DRG render as a centred icon with the label below; everything else fills its box.
  const geo = node.kind === 'gateway'
    ? { x: node.x + (node.width - 36) / 2, y: node.y, width: 36, height: 36 }
    : node.kind === 'drg'
    ? { x: node.x + (node.width - 40) / 2, y: node.y + (node.height - 40) / 2, width: 40, height: 40 }
    : { x: node.x, y: node.y, width: node.width, height: node.height };
  return (
    `        <mxCell id="${escapeXml(node.id)}" value="${value}" style="${style}" vertex="1" parent="${parent}">\n` +
    `          <mxGeometry x="${geo.x + dx}" y="${geo.y + dy}" width="${geo.width}" height="${geo.height}" as="geometry" />\n` +
    `        </mxCell>`
  );
}

export function toDrawioXml(diagram: DiagramModel, diagramName = 'Landing Zone'): string {
  // Centre the root container on the page (children move with it).
  const root = diagram.nodes.find((n) => !n.parentId);
  const offsetX = Math.max(20, Math.round((PAGE_W - (root?.width ?? 0)) / 2));
  const offsetY = Math.max(20, Math.round((PAGE_H - (root?.height ?? 0)) / 2));
  const nodeCells = diagram.nodes.map((n) =>
    n.parentId ? nodeCell(n) : nodeCell(n, offsetX, offsetY),
  );
  const shieldCells = diagram.nodes
    .filter((n) => n.kind === 'compartment' && n.secure)
    .map(shieldCell);
  const routeTableCells = diagram.nodes
    .filter((n) => n.kind === 'subnet')
    .map(routeTableCell);
  const osnCells = diagram.nodes
    .filter((n) => n.kind === 'vcn')
    .map(osnCell);
  const iconCells = diagram.nodes
    .filter((n) => n.kind === 'subnet' && n.icon)
    .flatMap(subnetIconCells);
  const endpointCells = diagram.nodes
    .filter((n) => n.kind === 'subnet' && n.endpointName)
    .flatMap(subnetEndpointCells);

  const sideXY: Record<string, [number, number]> = { left: [0, 0.5], right: [1, 0.5], top: [0.5, 0], bottom: [0.5, 1] };
  const edgeCells = diagram.edges.flatMap((edge) => {
    // Flow overlay edges carry the full waypoint chain — expand them into one
    // coloured, animated cell per hop so the export mirrors the on-screen packet path.
    if (edge.waypoints && edge.waypoints.length > 1) {
      const color = edge.color ?? '#2196F3';
      const fstyle = `edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=block;startArrow=none;strokeColor=${color};strokeWidth=2.4;flowAnimation=1;jettySize=auto;`;
      return edge.waypoints.slice(1).map((to, i) => (
        `        <mxCell id="${escapeXml(edge.id)}-${i}" value="" style="${fstyle}" edge="1" parent="1" ` +
        `source="${escapeXml(edge.waypoints![i])}" target="${escapeXml(to)}">\n` +
        `          <mxGeometry relative="1" as="geometry" />\n` +
        `        </mxCell>`
      ));
    }
    // Routing connectors: thin muted right-angle lines, no arrowheads (VCN ─ attach ─ DRG).
    let base = `edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=none;startArrow=none;strokeColor=#6b6660;strokeWidth=1.4;jettySize=auto;`;
    if (edge.sourceSide) { const [x, y] = sideXY[edge.sourceSide]; base += `exitX=${x};exitY=${y};exitDx=0;exitDy=0;`; }
    if (edge.targetSide) { const [x, y] = sideXY[edge.targetSide]; base += `entryX=${x};entryY=${y};entryDx=0;entryDy=0;`; }
    const style = edge.animated ? `${base}flowAnimation=1;` : base;
    const value = edge.label ? htmlTextAttribute(edge.label) : '';
    return [
      `        <mxCell id="${escapeXml(edge.id)}" value="${value}" style="${style}" edge="1" parent="1" ` +
      `source="${escapeXml(edge.source)}" target="${escapeXml(edge.target)}">\n` +
      `          <mxGeometry relative="1" as="geometry" />\n` +
      `        </mxCell>`,
    ];
  });

  return (
    `<mxfile host="landing-zone-studio" type="device">\n` +
    `  <diagram id="lz" name="${escapeXml(diagramName)}">\n` +
    `    <mxGraphModel dx="800" dy="600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" ` +
    `arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100" math="0" shadow="0">\n` +
    `      <root>\n` +
    `        <mxCell id="0" />\n` +
    `        <mxCell id="1" parent="0" />\n` +
    [...nodeCells, ...shieldCells, ...routeTableCells, ...osnCells, ...iconCells, ...endpointCells, ...edgeCells].join('\n') + '\n' +
    `      </root>\n` +
    `    </mxGraphModel>\n` +
    `  </diagram>\n` +
    `</mxfile>\n`
  );
}
