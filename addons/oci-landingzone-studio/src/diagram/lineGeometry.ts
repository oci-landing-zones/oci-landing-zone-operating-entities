type Point = { x: number; y: number };
type Box = { id: string; x: number; y: number; width: number; height: number; clearance?: number };
type Segment = { a: Point; b: Point; id: string; physical: boolean };
const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

function enters(a: Point, b: Point, box: Box): boolean {
  let low = 0, high = 1;
  const padding = box.clearance ?? 4;
  for (const [start, delta, min, max] of [
    [a.x, b.x - a.x, box.x - padding, box.x + box.width + padding],
    [a.y, b.y - a.y, box.y - padding, box.y + box.height + padding],
  ]) {
    if (Math.abs(delta) < 1e-9) {
      if (start <= min || start >= max) return false;
    } else {
      const u = (min - start) / delta, v = (max - start) / delta;
      low = Math.max(low, Math.min(u, v)); high = Math.min(high, Math.max(u, v));
      if (high <= low + 1e-9) return false;
    }
  }
  return high > low + 1e-9;
}

function lineConflicts(a: Point, b: Point, occupied: Segment[], ports: Point[]): { crossings: number; sharedLength: number } {
  const found = new Set<string>();
  let sharedLength = 0;
  const x = b.x - a.x, y = b.y - a.y, length = distance(a, b);
  if (length < 1e-7) return { crossings: 0, sharedLength: 0 };
  for (const other of occupied) {
    const { a: c, b: d } = other, u = d.x - c.x, v = d.y - c.y;
    const cross = x * v - y * u;
    if (Math.abs(cross) < 1e-7) {
      if (Math.abs(x * (c.y - a.y) - y * (c.x - a.x)) > 1e-7 * length) continue;
      const at = (p: Point) => ((p.x - a.x) * x + (p.y - a.y) * y) / length;
      const overlap = Math.min(length, Math.max(at(c), at(d))) - Math.max(0, Math.min(at(c), at(d)));
      if (overlap > 1e-6) sharedLength += overlap;
      continue;
    }
    const t = ((c.x - a.x) * v - (c.y - a.y) * u) / cross;
    const s = ((c.x - a.x) * y - (c.y - a.y) * x) / cross;
    if (t < -1e-9 || t > 1 + 1e-9 || s < -1e-9 || s > 1 + 1e-9) continue;
    const point = { x: a.x + t * x, y: a.y + t * y };
    if (other.physical && ports.some((port) => distance(port, point) <= 8 + 1e-6
      && (distance(port, c) < 1e-6 || distance(port, d) < 1e-6))) continue;
    found.add(`${other.id}:${point.x.toFixed(6)}:${point.y.toFixed(6)}`);
  }
  return { crossings: found.size, sharedLength };
}


export { lineConflicts as tableLineConflicts, enters as tableLineEntersBox };
export type { Point, Box, Segment };
