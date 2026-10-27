import type { DiagramModel, DiagramNode } from '../model/types';
import { oracle } from '../theme';
import { SHIELD_SVG } from '../diagram/shieldSvg';
import { ROUTE_TABLE_SVG } from '../diagram/routeTableSvg';
import { IGW_SVG, NATGW_SVG, SGW_SVG, FIREWALL_SVG, LB_SVG, OSN_SVG, DRG_SVG, VM_SVG } from '../diagram/icons';
import { absoluteNodeRects } from '../diagram/flowGeometry';
import { associationDisplaySegments, flowDisplayPoints, structuralEdgePoints } from '../diagram/displayGeometry';
import { flowGroup, labelAnchor, marksAlong, type Point } from '../diagram/flowOverlayGeometry';
import { createFlowPlayback, flowHopMarkers } from '../diagram/flowPlayback';
import { resourceGroupSvg } from '../diagram/resourceGroups';
import { compartmentStyle } from '../diagram/compartmentStyle';
import { ATTACHMENT_LABEL, DRG_CAPTION } from '../diagram/layoutPolicy';
import { routeTableLayout, ROUTE_TABLE_METRICS } from '../diagram/routeTableLayout';

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

/** Keep the gateway's full model rectangle so edge anchors agree with the canvas. */
function gatewayCells(node: DiagramNode): string[] {
  return [
    `        <mxCell id="${node.id}-icon" value="" style="shape=image;imageAspect=0;aspect=fixed;noLabel=1;image=${ICON_URIS[node.icon ?? 'igw']};" vertex="1" parent="${node.id}">\n` +
    `          <mxGeometry x="${(node.width - 34) / 2}" y="0" width="34" height="34" as="geometry" />\n        </mxCell>`,
    `        <mxCell id="${node.id}-label" value="${htmlTextAttribute(node.label).replace(/\n/g, '&#10;')}" style="text;html=1;align=center;verticalAlign=top;fontSize=10;fontStyle=1;fontColor=${oracle.ink};whiteSpace=wrap;" vertex="1" parent="${node.id}">\n` +
    `          <mxGeometry x="0" y="35" width="${node.width}" height="25" as="geometry" />\n        </mxCell>`,
  ];
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
      const palette = compartmentStyle(node);
      return `rounded=0;${base}${palette.dotted ? 'dashed=1;dashPattern=1 3;' : ''}fillColor=${palette.fill};strokeColor=${palette.stroke};fontColor=${palette.text};`;
    }
    case 'vcn':
      return `rounded=0;${containerTop}dashed=1;dashPattern=6 4;strokeWidth=2;fillColor=#ffffff;strokeColor=${oracle.vcnBorder};fontColor=${oracle.vcnBorder};`;
    case 'subnet': {
      // Decorated subnets (icon + caption) and endpoint subnets anchor their label to the top.
      const align = node.icon || node.endpointName ? 'whiteSpace=wrap;html=1;verticalAlign=top;align=left;spacingLeft=8;spacingTop=2;' : compTop;
      return `rounded=0;${align}dashed=1;dashPattern=6 4;fillColor=#fffdfb;strokeColor=${oracle.vcnBorder};fontColor=#3f4750;`;
    }
    case 'gateway':
      return 'fillColor=none;strokeColor=none;container=1;collapsible=0;';
    case 'drg':
      return `shape=image;imageAspect=0;aspect=fixed;image=${DRG_URI};` +
        `verticalLabelPosition=bottom;verticalAlign=top;spacingTop=${DRG_CAPTION.gap};fontSize=${DRG_CAPTION.fontSize};fontFamily=${DRG_CAPTION.fontFamily};fontStyle=1;fontColor=${oracle.ink};html=1;`;
    case 'attachment':
      return `rounded=1;whiteSpace=nowrap;html=1;align=center;verticalAlign=middle;fillColor=#ffffff;strokeColor=#6b7a99;fontColor=#1f3a63;fontStyle=1;fontSize=${ATTACHMENT_LABEL.fontSize};fontFamily=${ATTACHMENT_LABEL.fontFamily};spacingLeft=${ATTACHMENT_LABEL.sidePadding};spacingRight=${ATTACHMENT_LABEL.sidePadding};`;
    case 'project':
      return `rounded=0;whiteSpace=wrap;html=1;align=center;verticalAlign=${node.container ? 'top' : 'middle'};fillColor=#ECEAE8;strokeColor=${oracle.compGrayBorder};fontColor=${oracle.ink};fontStyle=1;fontSize=12;`;
    case 'routetable':
      return `rounded=0;whiteSpace=wrap;html=1;verticalAlign=top;align=left;spacing=0;spacingLeft=0;spacingTop=0;fillColor=#ffffff;strokeColor=${RT_TONE_COLORS[node.rtTone ?? 'hub']};`;
    case 'rtdot':
      return `ellipse;html=1;fillColor=${node.rtDotConfigured === false ? '#b0aca8' : RT_TONE_COLORS[node.rtDotTone ?? 'hub']};strokeColor=#ffffff;strokeWidth=1.5;`;
    case 'resourcegroup':
      return `shape=image;imageAspect=0;noLabel=1;image=${svgUri(resourceGroupSvg(node.resourceKind!, node.resourceItems ?? [], node.width))};`;
  }
}

const RT_TONE_COLORS = { hub: '#8C3A80', gateway: '#8C3A80', drg: '#B23A48', spoke: '#2E6E3F' } as const;

/** HTML label for a route-table cell: coloured header + ONTV columns. */
function routeTableValue(node: DiagramNode): string {
  const color = RT_TONE_COLORS[node.rtTone ?? 'hub'], m = ROUTE_TABLE_METRICS;
  const layout = routeTableLayout({ label: node.label, columns: node.rtColumns, rowCount: node.rtRows?.length ?? 0, note: node.rtNote, width: node.width });
  const cellsOf = (r: NonNullable<DiagramNode['rtRows']>[number]) =>
    node.rtColumns === 'drg' ? [r.destination, r.targetType, r.target] : [r.destination, r.targetType, r.target, r.routeType];
  const columns = layout.columnWidths.map((width, i) => `<col style="width:${width + (i < layout.columnWidths.length - 1 ? m.gap : 0)}px;">`).join('');
  const lines = (values: string[]) => values.map(escapeHtml).join('<br>');
  const cellPadding = (i: number) => i < layout.columnWidths.length - 1 ? m.gap : 0;
  const th = layout.headerLines.map((values, i) => `<td style="height:${layout.columnHeight}px;box-sizing:border-box;vertical-align:top;color:${oracle.textMuted};padding:${m.columnPadding}px ${cellPadding(i)}px ${m.columnPadding}px 0;font-size:${m.columnSize}px;line-height:${m.columnLine}px;font-weight:700;letter-spacing:${m.letterSpacing}px;border-bottom:${m.border}px solid #eceae8;white-space:nowrap;">${lines(values)}</td>`).join('');
  const rows = (node.rtRows ?? []).map((r) =>
    `<tr style="height:${layout.rowHeight}px;">${cellsOf(r).map((c, j) => {
      const cellColor = j === 0 ? '#3f4750' : j === layout.headerLines.length - 1 ? oracle.textMuted : j === 2 ? color : '#6b6660';
      return `<td title="${escapeHtml(c)}" style="height:${layout.rowHeight}px;box-sizing:border-box;padding:${m.rowPadding}px ${cellPadding(j)}px ${m.rowPadding}px 0;font-size:${m.rowSize}px;line-height:${m.rowLine}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:${cellColor};font-weight:${j === 2 ? 700 : 500};${j === 0 ? 'font-family:monospace;' : ''}">${escapeHtml(c)}</td>`;
    }).join('')}</tr>`,
  ).join('');
  const note = layout.noteHeight ? `<div style="height:${layout.noteHeight}px;box-sizing:border-box;font-size:${m.noteSize}px;line-height:${m.noteLine}px;color:#B23A48;font-weight:700;padding:${m.notePadding}px ${m.paddingX}px;background:#fdecea;white-space:nowrap;">${lines(layout.noteLines)}</div>` : '';
  return `<div style="font-family:${m.fontFamily};box-sizing:border-box;padding:${m.border}px;">` +
    `<div title="${escapeHtml(node.label)}" style="height:${layout.titleHeight}px;box-sizing:border-box;background:${color};color:#fff;font-size:${m.titleSize}px;line-height:${m.titleLine}px;font-weight:800;padding:${m.titlePadding}px ${m.paddingX}px;white-space:nowrap;">${lines(layout.titleLines)}</div>${note}` +
    `<div style="padding:0 ${m.paddingX}px;"><table style="width:100%;table-layout:fixed;border-collapse:collapse;font-size:${m.rowSize}px;line-height:${m.rowLine}px;"><colgroup>${columns}</colgroup><tr style="height:${layout.columnHeight}px;">${th}</tr>${rows}</table></div></div>`;
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
  const value = node.kind === 'gateway' ? '' : node.kind === 'routetable'
    ? escapeXml(routeTableValue(node))
    : node.kind === 'subnet' && node.label.includes('\n')
    ? escapeXml(subnetHtmlLabel(node))
    : htmlTextAttribute(node.label).replace(/\n/g, '&#10;');
  const style = nodeStyle(node);
  const parent = escapeXml(node.parentId ?? '1');
  // Gateways/DRG render as a centred icon with the label below; everything else fills its box.
  const geo = { x: node.x, y: node.y, width: node.width, height: node.height };
  return (
    `        <mxCell id="${escapeXml(node.id)}" value="${value}" style="${style}" vertex="1" parent="${parent}">\n` +
    `          <mxGeometry x="${geo.x + dx}" y="${geo.y + dy}" width="${geo.width}" height="${geo.height}" as="geometry" />\n` +
    `        </mxCell>`
  );
}

function vertexCell(id: string, value: string, style: string, x: number, y: number, width: number, height: number, parent = '1'): string {
  return `        <mxCell id="${escapeXml(id)}" value="${htmlTextAttribute(value)}" style="${style}" vertex="1" parent="${escapeXml(parent)}">\n` +
    `          <mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry" />\n        </mxCell>`;
}

function edgeGeometry(points: Point[], offsetX: number, offsetY: number): string {
  if (points.length < 2) return '          <mxGeometry relative="1" as="geometry" />';
  const shifted = points.map((point) => ({ x: point.x + offsetX, y: point.y + offsetY }));
  const first = shifted[0], last = shifted[shifted.length - 1];
  const middle = shifted.slice(1, -1);
  const pointArray = middle.length
    ? `\n            <Array as="points">\n${middle.map((point) => `              <mxPoint x="${point.x}" y="${point.y}" />`).join('\n')}\n            </Array>`
    : '';
  return `          <mxGeometry relative="1" as="geometry">\n` +
    `            <mxPoint x="${first.x}" y="${first.y}" as="sourcePoint" />\n` +
    `            <mxPoint x="${last.x}" y="${last.y}" as="targetPoint" />${pointArray}\n          </mxGeometry>`;
}

export interface DrawioPage { name: string; diagram: DiagramModel }

export function toDrawioXml(diagram: DiagramModel, diagramName = 'Landing Zone'): string {
  return toDrawioPagesXml([{ name: diagramName, diagram }]);
}

export function toDrawioPagesXml(pages: readonly DrawioPage[]): string {
  return `<mxfile host="oci-landingzone-studio" type="device">\n`
    + pages.map((page, index) => drawioPageXml(page.diagram, page.name, index ? `lz-${index + 1}` : 'lz')).join('')
    + `</mxfile>\n`;
}

function drawioPageXml(diagram: DiagramModel, diagramName: string, pageId: string): string {
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
  const gatewayChildCells = diagram.nodes.filter((node) => node.kind === 'gateway').flatMap(gatewayCells);
  const publicBadgeCells = diagram.nodes.filter((node) => node.kind === 'subnet' && node.publicSubnet).map((node) =>
    vertexCell(`${node.id}-public`, 'PUBLIC', `rounded=1;arcSize=50;html=1;fillColor=${oracle.cidrBlue};strokeColor=none;fontColor=#ffffff;fontStyle=1;fontSize=8.5;`, node.width - 48, 4, 44, 15, node.id));
  const rects = absoluteNodeRects(diagram.nodes);
  const associations = associationDisplaySegments(diagram.nodes, diagram.edges);
  const allFlows = diagram.display?.allFlows ?? false;
  const focus = diagram.display?.focusFlow;
  const flowCases: string[] = [];
  const flowAnnotations: string[] = [];
  const structuralCells: string[] = [];

  const edgeCells = diagram.edges.flatMap((edge) => {
    // Flow overlay edges carry the exact obstacle-aware polyline used on screen.
    // Fixed terminal points plus explicit intermediate points prevent Draw.io
    // from independently rerouting each logical hop across unrelated resources.
    if (edge.waypoints && edge.waypoints.length > 1 && edge.points && edge.points.length > 1) {
      if (!createFlowPlayback(edge).valid) return [];
      const color = edge.color ?? '#2196F3';
      const group = flowGroup(edge.id.replace(/^flow-/, ''));
      const chosen = group === focus;
      const opacity = focus && !chosen ? 14 : 100;
      const points = flowDisplayPoints(edge);
      const geometry = edgeGeometry(points, offsetX, offsetY);
      const fstyle = `edgeStyle=none;orthogonal=1;rounded=0;html=1;endArrow=block;startArrow=none;strokeColor=${color};strokeWidth=${chosen ? 4.5 : 3};opacity=${opacity};flowAnimation=1;`;
      flowCases.push(`        <mxCell id="${escapeXml(edge.id)}-case" value="" style="edgeStyle=none;rounded=0;endArrow=none;startArrow=none;strokeColor=#ffffff;strokeWidth=${chosen ? 12 : 9};opacity=${opacity * 0.92};" edge="1" parent="1">\n${geometry}\n        </mxCell>`);
      const start = points[0];
      flowAnnotations.push(vertexCell(`${edge.id}-start`, '', `ellipse;fillColor=#ffffff;strokeColor=${color};strokeWidth=2.5;opacity=${opacity};`, start.x + offsetX - 5, start.y + offsetY - 5, 10, 10));
      marksAlong(points, allFlows && !chosen ? 170 : 96).forEach((mark, index) => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="-8 -8 16 16"><g transform="rotate(${mark.angle})"><path d="M-3,-4.5 L2.5,0 L-3,4.5" fill="none" stroke="#fff" stroke-width="4"/><path d="M-3,-4.5 L2.5,0 L-3,4.5" fill="none" stroke="${color}" stroke-width="2"/></g></svg>`;
        flowAnnotations.push(vertexCell(`${edge.id}-mark-${index}`, '', `shape=image;imageAspect=0;image=${svgUri(svg)};opacity=${opacity};`, mark.x + offsetX - 8, mark.y + offsetY - 8, 16, 16));
      });
      if (!allFlows || chosen) {
        for (const badge of flowHopMarkers(edge)) {
          const x = badge.x + offsetX, y = badge.y + offsetY;
          flowAnnotations.push(vertexCell(`${edge.id}-hop-${badge.seq}`, String(badge.seq), `ellipse;html=1;fillColor=#ffffff;strokeColor=${color};strokeWidth=2;fontColor=${oracle.ink};fontSize=10.5;fontStyle=1;opacity=${opacity};`, x - 9, y - 9, 18, 18));
          if (badge.inspected) flowAnnotations.push(vertexCell(`${edge.id}-hop-${badge.seq}-inspected`, '✓', `ellipse;html=1;fillColor=${oracle.green};strokeColor=#ffffff;strokeWidth=1.2;fontColor=#ffffff;fontSize=8;fontStyle=1;opacity=${opacity};`, x + 2.5, y - 12.5, 10, 10));
        }
        if (edge.label) {
          const width = edge.label.length * 5.9 + 22;
          const at = labelAnchor(points, width);
          flowAnnotations.push(vertexCell(`${edge.id}-label`, edge.label, `rounded=1;arcSize=100;html=1;fillColor=#ffffff;strokeColor=${color};strokeWidth=1.5;fontColor=${oracle.ink};fontSize=10;fontStyle=1;align=left;spacingLeft=18;opacity=${opacity};`, at.x + offsetX - width / 2, at.y + offsetY - 9, width, 18));
          flowAnnotations.push(vertexCell(`${edge.id}-label-dot`, '', `ellipse;fillColor=${color};strokeColor=none;opacity=${opacity};`, at.x + offsetX - width / 2 + 6.5, at.y + offsetY - 3.5, 7, 7));
        }
      }
      return [
        `        <mxCell id="${escapeXml(edge.id)}" value="" style="${fstyle}" edge="1" parent="1">\n` +
        `${geometry}\n` +
        `        </mxCell>`,
      ];
    }
    const association = rects.get(edge.source)?.node.kind === 'rtdot' && rects.get(edge.target)?.node.kind === 'routetable';
    const attachment = rects.get(edge.source)?.node.kind === 'attachment' || rects.get(edge.target)?.node.kind === 'attachment';
    const points = structuralEdgePoints(edge, rects);
    const terminals = attachment
      ? 'endArrow=oval;startArrow=oval;startFill=1;endFill=1;startSize=5;endSize=5;'
      : `endArrow=${association ? 'none' : 'block'};startArrow=none;`;
    let base = `edgeStyle=none;orthogonal=1;rounded=0;html=1;${terminals}strokeColor=#6b6660;strokeWidth=${association ? 1.8 : 1.4};${association ? 'dashed=1;dashPattern=5 4;' : ''}`;
    if (association) {
      (associations.get(edge.id) ?? [points]).forEach((segment, index) => {
        const id = index ? `${edge.id}-segment-${index}` : edge.id;
        structuralCells.push(
          `        <mxCell id="${escapeXml(id)}" value="" style="${base}" edge="1" parent="1">\n` +
          `${edgeGeometry(segment, offsetX, offsetY)}\n        </mxCell>`,
        );
      });
      return [];
    }
    const source = rects.get(edge.source), target = rects.get(edge.target);
    if (source && points.length) {
      base += `exitX=${(points[0].x - source.x) / source.width};exitY=${(points[0].y - source.y) / source.height};exitDx=0;exitDy=0;`;
    }
    if (target && points.length) {
      const end = points[points.length - 1];
      base += `entryX=${(end.x - target.x) / target.width};entryY=${(end.y - target.y) / target.height};entryDx=0;entryDy=0;`;
    }
    const style = edge.animated ? `${base}flowAnimation=1;` : base;
    const value = edge.label ? htmlTextAttribute(edge.label) : '';
    structuralCells.push(
      `        <mxCell id="${escapeXml(edge.id)}" value="${value}" style="${style}" edge="1" parent="1" ` +
      `source="${escapeXml(edge.source)}" target="${escapeXml(edge.target)}">\n` +
      `${edgeGeometry(points, offsetX, offsetY)}\n` +
      `        </mxCell>`,
    );
    return [];
  });

  return (
    `  <diagram id="${pageId}" name="${escapeXml(diagramName)}">\n` +
    `    <mxGraphModel dx="800" dy="600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" ` +
    `arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100" math="0" shadow="0">\n` +
    `      <root>\n` +
    `        <mxCell id="0" />\n` +
    `        <mxCell id="1" parent="0" />\n` +
    [...nodeCells, ...shieldCells, ...routeTableCells, ...osnCells, ...iconCells, ...endpointCells, ...gatewayChildCells, ...publicBadgeCells, ...structuralCells, ...flowCases, ...edgeCells, ...flowAnnotations].join('\n') + '\n' +
    `      </root>\n` +
    `    </mxGraphModel>\n` +
    `  </diagram>\n`
  );
}
