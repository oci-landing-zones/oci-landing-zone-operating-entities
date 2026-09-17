import type { DiagramNode } from '../model/types';

export interface FlowPoint { x: number; y: number }

export interface FlowRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  node: DiagramNode;
}

const CLEARANCE = 10;
const BEND_COST = 24;
const EPS = 0.001;

/** Absolute rectangles derived from the same parent-relative model used by both renderers. */
export function absoluteNodeRects(nodes: DiagramNode[]): Map<string, FlowRect> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const cache = new Map<string, FlowRect>();

  const resolve = (id: string): FlowRect | null => {
    const cached = cache.get(id);
    if (cached) return cached;
    const node = byId.get(id);
    if (!node) return null;
    let x = node.x;
    let y = node.y;
    let parentId = node.parentId;
    const seen = new Set<string>([id]);
    while (parentId) {
      if (seen.has(parentId)) break;
      seen.add(parentId);
      const parent = byId.get(parentId);
      if (!parent) break;
      x += parent.x;
      y += parent.y;
      parentId = parent.parentId;
    }
    const rect = { id, x, y, width: node.width, height: node.height, node };
    cache.set(id, rect);
    return rect;
  };

  nodes.forEach((node) => resolve(node.id));
  return cache;
}

/**
 * The visible resource anchor, rather than the centre of its containing box.
 * Gateway and subnet nodes reserve label space, so their icon is intentionally
 * above the geometric centre of the model rectangle.
 */
export function flowAnchorPoint(rect: FlowRect): FlowPoint {
  const { node } = rect;
  if (node.kind === 'gateway') return { x: rect.x + rect.width / 2, y: rect.y + Math.min(18, rect.height / 2) };
  if (node.kind === 'subnet' && node.endpointName) return { x: rect.x + rect.width / 2, y: rect.y + Math.min(70, rect.height / 2 + 15) };
  if (node.kind === 'subnet' && node.icon) return { x: rect.x + rect.width / 2, y: rect.y + Math.min(61, rect.height / 2) };
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

const obstacleKind = (node: DiagramNode) =>
  node.kind === 'subnet' || node.kind === 'gateway' || node.kind === 'attachment' ||
  node.kind === 'drg' || node.kind === 'routetable' || node.kind === 'project';

interface Obstacle { id: string; left: number; right: number; top: number; bottom: number }

function expandedObstacle(rect: FlowRect): Obstacle {
  return {
    id: rect.id,
    left: rect.x - CLEARANCE,
    right: rect.x + rect.width + CLEARANCE,
    top: rect.y - CLEARANCE,
    bottom: rect.y + rect.height + CLEARANCE,
  };
}

function inside(point: FlowPoint, obstacle: Obstacle): boolean {
  return point.x > obstacle.left + EPS && point.x < obstacle.right - EPS &&
    point.y > obstacle.top + EPS && point.y < obstacle.bottom - EPS;
}

function clearSegment(a: FlowPoint, b: FlowPoint, obstacles: Obstacle[]): boolean {
  if (Math.abs(a.x - b.x) > EPS && Math.abs(a.y - b.y) > EPS) return false;
  if (Math.abs(a.y - b.y) <= EPS) {
    const left = Math.min(a.x, b.x);
    const right = Math.max(a.x, b.x);
    return obstacles.every((obstacle) =>
      !(a.y > obstacle.top + EPS && a.y < obstacle.bottom - EPS &&
        right > obstacle.left + EPS && left < obstacle.right - EPS));
  }
  const top = Math.min(a.y, b.y);
  const bottom = Math.max(a.y, b.y);
  return obstacles.every((obstacle) =>
    !(a.x > obstacle.left + EPS && a.x < obstacle.right - EPS &&
      bottom > obstacle.top + EPS && top < obstacle.bottom - EPS));
}

const pointKey = (point: FlowPoint) => `${point.x}:${point.y}`;

function compact(points: FlowPoint[]): FlowPoint[] {
  const deduped = points.filter((point, index) => index === 0 || pointKey(point) !== pointKey(points[index - 1]));
  return deduped.filter((point, index) => {
    if (index === 0 || index === deduped.length - 1) return true;
    const before = deduped[index - 1];
    const after = deduped[index + 1];
    const betweenVertical = before.x === point.x && point.x === after.x &&
      (point.y - before.y) * (after.y - point.y) >= 0;
    const betweenHorizontal = before.y === point.y && point.y === after.y &&
      (point.x - before.x) * (after.x - point.x) >= 0;
    // A collinear U-turn is a real visit to a resource, not a redundant point.
    return !(betweenVertical || betweenHorizontal);
  });
}

/** Route one resource-to-resource leg over an orthogonal visibility grid. */
function routePair(start: FlowPoint, end: FlowPoint, obstacles: Obstacle[], preferredX?: number): FlowPoint[] {
  const xs = new Set<number>([start.x, end.x]);
  const ys = new Set<number>([start.y, end.y]);
  if (preferredX != null) xs.add(preferredX);
  obstacles.forEach((obstacle) => {
    xs.add(obstacle.left);
    xs.add(obstacle.right);
    ys.add(obstacle.top);
    ys.add(obstacle.bottom);
  });

  const points: FlowPoint[] = [];
  const indexByKey = new Map<string, number>();
  for (const x of [...xs].sort((a, b) => a - b)) {
    for (const y of [...ys].sort((a, b) => a - b)) {
      const point = { x, y };
      if (pointKey(point) !== pointKey(start) && pointKey(point) !== pointKey(end) && obstacles.some((obstacle) => inside(point, obstacle))) continue;
      indexByKey.set(pointKey(point), points.length);
      points.push(point);
    }
  }

  const startIndex = indexByKey.get(pointKey(start));
  const endIndex = indexByKey.get(pointKey(end));
  if (startIndex == null || endIndex == null) return [start, { x: start.x, y: end.y }, end];

  const rows = new Map<number, number[]>();
  const cols = new Map<number, number[]>();
  points.forEach((point, index) => {
    rows.set(point.y, [...(rows.get(point.y) ?? []), index]);
    cols.set(point.x, [...(cols.get(point.x) ?? []), index]);
  });
  const neighbours = new Map<number, { to: number; dir: 'h' | 'v'; cost: number }[]>();
  const connect = (a: number, b: number, dir: 'h' | 'v') => {
    if (!clearSegment(points[a], points[b], obstacles)) return;
    const cost = Math.abs(points[a].x - points[b].x) + Math.abs(points[a].y - points[b].y);
    neighbours.set(a, [...(neighbours.get(a) ?? []), { to: b, dir, cost }]);
    neighbours.set(b, [...(neighbours.get(b) ?? []), { to: a, dir, cost }]);
  };
  rows.forEach((indices) => {
    indices.sort((a, b) => points[a].x - points[b].x);
    for (let i = 1; i < indices.length; i++) connect(indices[i - 1], indices[i], 'h');
  });
  cols.forEach((indices) => {
    indices.sort((a, b) => points[a].y - points[b].y);
    for (let i = 1; i < indices.length; i++) connect(indices[i - 1], indices[i], 'v');
  });

  type Dir = 'h' | 'v' | 's';
  interface State { point: number; dir: Dir; cost: number; previous?: string }
  const states = new Map<string, State>();
  const pending: State[] = [{ point: startIndex, dir: 's', cost: 0 }];
  states.set(`${startIndex}|s`, pending[0]);
  let final: State | undefined;
  while (pending.length > 0) {
    pending.sort((a, b) => a.cost - b.cost);
    const current = pending.shift()!;
    if (states.get(`${current.point}|${current.dir}`)?.cost !== current.cost) continue;
    if (current.point === endIndex) { final = current; break; }
    for (const edge of neighbours.get(current.point) ?? []) {
      const bend = current.dir !== 's' && current.dir !== edge.dir ? BEND_COST : 0;
      const corridorBias = preferredX != null && edge.dir === 'v' && points[current.point].x === preferredX ? -1 : 0;
      const cost = current.cost + edge.cost + bend + corridorBias;
      const key = `${edge.to}|${edge.dir}`;
      if (cost >= (states.get(key)?.cost ?? Infinity)) continue;
      const next = { point: edge.to, dir: edge.dir, cost, previous: `${current.point}|${current.dir}` };
      states.set(key, next);
      pending.push(next);
    }
  }

  if (!final) {
    const elbow = preferredX != null
      ? [start, { x: preferredX, y: start.y }, { x: preferredX, y: end.y }, end]
      : [start, { x: start.x, y: end.y }, end];
    return compact(elbow);
  }
  const path: FlowPoint[] = [];
  let cursor: State | undefined = final;
  while (cursor) {
    path.push(points[cursor.point]);
    cursor = cursor.previous ? states.get(cursor.previous) : undefined;
  }
  return compact(path.reverse());
}

/**
 * Route an ordered logical packet path through every actual resource while
 * keeping every leg clear of unrelated leaf resources. This single polyline is
 * consumed unchanged by the live renderer and the Draw.io exporter.
 */
export function routeFlowGeometry(nodes: DiagramNode[], waypointIds: string[], preferredX?: number): FlowPoint[] {
  const rects = absoluteNodeRects(nodes);
  const resources = [...rects.values()].filter((rect) => obstacleKind(rect.node));
  const resolved = waypointIds.map((id) => rects.get(id)).filter((rect): rect is FlowRect => rect != null);
  if (resolved.length < 2) return [];

  const result: FlowPoint[] = [];
  for (let index = 1; index < resolved.length; index++) {
    const from = resolved[index - 1];
    const to = resolved[index];
    const obstacles = resources
      .filter((rect) => rect.id !== from.id && rect.id !== to.id)
      .map(expandedObstacle);
    const leg = routePair(flowAnchorPoint(from), flowAnchorPoint(to), obstacles, preferredX);
    result.push(...(result.length === 0 ? leg : leg.slice(1)));
  }
  return compact(result);
}
