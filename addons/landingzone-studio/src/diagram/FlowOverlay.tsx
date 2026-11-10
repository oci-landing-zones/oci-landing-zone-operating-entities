import { useEffect, useMemo, useRef, useState } from 'react';
import type { DiagramEdge } from '../model/types';
import { oracle } from '../theme';
import {
  flowGroup, labelAnchor, marksAlong, type Point,
} from './flowOverlayGeometry';
import { flowDisplayPoints, polylinePath } from './displayGeometry';
import { createFlowPlayback, flowHopMarkers, sampleFlowPlayback, pointAtDistance, type ActiveRouteRule } from './flowPlayback';

export interface FlowFocus {
  group: string;
  /** 0-based hop to emphasise, when hovering a hop row. */
  hop?: number;
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

/** Arrowhead at the end of a route, pointing along its last leg. */
function arrowHead(pts: Point[]): { x: number; y: number; angle: number } {
  const end = pts[pts.length - 1];
  const prev = pts[pts.length - 2] ?? end;
  return { x: end.x, y: end.y, angle: (Math.atan2(end.y - prev.y, end.x - prev.x) * 180) / Math.PI };
}

export default function FlowOverlay({ flowEdges, steps, width, height, focus, selected, allFlows = false, onSelect, onHover, onRulesChange }: {
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
  onRulesChange?: (rules: ActiveRouteRule[]) => void;
}) {
  const reducedMotion = useReducedMotion();
  const emphasis = focus?.group ?? selected ?? null;
  const paths = useMemo(() => flowEdges.flatMap((edge) => {
    const pts = flowDisplayPoints(edge);
    if (pts.length < 2) return [];
    const playback = createFlowPlayback(edge);
    return playback.valid ? [{ edge, pts, path: polylinePath(pts), playback }] : [];
  }), [flowEdges]);
  const packetNodes = useRef(new Map<string, SVGGElement>());
  const [currentHops, setCurrentHops] = useState<Record<string, number | undefined>>({});
  const hopKey = useRef('');
  const rulesKey = useRef('');
  const stepsKey = JSON.stringify(steps);
  const playbackSteps = useMemo(() => JSON.parse(stepsKey) as typeof steps, [stepsKey]);
  useEffect(() => {
    let animationFrame = 0;
    let start: number | undefined;
    const update = (elapsed: number) => {
      const hops: Record<string, number | undefined> = {};
      const rules = new Map<string, ActiveRouteRule>();
      for (const { edge, pts, playback } of paths) {
        const group = flowGroup(edge.id.replace(/^flow-/, ''));
        const frame = sampleFlowPlayback(playback, elapsed, playbackSteps[group], reducedMotion);
        const position = pointAtDistance(pts, frame.distance);
        packetNodes.current.get(edge.id)?.setAttribute('transform', `translate(${position.x},${position.y})`);
        hops[edge.id] = frame.hopIndex;
        if (frame.rule) rules.set(`${frame.rule.tableId}\0${frame.rule.ruleId}`, frame.rule);
      }
      const nextHopKey = JSON.stringify(hops);
      if (hopKey.current !== nextHopKey) { hopKey.current = nextHopKey; setCurrentHops(hops); }
      const activeRules = [...rules.values()].sort((a, b) => a.tableId.localeCompare(b.tableId) || a.ruleId.localeCompare(b.ruleId));
      const nextRulesKey = JSON.stringify(activeRules);
      if (rulesKey.current !== nextRulesKey) { rulesKey.current = nextRulesKey; onRulesChange?.(activeRules); }
    };
    update(0);
    const playing = !reducedMotion && paths.some(({ edge }) => playbackSteps[flowGroup(edge.id.replace(/^flow-/, ''))] == null);
    if (!playing) return;
    const tick = (now: number) => {
      start ??= now;
      update(now - start);
      animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [paths, playbackSteps, reducedMotion, onRulesChange]);
  useEffect(() => () => onRulesChange?.([]), [onRulesChange]);
  const flows = paths.map(({ edge, pts, path, playback }) => {
    const group = flowGroup(edge.id.replace(/^flow-/, ''));
    const detailed = !allFlows || group === emphasis;
    const step = steps[group];
    const frame = sampleFlowPlayback(playback, 0, step, reducedMotion);
    return { edge, group, pts, path, step, frame, playback, detailed,
      position: pointAtDistance(pts, frame.distance),
      currentHop: currentHops[edge.id], badges: detailed ? flowHopMarkers(edge) : [], color: edge.color ?? oracle.ink };
  });

  const layers = flows.map((flow) => {
    const { group, pts } = flow;
    return {
      ...flow,
      frac: flow.playback.totalDistance ? flow.frame.distance / flow.playback.totalDistance : 0,
      opacity: emphasis && emphasis !== group ? 0.14 : 1,
      chosen: emphasis === group,
      // Sparse direction marks; sparser still when every flow is drawn, except on the emphasised one.
      marks: marksAlong(pts, allFlows && emphasis !== group ? 170 : 96),
      head: arrowHead(pts),
      badgeItems: flow.badges,
    };
  });
  // Emphasised flow on top of the others.
  const ordered = [...layers].sort((a, b) => Number(a.chosen) - Number(b.chosen));
  const numberedBadges = ordered.flatMap(({ edge, group, color, opacity, chosen, currentHop, badgeItems }) => badgeItems.map((badge) => ({
    edge, color, opacity, chosen, badge,
    hovered: focus?.group === group && focus.hop === badge.seq - 1,
    current: currentHop === badge.seq - 1 || (focus?.group === group && focus.hop === badge.seq - 1),
  }))).sort((a, b) => Number(a.chosen) - Number(b.chosen) || Number(a.hovered) - Number(b.hovered) || Number(a.current) - Number(b.current));

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

      {ordered.map(({ edge, color, opacity, position }) => (
        <g key={`packet-${edge.id}`} data-flow-packet={edge.id} opacity={opacity}>
          <g ref={(node) => { if (node) packetNodes.current.set(edge.id, node); else packetNodes.current.delete(edge.id); }} transform={`translate(${position.x},${position.y})`}>
            <circle r={11} fill={color} opacity={0.22} />
            <circle r={5.5} fill={color} stroke="#fff" strokeWidth={2} />
          </g>
        </g>
      ))}

      {numberedBadges.map(({ edge, color, opacity, badge, current }) => {
        return (
          <g key={`badge-${edge.id}-${badge.seq}`} data-flow-hop={`${edge.id}:${badge.seq}`} data-route-dot={badge.anchorId} opacity={opacity} transform={`translate(${badge.x},${badge.y})`}>
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
      })}

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
