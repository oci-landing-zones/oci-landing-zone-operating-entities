/**
 * LzDiagram — React Flow renderer for the DiagramModel.
 *
 * Consumes the exact same intermediate the .drawio exporter does, so what you
 * see is what you export. Animated edges here become draw.io flowAnimation on
 * export. Custom node types, clickable drill-downs and packet-flow edges plug
 * in here as the wizard grows.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  Panel,
  Handle,
  Position,
  BaseEdge,
  ViewportPortal,
  getSmoothStepPath,
  useReactFlow,
  useStore,
  useInternalNode,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
  type EdgeProps,
  type EdgeTypes,
  type InternalNode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { SHIELD_SVG } from './shieldSvg';
import { ROUTE_TABLE_SVG } from './routeTableSvg';
import { IGW_SVG, NATGW_SVG, SGW_SVG, FIREWALL_SVG, LB_SVG, OSN_SVG, DRG_SVG, VM_SVG } from './icons';

const ICONS: Record<string, string> = { igw: IGW_SVG, natgw: NATGW_SVG, sgw: SGW_SVG, firewall: FIREWALL_SVG, lb: LB_SVG };

/** Invisible connection point — floating edges compute their own endpoints. */
const hiddenHandle: React.CSSProperties = { opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, border: 'none', background: 'transparent', pointerEvents: 'none' };

/** Lets nested node components open/close route tables without prop-drilling. */
const RtContext = createContext<(ids: string[]) => void>(() => {});
const CAPTION_COLORS = { green: '#1E7B2F', orange: '#C25425' } as const;
import type { DiagramEdge, DiagramModel, DiagramNode, DiagramOptions } from '../model/types';
import { oracle } from '../theme';

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
    case 'compartment':
      if (node.tone === 'gray')
        // Gray compartments are solid; compartment boundaries are always square.
        return { background: oracle.compGrayFill, border: `1.5px solid ${oracle.compGrayBorder}`, borderRadius: 0, color: '#3f4750', fontWeight: 600 };
      return node.tone === 'green'
        ? { background: oracle.compGreenFill, border: `1.5px dotted ${oracle.compGreenBorder}`, borderRadius: 0, color: '#3f4750', fontWeight: 600 }
        : { background: oracle.compYellowFill, border: `1.5px dotted ${oracle.compYellowBorder}`, borderRadius: 0, color: '#3f4750', fontWeight: 600 };
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
      return { background: '#ffffff', border: `1.5px solid ${oracle.compGrayBorder}`, borderRadius: 0, color: oracle.ink, fontWeight: 700 };
    case 'routetable':
    case 'rtdot':
      return { background: 'transparent', border: 'none', borderRadius: 0 };
  }
}

/** Compartment node: left-aligned label + a Security Zone shield (top-right) when secure. */
function CompartmentNode({ data }: NodeProps) {
  const d = data as { label?: string; secure?: boolean; container?: boolean };
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: d.container ? 'flex-start' : 'center', paddingTop: d.container ? 7 : 0, paddingLeft: 10, paddingRight: 22, boxSizing: 'border-box', fontSize: 12, fontWeight: 600, color: '#3f4750', whiteSpace: 'pre-line' }}>
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
        <span style={{ width: 34, height: 34, lineHeight: 0, background: '#ffffff', borderRadius: '50%' }} dangerouslySetInnerHTML={{ __html: iconSvg.replace('width="48" height="48"', 'width="34" height="34"') }} />
      )}
      {/* Narrow enough that two-word names (incl. "NAT Gateway") wrap to two lines
          instead of bleeding past the gateway into the neighbouring subnet. */}
      <span style={{ width: 112, fontSize: 9.5, fontWeight: 700, color: oracle.ink, textAlign: 'center', whiteSpace: 'normal', overflowWrap: 'anywhere', lineHeight: 1.25 }}>{d.label}</span>
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
      <span style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 2, fontSize: 11, fontWeight: 800, color: oracle.ink, whiteSpace: 'nowrap' }}>{d.label}</span>
      <Handle type="target" position={Position.Top} style={hiddenHandle} isConnectable={false} />
      <Handle type="source" position={Position.Top} style={hiddenHandle} isConnectable={false} />
    </div>
  );
}

/** VCN attachment node: a small pill labelled vcn-<env>-attach, wired VCN → attach → DRG. */
function AttachmentNode({ data }: NodeProps) {
  const d = data as { label?: string };
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', padding: '0 8px', fontSize: 11.5, fontWeight: 800, color: '#1f3a63', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {d.label}
      <Handle type="target" position={Position.Left} style={hiddenHandle} isConnectable={false} />
      <Handle type="source" position={Position.Right} style={hiddenHandle} isConnectable={false} />
    </div>
  );
}

/** Project compartment: a square white box with its full generated name. */
function ProjectNode({ data }: NodeProps) {
  const d = data as { label?: string };
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 8px', boxSizing: 'border-box', fontSize: 12, fontWeight: 700, color: oracle.ink, textAlign: 'center', whiteSpace: 'normal', overflowWrap: 'anywhere', lineHeight: 1.2 }}>
      {d.label}
    </div>
  );
}

const RT_COLORS = { hub: '#8C3A80', gateway: '#8C3A80', drg: '#B23A48', spoke: '#3A8A4E' } as const;
type RtRow = { destination: string; targetType: string; target: string; routeType: string };
const RT_COLS = {
  vcn: { grid: '1fr 1.2fr 1.3fr 0.7fr', headers: ['Destination', 'Target Type', 'Target', 'Route Type'], cells: (r: RtRow) => [r.destination, r.targetType, r.target, r.routeType] },
  drg: { grid: '1fr 1.1fr 1.5fr', headers: ['Dest CIDR', 'Next Hop Type', 'Next Hop Name'], cells: (r: RtRow) => [r.destination, r.targetType, r.target] },
} as const;

/** Route-table box: coloured header (with close ×) + ONTV columns; flow-matched rows highlight. */
function RouteTableNode({ id, data }: NodeProps) {
  const d = data as { label?: string; rtRows?: RtRow[]; rtColumns?: keyof typeof RT_COLS; rtNote?: string; rtTone?: keyof typeof RT_COLORS; rtHighlight?: number[] };
  const color = RT_COLORS[d.rtTone ?? 'hub'];
  const cfg = RT_COLS[d.rtColumns ?? 'vcn'];
  const hl = new Set(d.rtHighlight ?? []);
  const toggleRt = useContext(RtContext);
  const cellColor = (j: number) => (j === 0 ? '#3f4750' : j === cfg.headers.length - 1 ? '#8a857f' : j === 2 ? color : '#6b6660');
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#fff', border: `1px solid ${color}`, boxSizing: 'border-box', overflow: 'hidden' }}>
      <Handle type="target" position={Position.Right} style={hiddenHandle} isConnectable={false} />
      <Handle type="source" position={Position.Left} style={hiddenHandle} isConnectable={false} />
      <div style={{ background: color, color: '#fff', fontWeight: 800, fontSize: 10, padding: '3px 7px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span title={d.label} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.label}</span>
        <span title="Close" onClick={(e) => { e.stopPropagation(); toggleRt([id]); }} style={{ cursor: 'pointer', fontWeight: 700, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>✕</span>
      </div>
      {d.rtNote && <div style={{ fontSize: 8, color: '#B23A48', fontWeight: 700, padding: '2px 7px', background: '#fdecea' }}>{d.rtNote}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: cfg.grid, gap: 4, fontSize: 7.5, fontWeight: 700, color: '#8a857f', textTransform: 'uppercase', letterSpacing: 0.2, padding: '2px 7px', borderBottom: '1px solid #eceae8' }}>
        {cfg.headers.map((h) => <span key={h}>{h}</span>)}
      </div>
      {(d.rtRows ?? []).map((row, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: cfg.grid, gap: 4, fontSize: 8.5, lineHeight: 1.25, padding: '2px 7px', background: hl.has(i) ? '#fff3c4' : 'transparent' }}>
          {cfg.cells(row).map((c, j) => (
            <span key={j} title={c} style={{ color: cellColor(j), fontWeight: j === 2 ? 700 : 500, fontFamily: j === 0 ? 'ui-monospace, Menlo, monospace' : undefined, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Route-table dot (ONTV-style): click to open/close its table; a line runs to the open box. */
function RtDotNode({ data }: NodeProps) {
  const d = data as { rtDotOpen?: boolean; rtDotConfigured?: boolean; rtDotTone?: keyof typeof RT_COLORS };
  const color = d.rtDotConfigured ? RT_COLORS[d.rtDotTone ?? 'hub'] : '#b0aca8';
  return (
    <div
      title={d.rtDotOpen ? 'Hide route table' : 'Show route table'}
      style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', background: color, cursor: 'pointer', boxSizing: 'border-box', border: '1.5px solid #fff', boxShadow: d.rtDotOpen ? `0 0 0 3px ${color}66` : '0 0 1px rgba(0,0,0,0.4)' }}
    >
      <Handle type="source" position={Position.Left} style={hiddenHandle} isConnectable={false} />
      <Handle type="target" position={Position.Right} style={hiddenHandle} isConnectable={false} />
    </div>
  );
}

const nodeTypes: NodeTypes = { landingzone: CompartmentNode, compartment: CompartmentNode, subnet: SubnetNode, gateway: GatewayNode, vcn: VcnNode, drg: DrgNode, attachment: AttachmentNode, project: ProjectNode, routetable: RouteTableNode, rtdot: RtDotNode };

/** Border-intersection point of `node` on the line toward `other` (floating-edge geometry). */
function intersect(node: InternalNode, other: InternalNode): { x: number; y: number } {
  const w = (node.measured.width ?? 0) / 2;
  const h = (node.measured.height ?? 0) / 2;
  const x2 = node.internals.positionAbsolute.x + w;
  const y2 = node.internals.positionAbsolute.y + h;
  const x1 = other.internals.positionAbsolute.x + (other.measured.width ?? 0) / 2;
  const y1 = other.internals.positionAbsolute.y + (other.measured.height ?? 0) / 2;
  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1) || 1);
  const xx3 = a * xx1;
  const yy3 = a * yy1;
  return { x: w * (xx3 + yy3) + x2, y: h * (-xx3 + yy3) + y2 };
}

/** Which side of `node` the intersection point sits on — picks the step-edge exit direction. */
function sideOf(node: InternalNode, p: { x: number; y: number }): Position {
  const nx = node.internals.positionAbsolute.x;
  const ny = node.internals.positionAbsolute.y;
  const w = node.measured.width ?? 0;
  if (p.x <= nx + 1) return Position.Left;
  if (p.x >= nx + w - 1) return Position.Right;
  if (p.y <= ny + 1) return Position.Top;
  return Position.Bottom;
}

/** Centre of a named border of `node` — used when an edge pins a fixed connection side. */
function sidePoint(node: InternalNode, side: string, port = 0.5): { x: number; y: number; pos: Position } {
  const nx = node.internals.positionAbsolute.x;
  const ny = node.internals.positionAbsolute.y;
  const w = node.measured.width ?? 0;
  const h = node.measured.height ?? 0;
  switch (side) {
    case 'left': return { x: nx, y: ny + h * port, pos: Position.Left };
    case 'right': return { x: nx + w, y: ny + h * port, pos: Position.Right };
    case 'top': return { x: nx + w * port, y: ny, pos: Position.Top };
    default: return { x: nx + w * port, y: ny + h, pos: Position.Bottom };
  }
}

/**
 * Floating edge with orthogonal (right-angle) routing. When the edge pins fixed
 * connection sides it anchors to those border centres; otherwise it falls back
 * to nearest-border geometry. Endpoints always land exactly on the node border.
 */
function FloatingEdge({ id, source, target, markerEnd, style, data }: EdgeProps) {
  const s = useInternalNode(source);
  const t = useInternalNode(target);
  if (!s || !t) return null;
  const d = data as { sourceSide?: string; targetSide?: string; sourcePort?: number; targetPort?: number; channel?: number; centerX?: number } | undefined;
  const sp = d?.sourceSide ? sidePoint(s, d.sourceSide, d.sourcePort) : { ...intersect(s, t), pos: undefined as Position | undefined };
  const tp = d?.targetSide ? sidePoint(t, d.targetSide, d.targetPort) : { ...intersect(t, s), pos: undefined as Position | undefined };
  // A pinned centerX holds the vertical bend in a fixed channel; otherwise it
  // floats at the endpoints' midpoint. `channel` staggers parallel links either way.
  const centerX = d?.centerX != null
    ? d.centerX + (d.channel ?? 0)
    : d?.channel != null ? (sp.x + tp.x) / 2 + d.channel : undefined;
  const [path] = getSmoothStepPath({
    sourceX: sp.x, sourceY: sp.y, sourcePosition: sp.pos ?? sideOf(s, sp),
    targetX: tp.x, targetY: tp.y, targetPosition: tp.pos ?? sideOf(t, tp),
    borderRadius: 5, offset: 12,
    ...(centerX != null ? { centerX } : {}),
  });
  return <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />;
}

const edgeTypes: EdgeTypes = { floating: FloatingEdge };

/** Rounded orthogonal polyline through precomputed (already right-angled) vertices.
 * buildGraph routes the flow through clean channels; here we just draw it with
 * softened corners so the packet animates smoothly along one continuous path. */
function roundedPolyline(pts: { x: number; y: number }[], r = 7): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
    const l1 = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
    const l2 = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const a = { x: p1.x - ((p1.x - p0.x) / l1) * rr, y: p1.y - ((p1.y - p0.y) / l1) * rr };
    const b = { x: p1.x + ((p2.x - p1.x) / l2) * rr, y: p1.y + ((p2.y - p1.y) / l2) * rr };
    d += ` L${a.x},${a.y} Q${p1.x},${p1.y} ${b.x},${b.y}`;
  }
  const last = pts[pts.length - 1];
  d += ` L${last.x},${last.y}`;
  return d;
}

/**
 * Moving packet for one flow path: a labelled source→dest pill. In auto mode it
 * loops along the path (SMIL animateMotion). In step mode it glides ALONG the
 * path between hops (getPointAtLength on a hidden path ref) — so it follows the
 * route instead of teleporting straight between nodes.
 */
function FlowPacket({ path, color, label, step, frac, dur }: {
  path: string;
  color: string;
  label: string;
  step: number | null | undefined;
  frac: number;
  dur: string;
}) {
  const ref = useRef<SVGPathElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const from = useRef(0);
  const raf = useRef(0);
  useEffect(() => {
    if (step == null) { setPos(null); return; }
    const el = ref.current;
    if (!el) return;
    const total = el.getTotalLength() || 1;
    const target = Math.max(0, Math.min(1, frac)) * total;
    const start = from.current;
    let t0 = 0;
    cancelAnimationFrame(raf.current);
    const tick = (t: number) => {
      if (!t0) t0 = t;
      const k = Math.min(1, (t - t0) / 500);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // ease-in-out
      const p = el.getPointAtLength(start + (target - start) * e);
      setPos({ x: p.x, y: p.y });
      if (k < 1) raf.current = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [step, frac, path]);

  const pillW = Math.max(30, label.length * 6.1 + 16);
  const pill = (
    <g>
      <rect x={-pillW / 2} y={-10} width={pillW} height={20} rx={10} fill={color} stroke="#fff" strokeWidth={1.5} />
      <text textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={800} fill="#fff">{label}</text>
    </g>
  );
  return (
    <>
      <path ref={ref} d={path} fill="none" stroke="none" />
      {step == null ? (
        <g>
          <animateMotion dur={dur} repeatCount="indefinite" path={path} />
          {pill}
        </g>
      ) : pos ? (
        <g transform={`translate(${pos.x},${pos.y})`}>{pill}</g>
      ) : null}
    </>
  );
}

/**
 * Flow overlay — an SVG layer drawn inside the viewport (so it pans/zooms with
 * the diagram). For each active flow it draws a continuous coloured path through
 * every hop node, numbered hop badges, and a packet that either auto-loops along
 * the path or, when the user drives it, sits on the current step's node.
 * `steps[flowId]`: null/undefined = auto-play; a number = that 0-based hop.
 */
function FlowOverlay({ flowEdges, steps, width, height }: {
  flowEdges: DiagramEdge[];
  steps: Record<string, number | null | undefined>;
  width: number;
  height: number;
}) {
  return (
    <svg width={Math.max(1, width)} height={Math.max(1, height)} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none', zIndex: 2500 }}>
      {flowEdges.map((e) => {
        const pts = e.points ?? [];
        if (pts.length < 2) return null;
        const path = roundedPolyline(pts);
        const color = e.color ?? '#2196F3';
        const flowId = e.id.replace(/^flow-/, '');
        // All endpoints of one flow kind share the same step state, keyed by the
        // `<scope>:<kind>` group (works for both all-endpoint and single-endpoint picks).
        const gp = flowId.split('#')[0].split(':');
        const groupId = `${gp[0]}:${gp[1]}`;
        const mId = `fa-${flowId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
        const badges = e.badges ?? [];
        const step = steps[groupId];
        const dur = `${Math.max(6, pts.length * 1.4).toFixed(1)}s`;
        // Path-length fraction of each vertex, so a badge maps to a point ALONG the
        // path (lets the stepped packet follow the route rather than teleport).
        const cum = [0];
        for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
        const total = cum[cum.length - 1] || 1;
        const fracOf = (p: { x: number; y: number }) => {
          let bi = 0, bd = Infinity;
          for (let i = 0; i < pts.length; i++) { const d = Math.hypot(pts[i].x - p.x, pts[i].y - p.y); if (d < bd) { bd = d; bi = i; } }
          return cum[bi] / total;
        };
        const frac = step != null && badges[step] ? fracOf(badges[step]) : 0;
        const seen = new Map<string, number>();
        return (
          <g key={e.id}>
            <defs>
              <marker id={mId} markerWidth="9" markerHeight="9" refX="6" refY="4.5" orient="auto">
                <path d="M0,0 L9,4.5 L0,9 Z" fill={color} />
              </marker>
            </defs>
            <path d={path} fill="none" stroke={color} strokeOpacity={0.2} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
            <path d={path} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" markerEnd={`url(#${mId})`} />
            {/* directional arrow on each segment (primary endpoint only, to avoid clutter) */}
            {badges.length > 0 && pts.slice(1).map((b, i) => {
              const a = pts[i];
              const len = Math.hypot(b.x - a.x, b.y - a.y);
              if (len < 38) return null;
              const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
              return (
                <g key={`arr-${i}`} transform={`translate(${(a.x + b.x) / 2},${(a.y + b.y) / 2}) rotate(${ang})`}>
                  <path d="M-5,-4.5 L6,0 L-5,4.5 Z" fill={color} stroke="#fff" strokeWidth={0.8} />
                </g>
              );
            })}
            {/* every endpoint carries its own labelled source→dest pill */}
            <FlowPacket path={path} color={color} label={e.label ?? ''} step={step} frac={frac} dur={dur} />
            {badges.length > 0 && badges.map((b, i) => {
              const k = seen.get(b.node) ?? 0;
              seen.set(b.node, k + 1);
              const active = step === i;
              return (
                <g key={`${b.node}-${i}`} transform={`translate(${b.x},${b.y - 6 - k * 22})`}>
                  <circle r={active ? 11 : 9} fill={active ? '#fff' : color} stroke={color} strokeWidth={active ? 3 : 1.6} />
                  <text textAnchor="middle" dominantBaseline="central" fontSize={active ? 11.5 : 10.5} fontWeight={800} fill={active ? color : '#fff'}>{b.seq}</text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

function toReactFlow(diagram: DiagramModel): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = diagram.nodes.map((n) => {
    // Kinds with a custom node component draw their own label; the style is box-only.
    const customType = n.kind === 'landingzone' || n.kind === 'compartment' || n.kind === 'subnet' || n.kind === 'gateway' || n.kind === 'vcn' || n.kind === 'drg' || n.kind === 'attachment' || n.kind === 'project' || n.kind === 'routetable' || n.kind === 'rtdot';
    return {
    id: n.id,
    position: { x: n.x, y: n.y },
    type: customType ? n.kind : undefined,
    // Dimensions on the node (not just style) so the MiniMap can size its rects.
    width: n.width,
    height: n.height,
    ...(n.parentId ? { parentId: n.parentId, extent: 'parent' as const } : {}),
    data: { label: n.label, kind: n.kind, tone: n.tone, secure: n.secure, container: n.container, icon: n.icon, caption: n.caption, captionTone: n.captionTone, ipNote: n.ipNote, endpointName: n.endpointName, endpointIp: n.endpointIp, publicSubnet: n.publicSubnet, rtRows: n.rtRows, rtColumns: n.rtColumns, rtNote: n.rtNote, rtTone: n.rtTone, rtHighlight: n.rtHighlight, rtDotTableId: n.rtDotTableId, rtDotOpen: n.rtDotOpen, rtDotConfigured: n.rtDotConfigured, rtDotTone: n.rtDotTone },
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
  const edges: Edge[] = diagram.edges.filter((e) => !e.waypoints).map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'floating',
    label: e.label,
    data: { sourceSide: e.sourceSide, targetSide: e.targetSide, sourcePort: e.sourcePort, targetPort: e.targetPort, channel: e.channel, centerX: e.centerX },
    // Lift links above the opaque compartment fills. Dot→table connectors ride
    // just under the table (above the dots) so the whole line stays visible.
    zIndex: e.target.startsWith('rt-') ? 1900 : 1000,
    style: e.target.startsWith('rt-') ? { stroke: '#6b6660', strokeWidth: 1.8 } : { stroke: '#6b6660', strokeWidth: 1.4 },
    labelStyle: { fill: oracle.ink, fontSize: 11, fontWeight: 600 },
    labelBgStyle: { fill: oracle.surface },
  }));

  return { nodes, edges };
}

function miniMapNodeColor(node: Node): string {
  const data = node.data as { kind?: string; tone?: string };
  switch (data.kind) {
    case 'compartment': return data.tone === 'gray' ? oracle.compGrayFill : data.tone === 'green' ? oracle.compGreenFill : oracle.compYellowFill;
    case 'project':     return '#ffffff';
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

const ZOOM_PRESETS = [0.5, 1, 1.5, 2, 3];

const bar: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 1, padding: 3,
  background: oracle.surface, border: `1px solid ${oracle.border}`, borderRadius: 7,
  boxShadow: '0 1px 4px rgba(32,31,28,0.12)',
};
const iconBtn: React.CSSProperties = {
  width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 13, fontWeight: 800, color: oracle.text, background: 'transparent', border: 'none',
  borderRadius: 4, cursor: 'pointer', lineHeight: 1,
};
const presetBtn: React.CSSProperties = {
  padding: '3px 5px', fontSize: 10.5, fontWeight: 700, color: oracle.text,
  background: 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer',
};
const pct: React.CSSProperties = {
  minWidth: 36, textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: oracle.textMuted,
};
const sep: React.CSSProperties = { width: 1, height: 15, background: oracle.border, margin: '0 3px' };

/** Layer toggle button (top-right): show/hide route tables, endpoints, flows. */
const layerBtn: React.CSSProperties = {
  padding: '5px 11px', fontSize: 11.5, fontWeight: 700, color: oracle.text,
  background: oracle.surface, border: `1px solid ${oracle.border}`, borderRadius: 7,
  boxShadow: '0 1px 4px rgba(32,31,28,0.12)', cursor: 'pointer',
};
const layerBtnActive: React.CSSProperties = { background: oracle.red, border: `1px solid ${oracle.redDark}`, color: '#fff' };

/** Unified zoom/navigation bar: +  −  [live %] | presets | fit  reset. */
function ZoomBar() {
  const { zoomIn, zoomOut, zoomTo, fitView, setViewport } = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);

  return (
    <div style={bar}>
      <button type="button" style={iconBtn} title="Zoom in" onClick={() => zoomIn({ duration: 150 })}>+</button>
      <button type="button" style={iconBtn} title="Zoom out" onClick={() => zoomOut({ duration: 150 })}>−</button>
      <span style={pct}>{Math.round(zoom * 100)}%</span>
      <span style={sep} />
      {ZOOM_PRESETS.map((z) => (
        <button key={z} type="button" style={presetBtn} onClick={() => zoomTo(z, { duration: 200 })}>
          {z * 100}%
        </button>
      ))}
      <span style={sep} />
      <button type="button" style={iconBtn} title="Fit all objects" onClick={() => fitView({ padding: 0.2, duration: 250 })}>⤢</button>
      <button type="button" style={iconBtn} title="Reset view (100%)" onClick={() => setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 200 })}>↺</button>
    </div>
  );
}

export default function LzDiagram({ diagram, options, onOptionsChange, flowSteps, showFlowControl = true }: {
  diagram: DiagramModel;
  options?: DiagramOptions;
  onOptionsChange?: (next: DiagramOptions) => void;
  /** Per-flow packet step: null/absent = auto-play, a number = that 0-based hop. */
  flowSteps?: Record<string, number | null>;
  /** Whether the selected hub topology has a packet-flow adapter. */
  showFlowControl?: boolean;
}) {
  const { nodes, edges } = useMemo(() => toReactFlow(diagram), [diagram]);
  const { fitView } = useReactFlow();
  // Flow overlay inputs: the waypoint edges + the diagram's outer bounds.
  const flowEdges = useMemo(() => diagram.edges.filter((e) => !!e.waypoints), [diagram]);
  const region = diagram.nodes.find((n) => n.kind === 'region');
  // Pane width — so switching view modes (or resizing the window) re-centres the
  // diagram instead of leaving it pinned to its previous-layout position.
  const paneWidth = useStore((s) => s.width);

  const toggleTables = useCallback((ids: string[]) => {
    if (!onOptionsChange || ids.length === 0) return;
    const cur = options?.openTables ?? [];
    const allOpen = ids.every((id) => cur.includes(id));
    const next = allOpen ? cur.filter((id) => !ids.includes(id)) : [...new Set([...cur, ...ids])];
    onOptionsChange({ ...options, openTables: next });
  }, [onOptionsChange, options]);
  const onNodeClick = useCallback((_e: React.MouseEvent, node: Node) => {
    const d = node.data as { kind?: string; rtDotTableId?: string };
    if (d.kind === 'rtdot' && d.rtDotTableId) toggleTables([d.rtDotTableId]);
  }, [toggleTables]);

  // When a flow is active, the view should frame the FLOW, not the whole diagram:
  // the path nodes (edges carrying a colour) plus the route-table boxes the flow
  // opened. That's what makes the packet path read end-to-end like ONTV.
  const flowNodeIds = useMemo(() => {
    const ids = new Set<string>();
    diagram.edges.forEach((e) => { if (e.color) { ids.add(e.source); ids.add(e.target); } });
    diagram.nodes.forEach((n) => { if (n.kind === 'routetable' && n.rtHighlight?.length) ids.add(n.id); });
    return [...ids];
  }, [diagram]);
  const flowKey = flowNodeIds.join(',');

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
  useEffect(() => {
    const key = `${layoutKey}|${flowKey}`;
    if (key === lastFitKey.current) return;
    lastFitKey.current = key;
    const raf = requestAnimationFrame(() => {
      if (flowNodeIds.length > 1) fitView({ nodes: flowNodeIds.map((id) => ({ id })), padding: 0.22, duration: 350 });
      else fitView({ padding: 0.28, duration: 250 });
    });
    return () => cancelAnimationFrame(raf);
  }, [layoutKey, flowKey, flowNodeIds, fitView]);

  return (
    <RtContext.Provider value={toggleTables}>
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodeClick={onNodeClick}
      nodesDraggable={false}
      nodesConnectable={false}
      fitView
      fitViewOptions={{ padding: 0.28 }}
      minZoom={0.2}
      maxZoom={4}
      proOptions={{ hideAttribution: true }}
    >
      <Background />
      {flowEdges.length > 0 && (
        <ViewportPortal>
          <FlowOverlay flowEdges={flowEdges} steps={flowSteps ?? {}} width={region?.width ?? 2000} height={region?.height ?? 2000} />
        </ViewportPortal>
      )}
      <MiniMap
        nodeColor={miniMapNodeColor}
        nodeStrokeColor={oracle.ink}
        nodeStrokeWidth={2}
        pannable
        zoomable
        style={{ width: 140, height: 96, border: `1px solid ${oracle.border}`, borderRadius: 6 }}
      />
      <Panel position="top-left">
        <ZoomBar />
      </Panel>
      {onOptionsChange && (
        <Panel position="top-right">
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
              title="Show/hide the flow picker — select traffic flows to trace per environment"
              onClick={() => onOptionsChange({ ...options, showFlows: !options?.showFlows })}
            >
              {options?.showFlows ? 'Hide flows' : 'Show flows'}
            </button>
          </div>
        </Panel>
      )}
    </ReactFlow>
    </RtContext.Provider>
  );
}
