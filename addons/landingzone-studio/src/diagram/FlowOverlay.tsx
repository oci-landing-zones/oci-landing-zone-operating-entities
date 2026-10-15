/**
 * Flow overlay — an SVG layer drawn inside the viewport (so it pans/zooms with
 * the diagram). For each traced path it draws:
 *   - a white casing under a solid line with softly rounded corners, so the route
 *     reads over busy compartments;
 *   - its own parallel lane where flows share a leg, instead of overlapping;
 *   - a ring where the flow starts, evenly spaced chevrons for direction (visible
 *     even when paused), and an arrowhead where it ends;
 *   - a small packet dot that loops the route, or — when stepping — rests on the
 *     current hop with the travelled part solid and the rest faded;
 *   - numbered hop badges (ink on white, ringed in the flow colour), with a green
 *     check on firewall-inspected hops, slotted side by side where flows meet;
 *   - one static label riding on its own line, so text never covers resource names.
 *
 * Paths are clickable: clicking one selects that flow (others fade, it gains a
 * glow) and clicking it again clears the selection. Hovering a path or a sidebar
 * row (`focus`) previews the same emphasis. With all flows shown, badges and
 * labels appear only on the emphasised flow so the overview stays readable.
 * `prefers-reduced-motion` turns all motion off.
 */

import { useEffect, useRef, useState } from 'react';
import type { DiagramEdge } from '../model/types';
import { oracle } from '../theme';
import {
  badgeSlots, flowGroup, fractionNearest, labelAnchor, laneOffsets, marksAlong, offsetPolyline, pathLengths, type Point,
} from './flowOverlayGeometry';

export interface FlowFocus {
  group: string;
  /** 0-based hop to emphasise, when hovering a hop row. */
  hop?: number;
}

/** Rounded orthogonal polyline through precomputed (already right-angled) vertices. */
function roundedPolyline(pts: Point[], r = 10): string {
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
  return `${d} L${last.x},${last.y}`;
}

function useReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const media = window.matchMedia?.(query);
    if (!media) return;
    const onChange = () => setReduced(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** The packet: loops the route in auto mode; glides along it to the current hop when stepping. */
function FlowPacket({ path, color, step, frac, dur, reducedMotion }: {
  path: string;
  color: string;
  step: number | null | undefined;
  frac: number;
  dur: string;
  reducedMotion: boolean;
}) {
  const ref = useRef<SVGPathElement>(null);
  const [pos, setPos] = useState<Point | null>(null);
  const from = useRef(0);
  const raf = useRef(0);
  useEffect(() => {
    if (step == null) { setPos(null); return; }
    const el = ref.current;
    if (!el) return;
    const target = Math.max(0, Math.min(1, frac)) * (el.getTotalLength() || 1);
    if (reducedMotion) {
      const p = el.getPointAtLength(target);
      setPos({ x: p.x, y: p.y });
      from.current = target;
      return;
    }
    const start = from.current;
    let t0 = 0;
    cancelAnimationFrame(raf.current);
    const tick = (t: number) => {
      if (!t0) t0 = t;
      const k = Math.min(1, (t - t0) / 450);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // ease-in-out
      const p = el.getPointAtLength(start + (target - start) * e);
      setPos({ x: p.x, y: p.y });
      if (k < 1) raf.current = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [step, frac, path, reducedMotion]);

  const dot = (
    <g>
      <circle r={11} fill={color} opacity={0.22} />
      <circle r={5.5} fill={color} stroke="#fff" strokeWidth={2} />
    </g>
  );
  return (
    <>
      <path ref={ref} d={path} fill="none" stroke="none" />
      {step == null ? (!reducedMotion && (
        <g>
          <animateMotion dur={dur} repeatCount="indefinite" path={path} />
          {dot}
        </g>
      )) : pos ? <g transform={`translate(${pos.x},${pos.y})`}>{dot}</g> : null}
    </>
  );
}

/** Arrowhead at the end of a route, pointing along its last leg. */
function arrowHead(pts: Point[]): { x: number; y: number; angle: number } {
  const end = pts[pts.length - 1];
  const prev = pts[pts.length - 2] ?? end;
  return { x: end.x, y: end.y, angle: (Math.atan2(end.y - prev.y, end.x - prev.x) * 180) / Math.PI };
}

export default function FlowOverlay({ flowEdges, steps, width, height, focus, selected, allFlows = false, onSelect, onHover }: {
  flowEdges: DiagramEdge[];
  steps: Record<string, number | null | undefined>;
  width: number;
  height: number;
  /** Previewed flow (hover in the sidebar or on a path). */
  focus?: FlowFocus | null;
  /** Flow selected by clicking its path. */
  selected?: string | null;
  /** Every flow is drawn (coloured by traffic type): show detail only on the emphasised one. */
  allFlows?: boolean;
  onSelect?: (group: string) => void;
  onHover?: (group: string | null) => void;
}) {
  const reducedMotion = useReducedMotion();
  const emphasis = focus?.group ?? selected ?? null;
  // Lanes: one per flow, or one per traffic type when every flow is drawn —
  // same-coloured flows then share a lane rather than fanning out across the hub.
  const laneKey = (group: string) => (allFlows ? group.split(':')[1] : group);
  const lanes = laneOffsets(flowEdges.map((edge) => laneKey(flowGroup(edge.id.replace(/^flow-/, '')))));
  // Hop badges are drawn for the first endpoint of each flow; other endpoints of
  // the same flow rest their packet against those same hops.
  const groupBadges = new Map<string, NonNullable<DiagramEdge['badges']>>();
  const flows = flowEdges.flatMap((edge) => {
    const raw = edge.points ?? [];
    if (raw.length < 2) return [];
    const group = flowGroup(edge.id.replace(/^flow-/, ''));
    const badges = edge.badges ?? [];
    if (badges.length && !groupBadges.has(group)) groupBadges.set(group, badges);
    const pts = offsetPolyline(raw, lanes.get(laneKey(group)) ?? 0);
    const detailed = !allFlows || group === emphasis;
    return [{ edge, group, badges: detailed ? badges : [], detailed, pts, path: roundedPolyline(pts), color: edge.color ?? oracle.ink }];
  });
  const slots = badgeSlots(flows.flatMap((flow) => flow.badges));
  const slotStarts = flows.map((_, i) => flows.slice(0, i).reduce((sum, flow) => sum + flow.badges.length, 0));

  const layers = flows.map((flow, index) => {
    const { group, pts } = flow;
    const step = steps[group];
    const restOn = step != null ? groupBadges.get(group)?.[step] : undefined;
    const frac = restOn ? fractionNearest(pts, restOn) : 0;
    const { total } = pathLengths(pts);
    return {
      ...flow,
      step,
      frac,
      dur: `${Math.min(12, Math.max(3.5, total / 120)).toFixed(1)}s`,
      opacity: emphasis && emphasis !== group ? 0.14 : 1,
      chosen: emphasis === group,
      // Sparse direction marks; sparser still when every flow is drawn, except on the emphasised one.
      marks: marksAlong(pts, allFlows && emphasis !== group ? 170 : 96),
      head: arrowHead(pts),
      badgeItems: flow.badges.map((badge, i) => ({ badge, i, slot: slots[slotStarts[index] + i] })),
    };
  });
  // Emphasised flow on top of the others.
  const ordered = [...layers].sort((a, b) => Number(a.chosen) - Number(b.chosen));

  return (
    <svg width={Math.max(1, width)} height={Math.max(1, height)} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none', zIndex: 2500 }}>
      {/* Casings first, so every line sits on a clean white bed above the diagram. */}
      {ordered.map(({ edge, path, opacity, chosen }) => (
        <path key={`case-${edge.id}`} d={path} fill="none" stroke="#fff" strokeOpacity={0.92 * opacity} strokeWidth={chosen ? 12 : 9} strokeLinecap="round" strokeLinejoin="round" />
      ))}

      {ordered.map(({ edge, path, pts, color, opacity, step, frac, chosen, marks, head }) => (
        <g key={`line-${edge.id}`} opacity={opacity} style={{ transition: 'opacity 160ms ease' }}>
          {chosen && <path d={path} fill="none" stroke={color} strokeOpacity={0.2} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />}
          {step == null ? (
            <path d={path} fill="none" stroke={color} strokeWidth={chosen ? 4.5 : 3} strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <>
              {/* Stepping: the leg already travelled is solid, the rest is faded. */}
              <path d={path} fill="none" stroke={color} strokeOpacity={0.3} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              <path d={path} pathLength={1} fill="none" stroke={color} strokeWidth={chosen ? 4.5 : 3.4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${frac} 1`} />
            </>
          )}
          {marks.map((mark, i) => (
            <g key={i} transform={`translate(${mark.x},${mark.y}) rotate(${mark.angle})`}>
              <path d="M-3,-4.5 L2.5,0 L-3,4.5" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
              <path d="M-3,-4.5 L2.5,0 L-3,4.5" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          ))}
          <circle cx={pts[0].x} cy={pts[0].y} r={5} fill="#fff" stroke={color} strokeWidth={2.5} />
          <path d="M1,0 L-11,-6.5 L-8,0 L-11,6.5 Z" fill={color} stroke="#fff" strokeWidth={1.5} strokeLinejoin="round"
            transform={`translate(${head.x},${head.y}) rotate(${head.angle})`} />
        </g>
      ))}

      {ordered.map(({ edge, color, opacity, step, frac, dur, path }) => (
        <g key={`packet-${edge.id}`} opacity={opacity}>
          <FlowPacket path={path} color={color} step={step} frac={frac} dur={dur} reducedMotion={reducedMotion} />
        </g>
      ))}

      {ordered.map(({ edge, group, color, opacity, step, badgeItems }) => badgeItems.map(({ badge, i, slot }) => {
        const current = step === i || (focus?.group === group && focus.hop === i);
        return (
          <g key={`badge-${edge.id}-${i}`} opacity={opacity} transform={`translate(${badge.x + slot * 22},${badge.y - 20})`}>
            {current && <circle r={13} fill={color} className="lz-flow-pulse" />}
            <circle r={current ? 11 : 9} fill="#fff" stroke={color} strokeWidth={current ? 3.5 : 2} />
            <text textAnchor="middle" dominantBaseline="central" fontSize={current ? 11.5 : 10.5} fontWeight={800} fill={oracle.ink}>{badge.seq}</text>
            {badge.inspected && (
              <g transform={`translate(${current ? 9 : 7.5},${current ? -9 : -7.5})`}>
                <circle r={5} fill={oracle.green} stroke="#fff" strokeWidth={1.2} />
                <path d="M-2.3,0.1 L-0.6,1.8 L2.4,-1.6" fill="none" stroke="#fff" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
              </g>
            )}
          </g>
        );
      }))}

      {/* One static label per path, riding on its own line — text stays in ink, the ring carries identity. */}
      {ordered.map(({ edge, color, opacity, pts, detailed }) => {
        const label = edge.label ?? '';
        if (!label || !detailed) return null;
        const w = label.length * 5.9 + 22;
        const at = labelAnchor(pts, w);
        return (
          <g key={`label-${edge.id}`} opacity={opacity} transform={`translate(${at.x - w / 2},${at.y - 9})`}>
            <rect width={w} height={18} rx={9} fill="#fff" stroke={color} strokeWidth={1.5} />
            <circle cx={10} cy={9} r={3.5} fill={color} />
            <text x={18} y={9} dominantBaseline="central" fontSize={10} fontWeight={700} fill={oracle.ink}>{label}</text>
          </g>
        );
      })}

      {/* Hit targets last: a wide invisible stroke per path makes the flow easy to click. */}
      {onSelect && ordered.map(({ edge, group, path }) => (
        <path key={`hit-${edge.id}`} d={path} fill="none" stroke="transparent" strokeWidth={16} className="nopan"
          style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
          onClick={(event) => { event.stopPropagation(); onSelect(group); }}
          onMouseEnter={() => onHover?.(group)} onMouseLeave={() => onHover?.(null)}>
          <title>{edge.label ? `${edge.label} — click to ${selected === group ? 'clear the selection' : 'select this flow'}` : 'Select this flow'}</title>
        </path>
      ))}
    </svg>
  );
}
