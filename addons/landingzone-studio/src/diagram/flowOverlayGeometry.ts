/**
 * Pure geometry for the flow overlay: parallel lanes so flows sharing a leg stay
 * readable side by side, path-length bookkeeping for the packet, and badge
 * stacking so hop numbers from different flows never sit on top of each other.
 */

export interface Point { x: number; y: number }

/** Gap between parallel flow lanes, in diagram pixels. */
export const LANE_GAP = 7;

/** `<scope>:<kind>` — the flow a trace id (`<scope>:<kind>[:<role>]#<idx>`) belongs to. */
export function flowGroup(traceId: string): string {
  return traceId.split('#')[0].split(':').slice(0, 2).join(':');
}

/** Centred lane offsets: one flow → 0; two → ∓3.5; three → −7, 0, 7. */
export function laneOffsets(groups: string[]): Map<string, number> {
  const unique = [...new Set(groups)];
  return new Map(unique.map((group, index) => [group, (index - (unique.length - 1) / 2) * LANE_GAP]));
}

function dedupe(points: Point[]): Point[] {
  return points.filter((p, i) => i === 0 || Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) > 0.01);
}

/**
 * Shift a polyline sideways by `distance` (positive = left of travel direction),
 * mitring each corner so right-angled routes stay right-angled. A leg that
 * doubles back on itself keeps the incoming offset rather than spiking out.
 */
export function offsetPolyline(points: Point[], distance: number): Point[] {
  const pts = dedupe(points);
  if (distance === 0 || pts.length < 2) return pts;
  const normals = pts.slice(1).map((p, i) => {
    const dx = p.x - pts[i].x;
    const dy = p.y - pts[i].y;
    const len = Math.hypot(dx, dy);
    // Screen y grows downward, so (dy, -dx) is the left-hand normal.
    return { x: dy / len, y: -dx / len };
  });
  return pts.map((p, i) => {
    const before = normals[i - 1];
    const after = normals[i];
    if (!before || !after) {
      const n = before ?? after;
      return { x: p.x + n.x * distance, y: p.y + n.y * distance };
    }
    const dot = before.x * after.x + before.y * after.y;
    if (dot < -0.9) return { x: p.x + before.x * distance, y: p.y + before.y * distance };
    const scale = distance / (1 + dot);
    return { x: p.x + (before.x + after.x) * scale, y: p.y + (before.y + after.y) * scale };
  });
}

/** Cumulative length at each vertex, plus the total. */
export function pathLengths(points: Point[]): { cumulative: number[]; total: number } {
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) {
    cumulative.push(cumulative[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  return { cumulative, total: cumulative[cumulative.length - 1] || 0 };
}

/**
 * Evenly spaced direction marks along a route: position plus heading in degrees.
 * Marks stay clear of both ends, where the start ring and arrowhead sit.
 */
export function marksAlong(points: Point[], spacing: number, clearance = 22): Array<Point & { angle: number }> {
  const { cumulative, total } = pathLengths(points);
  const marks: Array<Point & { angle: number }> = [];
  if (total < clearance * 2) return marks;
  let segment = 1;
  for (let at = Math.max(clearance, spacing / 2); at <= total - clearance; at += spacing) {
    while (segment < points.length - 1 && cumulative[segment] < at) segment++;
    const a = points[segment - 1];
    const b = points[segment];
    const len = cumulative[segment] - cumulative[segment - 1] || 1;
    const t = (at - cumulative[segment - 1]) / len;
    marks.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI });
  }
  return marks;
}

/** Fraction along the path of the vertex nearest `target` (where a hop's packet rests). */
export function fractionNearest(points: Point[], target: Point): number {
  const { cumulative, total } = pathLengths(points);
  if (!total) return 0;
  let best = 0;
  let bestDistance = Infinity;
  points.forEach((p, i) => {
    const d = Math.hypot(p.x - target.x, p.y - target.y);
    if (d < bestDistance) { bestDistance = d; best = i; }
  });
  return cumulative[best] / total;
}

/**
 * Where a flow's label rides: centred ON its own line, on the first horizontal
 * leg long enough to hold it (then any long-enough leg), so it covers the route
 * rather than resource names beside it. Falls back to the source point.
 */
export function labelAnchor(points: Point[], width: number): Point {
  const legs = points.slice(1).map((p, i) => ({ a: points[i], b: p, len: Math.hypot(p.x - points[i].x, p.y - points[i].y) }));
  const fits = (leg: { len: number }) => leg.len >= width + 24;
  const leg = legs.find((l) => fits(l) && Math.abs(l.a.y - l.b.y) < 0.5) ?? legs.find(fits);
  return leg ? { x: (leg.a.x + leg.b.x) / 2, y: (leg.a.y + leg.b.y) / 2 } : points[0] ?? { x: 0, y: 0 };
}

/**
 * Stack hop badges that land on the same resource across ALL flows, so the
 * second flow's "2" sits beside the first flow's "5" instead of under it.
 * Returns one horizontal slot index per badge, in input order.
 */
export function badgeSlots(badges: Array<{ node: string }>): number[] {
  const used = new Map<string, number>();
  return badges.map(({ node }) => {
    const slot = used.get(node) ?? 0;
    used.set(node, slot + 1);
    return slot;
  });
}
