/**
 * Path measurements and annotation placement shared by the live overlay and export.
 */

export interface Point { x: number; y: number }

/** `<scope>:<kind>` — the flow a trace id (`<scope>:<kind>[:<role>]#<idx>`) belongs to. */
export function flowGroup(traceId: string): string {
  return traceId.split('#')[0].split(':').slice(0, 2).join(':');
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
