/**
 * LzDiagram — React Flow renderer for the DiagramModel.
 *
 * Consumes the exact same intermediate the .drawio exporter does, so what you
 * see is what you export. Animated edges here become draw.io flowAnimation on
 * export. Custom node types, clickable drill-downs and packet-flow edges plug
 * in here as the wizard grows.
 */

import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  Panel,
  Handle,
  Position,
  BaseEdge,
  MarkerType,
  ViewportPortal,
  getViewportForBounds,
  useReactFlow,
  useStore,
  useKeyPress,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
  type EdgeProps,
  type EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { SHIELD_SVG } from './shieldSvg';
import FlowOverlay, { type FlowFocus } from './FlowOverlay';
import type { ActiveRouteRule } from './flowPlayback';
import { ROUTE_TABLE_SVG } from './routeTableSvg';
import { IGW_SVG, NATGW_SVG, SGW_SVG, FIREWALL_SVG, LB_SVG, OSN_SVG, DRG_SVG, VM_SVG } from './icons';

const ICONS: Record<string, string> = { igw: IGW_SVG, natgw: NATGW_SVG, sgw: SGW_SVG, firewall: FIREWALL_SVG, lb: LB_SVG };

/** Invisible connection point — floating edges compute their own endpoints. */
const hiddenHandle: React.CSSProperties = { opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, border: 'none', background: 'transparent', pointerEvents: 'none' };

/** Lets nested node components open/close route tables without prop-drilling. */
const RtContext = createContext<(ids: string[]) => void>(() => {});
const ActiveRulesContext = createContext<ActiveRouteRule[]>([]);
const CAPTION_COLORS = { green: '#1E7B2F', orange: '#C25425' } as const;
import type { DiagramModel, DiagramNode, DiagramOptions } from '../model/types';
import { oracle } from '../theme';
import { attachCooperativeGestures, type DiagramGestureHint } from './cooperativeGestures';
import { absoluteNodeRects } from './flowGeometry';
import { resourceGroupSvg } from './resourceGroups';
import { compartmentStyle } from './compartmentStyle';
import { associationDisplaySegments, polylinePath, structuralEdgePoints } from './displayGeometry';
import { ATTACHMENT_LABEL, DRG_CAPTION } from './layoutPolicy';
import { routeTableLayout, ROUTE_TABLE_METRICS } from './routeTableLayout';

const COOPERATIVE_QUERY = '(max-width: 1100px)';
const ZOOM_KEYS = ['Meta', 'Control'];
function subscribeToLayout(onChange: () => void) {
  const media = window.matchMedia(COOPERATIVE_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
const stackedLayout = () => window.matchMedia(COOPERATIVE_QUERY).matches;

function nodeStyle(node: DiagramNode): React.CSSProperties {
  // OCI architecture conventions:
  //   Region      — light, solid container
  //   Tenancy     — bold black dashed container
  //   Landing zone— red dotted container
  //   compartment — yellow (shared) or green (environment) block
  switch (node.kind) {
    case 'region':
      return { background: '#fbfbfb', border: `1.5px solid ${oracle.borderStrong}`, borderRadius: 0, color: oracle.ink, fontWeight: 800 };
    case 'tenancy':
      return { background: 'transparent', border: `2px dashed ${oracle.ink}`, borderRadius: 0, color: oracle.ink, fontWeight: 800 };
    case 'landingzone':
      return { background: '#ffffff', border: `2px dotted ${oracle.red}`, borderRadius: 0, color: oracle.ink, fontWeight: 700 };
    case 'compartment': {
      const palette = compartmentStyle(node);
      return { background: palette.fill, border: `1.5px ${palette.dotted ? 'dotted' : 'solid'} ${palette.stroke}`, borderRadius: 0, color: palette.text, fontWeight: 600 };
    }
    case 'vcn':
      return { background: '#ffffff', border: `2px dashed ${oracle.vcnBorder}`, borderRadius: 0, color: oracle.vcnBorder, fontWeight: 700 };
    case 'subnet':
      return { background: '#fffdfb', border: `1.5px dashed ${oracle.vcnBorder}`, borderRadius: 0, color: '#3f4750', fontWeight: 600 };
    case 'gateway':
    case 'drg':
      return { background: 'transparent', border: 'none', borderRadius: 0 };
    case 'attachment':
      return { background: '#ffffff', border: '1.5px solid #6b7a99', borderRadius: 5, color: '#1f3a63', fontWeight: 800 };
    case 'project':
      // Project nodes represent generated project compartments.
      return { background: oracle.compProjectFill, border: `1.5px solid ${oracle.compGrayBorder}`, borderRadius: 0, color: oracle.ink, fontWeight: 700 };
    case 'routetable':
    case 'rtdot':
    case 'resourcegroup':
      return { background: 'transparent', border: 'none', borderRadius: 0 };
  }
}

/** Compartment node: left-aligned label + a Security Zone shield (top-right) when secure. */
function CompartmentNode({ data }: NodeProps) {
  const d = data as { label?: string; secure?: boolean; container?: boolean; tone?: DiagramNode['tone']; compartmentScope?: DiagramNode['compartmentScope'] };
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: d.container ? 'flex-start' : 'center', paddingTop: d.container ? 7 : 0, paddingLeft: 10, paddingRight: 22, boxSizing: 'border-box', fontSize: 12, fontWeight: 600, color: compartmentStyle(d).text, whiteSpace: 'pre-line' }}>
      {d.label}
      {d.secure && (
        <span
          title="Security Zone enabled"
          style={{ position: 'absolute', top: 5, right: 6, width: 15, height: 15, lineHeight: 0 }}
          dangerouslySetInnerHTML={{ __html: SHIELD_SVG }}
        />
      )}
    </div>
  );
}

/**
 * Subnet node: name (orange-red) over CIDR (blue), an optional centred icon +
 * caption (firewall / load balancer), and a route-table icon straddling the
 * right border.
 */
function SubnetNode({ data }: NodeProps) {
  const d = data as { label?: string; icon?: string; caption?: string; captionTone?: 'green' | 'orange'; ipNote?: string; endpointName?: string; endpointIp?: string; publicSubnet?: boolean };
  const [name = '', cidr = ''] = (d.label ?? '').split('\n');
  const iconSvg = d.icon ? ICONS[d.icon] : undefined;
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: iconSvg || d.endpointName ? 'flex-start' : 'center', gap: 2, padding: '6px 18px 6px 12px', boxSizing: 'border-box', fontSize: 12, lineHeight: 1.25 }}>
      {/* Public (IGW-routed) subnet badge — the LB / DMZ front-ends face the internet. */}
      {d.publicSubnet && (
        <span title="Public subnet (IGW-routed, internet-facing)" style={{ position: 'absolute', top: 4, right: 4, padding: '1px 6px', fontSize: 8.5, fontWeight: 800, letterSpacing: 0.3, color: '#fff', background: oracle.cidrBlue, borderRadius: 8, lineHeight: 1.5 }}>
          PUBLIC
        </span>
      )}
      <span style={{ color: d.publicSubnet ? CAPTION_COLORS.green : oracle.subnetName, fontWeight: 700 }}>{name}</span>
      <span style={{ color: oracle.cidrBlue, fontWeight: 600 }}>{cidr}</span>
      {iconSvg && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, marginTop: 2 }}>
          <span style={{ width: 42, height: 42, lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: iconSvg.replace('width="48" height="48"', 'width="42" height="42"') }} />
          {d.caption && <span style={{ color: CAPTION_COLORS[d.captionTone ?? 'orange'], fontWeight: 700, fontSize: 12 }}>{d.caption}</span>}
          {d.ipNote && <span style={{ color: oracle.cidrBlue, fontWeight: 700, fontSize: 11.5 }}>{d.ipNote}</span>}
        </div>
      )}
      {/* VM endpoint — smaller than the gateway/firewall glyphs; only icon-less subnets get one. */}
      {d.endpointName && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, marginTop: 4 }}>
          <span style={{ color: oracle.ink, fontWeight: 800, fontSize: 11 }}>{d.endpointName}</span>
          <span style={{ width: 30, height: 30, lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: VM_SVG.replace('width="48" height="48"', 'width="30" height="30"') }} />
          {d.endpointIp && <span style={{ color: oracle.cidrBlue, fontWeight: 700, fontSize: 10.5 }}>{d.endpointIp}</span>}
        </div>
      )}
      {/* Route-table icon — straddles the right border (the clickable dot sits on it). */}
      <span
        title="Route table"
        style={{ position: 'absolute', top: '50%', right: -10, transform: 'translateY(-50%)', width: 20, height: 20, lineHeight: 0, background: '#ffffff' }}
        dangerouslySetInnerHTML={{ __html: ROUTE_TABLE_SVG }}
      />
    </div>
  );
}

/** Gateway node: teal icon with a small two-line label underneath, no box. */
function GatewayNode({ data }: NodeProps) {
  const d = data as { label?: string; icon?: string };
  const iconSvg = d.icon ? ICONS[d.icon] : undefined;
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      {iconSvg && (
        <span style={{ width: 34, height: 34, lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: iconSvg.replace('width="48" height="48"', 'width="34" height="34"') }} />
      )}
      <span style={{ width: '100%', fontSize: 10, fontWeight: 700, color: oracle.ink, textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.25 }}>{d.label}</span>
    </div>
  );
}

/**
 * VCN node: a container holding its subnets/gateways. Draws its own two-line
 * label (name + CIDR) top-left and the Oracle Services Network glyph straddling
 * the bottom-right corner. Hidden handles let the routing edges attach.
 */
function VcnNode({ data }: NodeProps) {
  const d = data as { label?: string };
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', padding: '7px 10px', boxSizing: 'border-box', fontSize: 13, fontWeight: 700, color: oracle.vcnBorder, whiteSpace: 'pre-line', lineHeight: 1.3 }}>
      {d.label}
      <span
        title="Oracle Services Network"
        style={{ position: 'absolute', right: -13, bottom: -13, width: 26, height: 26, lineHeight: 0 }}
        dangerouslySetInnerHTML={{ __html: OSN_SVG }}
      />
      <Handle type="target" position={Position.Left} style={hiddenHandle} isConnectable={false} />
      <Handle type="source" position={Position.Left} style={hiddenHandle} isConnectable={false} />
    </div>
  );
}

/**
 * DRG node: the teal glyph fills the (icon-sized) box so links meet its centre;
 * the "DRG" name is an overlay below that doesn't enlarge the connection box.
 */
function DrgNode({ data }: NodeProps) {
  const d = data as { label?: string };
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <span style={{ position: 'absolute', inset: 0, lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: DRG_SVG.replace('width="40" height="40"', 'width="100%" height="100%"') }} />
      <span style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: DRG_CAPTION.gap, fontFamily: DRG_CAPTION.fontFamily, fontSize: DRG_CAPTION.fontSize, fontWeight: DRG_CAPTION.fontWeight, lineHeight: DRG_CAPTION.lineHeight, color: oracle.ink, whiteSpace: 'nowrap' }}>{d.label}</span>
      <Handle type="target" position={Position.Top} style={hiddenHandle} isConnectable={false} />
      <Handle type="source" position={Position.Top} style={hiddenHandle} isConnectable={false} />
    </div>
  );
}

/** Attachment labels reserve terminal clearance on both sides. */
function AttachmentNode({ data }: NodeProps) {
  const d = data as { label?: string };
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', padding: `0 ${ATTACHMENT_LABEL.sidePadding}px`, fontFamily: ATTACHMENT_LABEL.fontFamily, fontSize: ATTACHMENT_LABEL.fontSize, fontWeight: ATTACHMENT_LABEL.fontWeight, lineHeight: 1.2, color: '#1f3a63', whiteSpace: 'pre' }}>
      <span>{d.label}</span>
      <Handle type="target" position={Position.Left} style={hiddenHandle} isConnectable={false} />
      <Handle type="source" position={Position.Right} style={hiddenHandle} isConnectable={false} />
    </div>
  );
}

/** Project compartment: a square white box with its full generated name. */
function ProjectNode({ data }: NodeProps) {
  const d = data as { label?: string; container?: boolean };
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: d.container ? 'flex-start' : 'center', justifyContent: 'center', padding: d.container ? '7px 8px' : '4px 8px', boxSizing: 'border-box', fontSize: 12, fontWeight: 700, color: oracle.ink, textAlign: 'center', whiteSpace: 'normal', overflowWrap: 'anywhere', lineHeight: 1.2 }}>
      {d.label}
    </div>
  );
}

const RT_COLORS = { hub: '#8C3A80', gateway: '#8C3A80', drg: '#B23A48', spoke: '#2E6E3F' } as const;
type RtRow = { id?: string; destination: string; targetType: string; target: string; routeType: string };
const RT_CELLS = {
  vcn: (r: RtRow) => [r.destination, r.targetType, r.target, r.routeType],
  drg: (r: RtRow) => [r.destination, r.targetType, r.target],
} as const;

/** Route-table box: coloured header (with close ×) + ONTV columns; flow-matched rows highlight. */
function RouteTableNode({ id, data }: NodeProps) {
  const d = data as { label?: string; width?: number; rtRows?: RtRow[]; rtColumns?: keyof typeof RT_CELLS; rtNote?: string; rtTone?: keyof typeof RT_COLORS; rtHighlight?: number[]; rtLocked?: boolean };
  const color = RT_COLORS[d.rtTone ?? 'hub'], m = ROUTE_TABLE_METRICS;
  const cellsOf = RT_CELLS[d.rtColumns ?? 'vcn'];
  const layout = routeTableLayout({ label: d.label ?? '', columns: d.rtColumns, rowCount: d.rtRows?.length ?? 0, note: d.rtNote, width: d.width ?? 310 });
  const gridTemplateColumns = layout.columnWidths.map((width) => `${width}px`).join(' ');
  const section: React.CSSProperties = { boxSizing: 'border-box', flexShrink: 0 };
  const activeRules = useContext(ActiveRulesContext);
  const hl = new Set(activeRules.filter((rule) => rule.tableId === id).map((rule) => rule.ruleId));
  const toggleRt = useContext(RtContext);
  const cellColor = (j: number) => (j === 0 ? '#3f4750' : j === layout.headerLines.length - 1 ? oracle.textMuted : j === 2 ? color : '#6b6660');
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#fff', border: `${m.border}px solid ${color}`, boxSizing: 'border-box', fontFamily: m.fontFamily, overflow: 'hidden' }}>
      <Handle type="target" position={Position.Right} style={hiddenHandle} isConnectable={false} />
      <Handle type="source" position={Position.Left} style={hiddenHandle} isConnectable={false} />
      <div style={{ ...section, height: layout.titleHeight, background: color, color: '#fff', fontWeight: 800, fontSize: m.titleSize, lineHeight: `${m.titleLine}px`, padding: `${m.titlePadding}px ${m.paddingX}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span title={d.label} style={{ whiteSpace: 'pre' }}>{layout.titleLines.join('\n')}</span>
        {!d.rtLocked && <button type="button" aria-label={`Close ${d.label}`} onClick={(e) => { e.stopPropagation(); toggleRt([id]); }} style={{ cursor: 'pointer', color: 'inherit', background: 'transparent', border: 0, fontSize: m.titleSize, fontWeight: 700, lineHeight: 1, width: 14, height: 14, minWidth: 14, minHeight: 14, padding: 0, flexShrink: 0 }}>✕</button>}
      </div>
      {layout.noteHeight > 0 && <div style={{ ...section, height: layout.noteHeight, fontSize: m.noteSize, lineHeight: `${m.noteLine}px`, color: '#B23A48', fontWeight: 700, padding: `${m.notePadding}px ${m.paddingX}px`, background: '#fdecea', whiteSpace: 'pre' }}>{layout.noteLines.join('\n')}</div>}
      <div style={{ ...section, height: layout.columnHeight, display: 'grid', gridTemplateColumns, gap: m.gap, fontSize: m.columnSize, lineHeight: `${m.columnLine}px`, fontWeight: 700, color: oracle.textMuted, letterSpacing: m.letterSpacing, padding: `${m.columnPadding}px ${m.paddingX}px`, borderBottom: `${m.border}px solid #eceae8` }}>
        {layout.headerLines.map((lines, i) => <span key={i} style={{ whiteSpace: 'pre' }}>{lines.join('\n')}</span>)}
      </div>
      {(d.rtRows ?? []).map((row, i) => (
        <div key={i} style={{ ...section, height: layout.rowHeight, display: 'grid', gridTemplateColumns, gap: m.gap, fontSize: m.rowSize, lineHeight: `${m.rowLine}px`, padding: `${m.rowPadding}px ${m.paddingX}px`, background: row.id && hl.has(row.id) ? '#fff3c4' : 'transparent' }}>
          {cellsOf(row).map((c, j) => (
            <span key={j} title={c} style={{ color: cellColor(j), fontWeight: j === 2 ? 700 : 500, fontFamily: j === 0 ? 'ui-monospace, Menlo, monospace' : undefined, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Route-table dot (ONTV-style): click to open/close its table; a line runs to the open box. */
function ResourceGroupNode({ data }: NodeProps) {
  const d = data as unknown as DiagramNode;
  if (!d.resourceKind) return null;
  return <div role="img" aria-label={`${d.label}: ${d.resourceItems?.map((item) => item.name).join(', ') ?? ''}`}
    dangerouslySetInnerHTML={{ __html: resourceGroupSvg(d.resourceKind, d.resourceItems ?? [], d.width) }} />;
}

function RtDotNode({ data }: NodeProps) {
  const d = data as { rtDotOpen?: boolean; rtDotConfigured?: boolean; rtDotTone?: keyof typeof RT_COLORS; rtLocked?: boolean };
  const color = d.rtDotConfigured ? RT_COLORS[d.rtDotTone ?? 'hub'] : '#b0aca8';
  return (
    <div
      title={d.rtLocked ? 'Route table shown in flow mode' : d.rtDotOpen ? 'Hide route table' : 'Show route table'}
      style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', background: color, cursor: d.rtLocked ? 'default' : 'pointer', boxSizing: 'border-box', border: '1.5px solid #fff', boxShadow: d.rtDotOpen ? `0 0 0 3px ${color}66` : '0 0 1px rgba(0,0,0,0.4)' }}
    >
      <Handle type="source" position={Position.Left} style={hiddenHandle} isConnectable={false} />
      <Handle type="target" position={Position.Right} style={hiddenHandle} isConnectable={false} />
    </div>
  );
}

const nodeTypes: NodeTypes = { landingzone: CompartmentNode, compartment: CompartmentNode, subnet: SubnetNode, gateway: GatewayNode, vcn: VcnNode, drg: DrgNode, attachment: AttachmentNode, project: ProjectNode, routetable: RouteTableNode, rtdot: RtDotNode, resourcegroup: ResourceGroupNode };

/** Nodes stay fixed; screen and export consume the same model-derived connector. */
function FloatingEdge({ id, markerStart, markerEnd, style, data }: EdgeProps) {
  return <BaseEdge id={id} path={(data as { path: string }).path} markerStart={markerStart} markerEnd={markerEnd} style={style} />;
}

const edgeTypes: EdgeTypes = { floating: FloatingEdge };

function toReactFlow(diagram: DiagramModel, rtLocked: boolean, attachmentMarker: string): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = diagram.nodes.map((n) => {
    // Kinds with a custom node component draw their own label; the style is box-only.
    const customType = n.kind === 'landingzone' || n.kind === 'compartment' || n.kind === 'subnet' || n.kind === 'gateway' || n.kind === 'vcn' || n.kind === 'drg' || n.kind === 'attachment' || n.kind === 'project' || n.kind === 'routetable' || n.kind === 'rtdot' || n.kind === 'resourcegroup';
    return {
    id: n.id,
    position: { x: n.x, y: n.y },
    type: customType ? n.kind : undefined,
    // Dimensions on the node (not just style) so the MiniMap can size its rects.
    width: n.width,
    height: n.height,
    ...(n.parentId ? { parentId: n.parentId, ...(n.kind === 'gateway' ? {} : { extent: 'parent' as const }) } : {}),
    data: { label: n.label, kind: n.kind, tone: n.tone, compartmentScope: n.compartmentScope, secure: n.secure, container: n.container, icon: n.icon, caption: n.caption, captionTone: n.captionTone, ipNote: n.ipNote, endpointName: n.endpointName, endpointIp: n.endpointIp, publicSubnet: n.publicSubnet, rtRows: n.rtRows, rtColumns: n.rtColumns, rtNote: n.rtNote, rtTone: n.rtTone, rtHighlight: n.rtHighlight, rtLocked, rtDotTableId: n.rtDotTableId, rtDotOpen: n.rtDotOpen, rtDotConfigured: n.rtDotConfigured, rtDotTone: n.rtDotTone, width: n.width, resourceKind: n.resourceKind, resourceItems: n.resourceItems },
    // Tables sit above the routing edges; dots above edges too so they stay clickable.
    ...(n.kind === 'routetable' ? { zIndex: 2000 } : n.kind === 'rtdot' ? { zIndex: 1500 } : {}),
    style: customType
      // Box only — the custom node draws the label (+ shield / route table).
      ? { ...nodeStyle(n), width: n.width, height: n.height }
      // Containers: label top-left so nested children have room below.
      : {
          ...nodeStyle(n),
          width: n.width,
          height: n.height,
          whiteSpace: 'pre-line',
          fontSize: 13,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          textAlign: 'left',
          padding: '7px 10px',
        },
    };
  });

  // Flow edges (waypoint chains) are drawn by the SVG FlowOverlay, not as React
  // Flow edges — keep only the structural routing links here.
  const rects = absoluteNodeRects(diagram.nodes);
  const associations = associationDisplaySegments(diagram.nodes, diagram.edges);
  const edges: Edge[] = diagram.edges.filter((e) => !e.waypoints).map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'floating',
    label: e.label,
    data: { path: (associations.get(e.id) ?? [structuralEdgePoints(e, rects)]).map(polylinePath).join(' ') },
    ...(rects.get(e.source)?.node.kind === 'attachment' || rects.get(e.target)?.node.kind === 'attachment'
      ? { markerStart: attachmentMarker, markerEnd: attachmentMarker }
      : rects.get(e.target)?.node.kind !== 'routetable' ? { markerEnd: { type: MarkerType.ArrowClosed, color: '#6b6660', width: 15, height: 15 } } : {}),
    // Lift links above the opaque compartment fills. Dot→table connectors ride
    // just under the table (above the dots) so the whole line stays visible.
    zIndex: rects.get(e.target)?.node.kind === 'routetable' ? 1900 : 1000,
    style: rects.get(e.target)?.node.kind === 'routetable' ? { stroke: '#6b6660', strokeWidth: 1.8, strokeDasharray: '5 4' } : { stroke: '#6b6660', strokeWidth: 1.4 },
    labelStyle: { fill: oracle.ink, fontSize: 11, fontWeight: 600 },
    labelBgStyle: { fill: oracle.surface },
  }));

  return { nodes, edges };
}

function miniMapNodeColor(node: Node): string {
  const data = node.data as { kind?: string; tone?: DiagramNode['tone']; compartmentScope?: DiagramNode['compartmentScope'] };
  switch (data.kind) {
    case 'compartment': return compartmentStyle(data).fill;
    case 'project':     return oracle.compProjectFill;
    case 'landingzone': return '#f6dcd8';
    case 'tenancy':     return '#e4e1de';
    case 'vcn':         return oracle.vcnBorder;
    case 'subnet':      return oracle.vcnFill;
    case 'gateway':     return '#ffffff';
    case 'drg':         return '#2D5967';
    case 'attachment':  return '#dfe6f2';
    case 'routetable':  return '#efe2ec';
    case 'rtdot':       return '#8C3A80';
    default:            return '#eeeceA'; // region
  }
}

const ZOOM_PRESETS = [50, 100, 150, 200, 300];
const FIT_PADDING = 0.08;

/** Layer toggle button (top-right): show/hide route tables, endpoints, flows. */
const layerBtn: React.CSSProperties = {
  padding: '5px 11px', fontSize: 11.5, fontWeight: 700, color: oracle.text,
  background: oracle.surface, border: `1px solid ${oracle.border}`, borderRadius: 7,
  boxShadow: '0 1px 4px rgba(32,31,28,0.12)', cursor: 'pointer',
};
const layerBtnActive: React.CSSProperties = { background: oracle.red, border: `1px solid ${oracle.redDark}`, color: '#fff' };
const hintBtn: React.CSSProperties = { ...layerBtn, display: 'flex', alignItems: 'center', gap: 10, border: `1px dashed ${oracle.borderStrong}` };

export function DiagramZoomControls({ disabled = false }: { disabled?: boolean }) {
  const { zoomIn, zoomOut, zoomTo, fitView, setViewport, viewportInitialized } = useReactFlow();
  const percent = useStore((s) => Math.round(s.transform[2] * 100));

  return (
    <fieldset className="diagram-zoom-controls" aria-label="Diagram zoom" disabled={disabled || !viewportInitialized}>
      <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => zoomOut({ duration: 150 })}>−</button>
      <select aria-label="Diagram zoom percentage" value={percent} onChange={(event) => zoomTo(Number(event.target.value) / 100, { duration: 200 })}>
        {!ZOOM_PRESETS.includes(percent) && <option value={percent}>{percent}%</option>}
        {ZOOM_PRESETS.map((value) => <option key={value} value={value}>{value}%</option>)}
      </select>
      <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => zoomIn({ duration: 150 })}>+</button>
      <button type="button" aria-label="Fit all objects" title="Fit all objects" onClick={() => fitView({ padding: FIT_PADDING, maxZoom: 1, duration: 250 })}>⤢</button>
      <button type="button" aria-label="Reset view (100%)" title="Reset view (100%)" onClick={() => setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 200 })}>↺</button>
    </fieldset>
  );
}

export default function LzDiagram({ diagram, options, onOptionsChange, flowSteps, showFlowControl = true, flowHint, flowFocus, onFlowSelect, onFlowHover, minZoom = 0.05 }: {
  diagram: DiagramModel;
  minZoom?: number;
  options?: DiagramOptions;
  onOptionsChange?: (next: DiagramOptions) => void;
  /** Per-flow packet step: null/absent = auto-play, a number = that 0-based hop. */
  flowSteps?: Record<string, number | null>;
  /** Whether the selected hub topology has a packet-flow adapter. */
  showFlowControl?: boolean;
  /** Flow or hop hovered in the flow picker: fades the other flows. */
  flowFocus?: FlowFocus | null;
  /** Click a flow path to select it (again, or on empty canvas, to clear). */
  onFlowSelect?: (group: string | null) => void;
  onFlowHover?: (group: string | null) => void;
  /** Shown instead of the layer buttons before endpoints exist: where to find them. */
  flowHint?: { label: string; action: string; onClick: () => void };
}) {
  const rtLocked = !!(options?.showFlows || options?.allFlows || options?.activeFlows?.length);
  const [activeRules, setActiveRules] = useState<ActiveRouteRule[]>([]);
  const attachmentMarker = React.useId();
  const { nodes, edges } = useMemo(() => toReactFlow(diagram, rtLocked, attachmentMarker), [diagram, rtLocked, attachmentMarker]);
  const { setViewport, getViewport, viewportInitialized } = useReactFlow();
  const [framed, setFramed] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const cooperative = useSyncExternalStore(subscribeToLayout, stackedLayout, () => false);
  const modifierPressed = useKeyPress(ZOOM_KEYS);
  const [gestureHint, setGestureHint] = useState<DiagramGestureHint>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const showGestureHint = useCallback((hint: DiagramGestureHint) => {
    clearTimeout(hintTimer.current);
    setGestureHint(hint);
    if (hint) hintTimer.current = setTimeout(() => setGestureHint(null), 1500);
  }, []);
  useEffect(() => {
    if (!cooperative || !container.current) return;
    return attachCooperativeGestures(container.current, { getViewport, setViewport, onHint: showGestureHint, minZoom, maxZoom: 4 });
  }, [cooperative, getViewport, setViewport, showGestureHint, minZoom]);
  useEffect(() => () => clearTimeout(hintTimer.current), []);
  // Flow overlay inputs: the waypoint edges + the diagram's outer bounds.
  const flowEdges = useMemo(() => diagram.edges.filter((e) => !!e.waypoints), [diagram]);
  const region = diagram.nodes.find((n) => n.kind === 'region');
  // Pane width — so switching view modes (or resizing the window) re-centres the
  // diagram instead of leaving it pinned to its previous-layout position.
  const paneWidth = useStore((s) => s.width);
  const paneHeight = useStore((s) => s.height);

  const toggleTables = useCallback((ids: string[]) => {
    if (!onOptionsChange || rtLocked || ids.length === 0) return;
    const cur = options?.openTables ?? [];
    const allOpen = ids.every((id) => cur.includes(id));
    const next = allOpen ? cur.filter((id) => !ids.includes(id)) : [...new Set([...cur, ...ids])];
    onOptionsChange({ ...options, openTables: next });
  }, [onOptionsChange, options, rtLocked]);
  const onNodeClick = useCallback((_e: React.MouseEvent, node: Node) => {
    const d = node.data as { kind?: string; rtDotTableId?: string };
    if (d.kind === 'rtdot' && d.rtDotTableId) toggleTables([d.rtDotTableId]);
  }, [toggleTables]);

  // Frame flows together with the complete visible routing configuration.
  const flowNodeIds = useMemo(() => {
    const ids = new Set<string>();
    diagram.edges.forEach((e) => {
      if (!e.color) return;
      // Animated flows are stored as one edge whose waypoint chain contains the
      // real path through attachments, the DRG, firewalls, and gateways. Framing
      // only source + target crops those intermediate hops and makes the packet
      // appear to jump across an unrelated part of the graph.
      (e.waypoints ?? [e.source, e.target]).forEach((id) => ids.add(id));
    });
    diagram.nodes.forEach((n) => { if (n.kind === 'routetable') ids.add(n.id); });
    return [...ids];
  }, [diagram]);
  const flowKey = flowNodeIds.join(',');
  const flowBounds = useMemo(() => {
    if (!flowEdges.length && !options?.showFlows && !options?.allFlows) return null;
    const points = flowEdges.flatMap((edge) => edge.points ?? []);
    const byId = new Map(diagram.nodes.map((node) => [node.id, node]));
    const absolutePosition = (node: DiagramNode) => {
      let x = node.x;
      let y = node.y;
      let parentId = node.parentId;
      while (parentId) {
        const parent = byId.get(parentId);
        if (!parent) break;
        x += parent.x;
        y += parent.y;
        parentId = parent.parentId;
      }
      return { x, y };
    };
    diagram.nodes
      .filter((node) => node.kind === 'routetable')
      .forEach((node) => {
        const position = absolutePosition(node);
        points.push(position, { x: position.x + node.width, y: position.y + node.height });
      });
    if (points.length < 2) return null;
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const margin = 56;
    const minX = Math.min(...xs) - margin;
    const minY = Math.min(...ys) - margin;
    const maxX = Math.max(...xs) + margin;
    const maxY = Math.max(...ys) + margin;
    return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
  }, [diagram.nodes, flowEdges, options?.showFlows, options?.allFlows]);
  const flowBoundsKey = flowBounds
    ? [flowBounds.x, flowBounds.y, flowBounds.width, flowBounds.height].map(Math.round).join(':')
    : '';

  // Re-fit on STRUCTURAL change (environments/subnets/hubs) or a pane resize —
  // but NOT on adding/removing projects or route tables, so the user keeps their
  // zoom/pan while editing those. When a flow is active, frame the flow instead.
  const layoutKey = useMemo(
    () => `${diagram.nodes.filter((n) => n.kind !== 'routetable' && n.kind !== 'rtdot' && n.kind !== 'project').length}:${Math.round(paneWidth)}`,
    [diagram, paneWidth],
  );
  // Re-fit ONLY when the structural layout key or the active-flow set actually
  // changes — never on a plain edit. buildGraph returns a fresh diagram object per
  // keystroke, so `flowNodeIds` is a new array every render and any of these deps
  // can re-fire the effect; the ref guard makes the fitView itself idempotent so
  // an unchanged key is a no-op and the user keeps their zoom/pan.
  const lastFitKey = useRef('');
  useLayoutEffect(() => {
    if (paneWidth <= 0 || paneHeight <= 0 || !viewportInitialized || !region) return;
    const key = `${layoutKey}|${Math.round(paneHeight)}|${flowKey}|${flowBoundsKey}`;
    if (framed && key === lastFitKey.current) return;
    lastFitKey.current = key;
    // Model bounds are already final; fit them before revealing the first frame.
    const bounds = flowBounds ?? { x: region.x, y: region.y, width: region.width, height: region.height };
    const viewport = getViewportForBounds(bounds, paneWidth, paneHeight, minZoom, 1, FIT_PADDING);
    let cancelled = false;
    void setViewport(viewport, { duration: framed ? (flowBounds ? 350 : 250) : 0 })
      .then(() => { if (!cancelled && !framed) setFramed(true); });
    return () => { cancelled = true; };
  }, [layoutKey, flowKey, flowBoundsKey, flowBounds, paneWidth, paneHeight, viewportInitialized, framed, region, setViewport, minZoom]);

  return (
    <RtContext.Provider value={toggleTables}>
    <ActiveRulesContext.Provider value={flowEdges.length ? activeRules : []}>
    <div ref={container} data-diagram-framed={framed} style={{ visibility: framed ? 'visible' : 'hidden' }} className={`studio-diagram${cooperative ? ' studio-diagram--cooperative' : ''}`}>
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
      <defs><marker id={attachmentMarker} markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" markerUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="3" fill="#6b6660" /></marker></defs>
    </svg>
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodeClick={onNodeClick}
      onPaneClick={() => { if (options?.focusFlow) onFlowSelect?.(null); }}
      nodesDraggable={false}
      nodesConnectable={false}
      zoomOnScroll={!cooperative}
      preventScrolling={!cooperative || modifierPressed}
      zoomActivationKeyCode={cooperative ? ZOOM_KEYS : undefined}
      zoomOnDoubleClick={!cooperative}
      minZoom={minZoom}
      maxZoom={4}
      proOptions={{ hideAttribution: true }}
    >
      <Background />
      {flowEdges.length > 0 && (
        <ViewportPortal>
          <FlowOverlay flowEdges={flowEdges} steps={flowSteps ?? {}} width={region?.width ?? 2000} height={region?.height ?? 2000} focus={flowFocus} selected={options?.focusFlow ?? null} allFlows={!!options?.allFlows}
            onSelect={onFlowSelect} onHover={onFlowHover} onRulesChange={setActiveRules} />
        </ViewportPortal>
      )}
      <MiniMap
        nodeColor={miniMapNodeColor}
        nodeStrokeColor={oracle.ink}
        nodeStrokeWidth={2}
        pannable={!cooperative}
        zoomable={!cooperative}
        style={{ width: 140, height: 96, border: `1px solid ${oracle.border}`, borderRadius: 6, pointerEvents: cooperative ? 'none' : undefined }}
      />
      {onOptionsChange && (
        <Panel position="top-right" className="diagram-layer-controls">
          <div style={{ display: 'flex', gap: 8 }}>
            {showFlowControl && <button
              type="button"
              style={{ ...layerBtn, ...(options?.showEndpoints ? layerBtnActive : null) }}
              aria-pressed={options?.showEndpoints ?? false}
              title="Show/hide the subnet endpoints and the route-table dots — then click a dot to open its table"
              onClick={() => {
                const next = !options?.showEndpoints;
                onOptionsChange({ ...options, showEndpoints: next, showDots: next });
              }}
            >
              {options?.showEndpoints ? 'Hide endpoints' : 'Show endpoints'}
            </button>}
            <button
              type="button"
              style={{ ...layerBtn, ...(options?.showFlows ? layerBtnActive : null) }}
              aria-pressed={options?.showFlows ?? false}
              title={showFlowControl ? 'Show routing tables and select traffic flows to trace per environment' : 'Show routing tables for this network'}
              onClick={() => onOptionsChange({ ...options, showFlows: !options?.showFlows })}
            >
              {showFlowControl
                ? options?.showFlows ? 'Hide flows' : 'Show flows'
                : options?.showFlows ? 'Hide routing tables' : 'Show routing tables'}
            </button>
          </div>
        </Panel>
      )}
      {!onOptionsChange && flowHint && (
        <Panel position="top-right">
          <button type="button" style={hintBtn} onClick={flowHint.onClick} title={flowHint.label}>
            <span style={{ fontWeight: 600, color: oracle.textMuted }}>{flowHint.label}</span>
            <span style={{ color: oracle.redDark }}>{flowHint.action}</span>
          </button>
        </Panel>
      )}
    </ReactFlow>
    {cooperative && gestureHint && <div className="diagram-gesture-hint" role="status">
      {gestureHint === 'touch'
        ? 'Use two fingers to move the diagram. Pinch to zoom.'
        : `Hold ${navigator.userAgent.includes('Mac') ? '⌘' : 'Ctrl'} and scroll to zoom the diagram.`}
    </div>}
    </div>
    </ActiveRulesContext.Provider>
    </RtContext.Provider>
  );
}
