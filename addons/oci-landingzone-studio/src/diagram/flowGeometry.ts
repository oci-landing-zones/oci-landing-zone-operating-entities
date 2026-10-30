import type { DiagramNode } from '../model/types';
import { drgCaptionBounds } from './layoutPolicy';
import { FASTCONNECT_LINE_Y } from './hybridTopology';

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
export const BEND_COST = 24;
const EPS = 0.001;

export function diagramBounds(nodes: DiagramNode[]) {
  const roots = nodes.filter((node) => !node.parentId);
  if (!roots.length) return { x: 0, y: 0, width: 0, height: 0 };
  const x = Math.min(...roots.map((node) => node.x));
  const y = Math.min(...roots.map((node) => node.y));
  return {
    x, y,
    width: Math.max(...roots.map((node) => node.x + node.width)) - x,
    height: Math.max(...roots.map((node) => node.y + node.height)) - y,
  };
}

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
  if (node.kind === 'fastconnect') return { x: rect.x + rect.width / 2, y: rect.y + FASTCONNECT_LINE_Y };
  if (node.kind === 'gateway') return { x: rect.x + rect.width / 2, y: rect.y + Math.min(18, rect.height / 2) };
  if (node.kind === 'subnet' && node.endpointName) return { x: rect.x + rect.width / 2, y: rect.y + Math.min(70, rect.height / 2 + 15) };
  if (node.kind === 'subnet' && node.icon) return { x: rect.x + rect.width / 2, y: rect.y + Math.min(61, rect.height / 2) };
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

const obstacleKind = (node: DiagramNode) =>
  node.kind === 'premises' || node.kind === 'vpn' || node.kind === 'vpntunnel' || node.kind === 'fastconnect' || node.kind === 'customerrouter' ||
  node.kind === 'subnet' || node.kind === 'gateway' || node.kind === 'attachment' ||
  node.kind === 'drg' || node.kind === 'routetable' || node.kind === 'project' ||
  node.kind === 'resourcegroup' || node.kind === 'vcn' || node.kind === 'compartment' || node.kind === 'rtdot';

interface Obstacle { id: string; left: number; right: number; top: number; bottom: number }

function expandedObstacle(rect: FlowRect, clearance = CLEARANCE): Obstacle {
  return {
    id: rect.id,
    left: rect.x - clearance,
    right: rect.x + rect.width + clearance,
    top: rect.y - clearance,
    bottom: rect.y + rect.height + clearance,
  };
}

function routingObstacles(rects: Map<string, FlowRect>, excluded: Set<string>, clearance = CLEARANCE): Obstacle[] {
  return [...rects.values()].flatMap((rect) => [
    ...(obstacleKind(rect.node) && !excluded.has(rect.id) ? [expandedObstacle(rect, clearance)] : []),
    ...(rect.node.kind === 'drg' && rect.node.label.trim()
      ? [expandedObstacle({ ...rect, ...drgCaptionBounds({ ...rect, label: rect.node.label }), id: `${rect.id}:caption` }, clearance)] : []),
  ]);
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

export interface RoutingSegment { start: FlowPoint; end: FlowPoint }
export interface RoutingBounds { left?: number; right?: number; top?: number; bottom?: number }
export interface RoutingDirections { start: FlowPoint; end: FlowPoint }

/** An endpoint may cross its own containers, including a hoisted route dot's actual owner. */
export function routingExclusions(rects: Map<string, FlowRect>, ids: string[]): Set<string> {
  const excluded = new Set<string>();
  const add = (id: string | undefined) => {
    while (id && !excluded.has(id)) {
      excluded.add(id);
      const node = rects.get(id)?.node;
      const owner = node?.rtDotPhysicalOwnerId ?? node?.rtDotOwnerId;
      if (owner) add(owner);
      id = node?.parentId;
    }
  };
  ids.forEach(add);
  const endpointOwners = new Set(ids.flatMap((id) => [id, rects.get(id)?.node.rtDotPhysicalOwnerId ?? rects.get(id)?.node.rtDotOwnerId].filter((value): value is string => Boolean(value))));
  for (const rect of rects.values()) {
    const owner = rect.node.rtDotPhysicalOwnerId ?? rect.node.rtDotOwnerId;
    if (owner && endpointOwners.has(owner)) excluded.add(rect.id);
  }
  return excluded;
}

function congestionCost(a: FlowPoint, b: FlowPoint, occupied: RoutingSegment[], start: FlowPoint, end: FlowPoint): number {
  let cost = 0;
  const contacts = new Set<string>();
  for (const { start: c, end: d } of occupied) {
    const horizontal = a.y === b.y, otherHorizontal = c.y === d.y;
    if (horizontal === otherHorizontal) {
      if (horizontal ? Math.abs(a.y - c.y) > EPS : Math.abs(a.x - c.x) > EPS) continue;
      const overlap = horizontal
        ? Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) - Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x))
        : Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) - Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y));
      if (overlap > EPS) cost += overlap * 3;
    } else {
      const h1 = horizontal ? a : c, h2 = horizontal ? b : d;
      const v1 = horizontal ? c : a, v2 = horizontal ? d : b;
      const contact = { x: v1.x, y: h1.y };
      if (contact.x >= Math.min(h1.x, h2.x) - EPS && contact.x <= Math.max(h1.x, h2.x) + EPS &&
        contact.y >= Math.min(v1.y, v2.y) - EPS && contact.y <= Math.max(v1.y, v2.y) + EPS &&
        (Math.abs(contact.x - a.x) > EPS || Math.abs(contact.y - a.y) > EPS) &&
        pointKey(contact) !== pointKey(start) && pointKey(contact) !== pointKey(end)) contacts.add(pointKey(contact));
    }
  }
  return cost + contacts.size * 4000;
}

interface SearchState { x: number; y: number; dir: number; cost: number; score: number; order: number; previous?: SearchState }

class SearchQueue {
  private items: SearchState[] = [];
  private before(a: SearchState, b: SearchState) { return a.score < b.score || a.score === b.score && a.order < b.order; }
  push(value: SearchState) {
    const a = this.items;
    a.push(value);
    let i = a.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.before(value, a[parent])) break;
      a[i] = a[parent]; i = parent;
    }
    a[i] = value;
  }
  pop(): SearchState | undefined {
    const a = this.items, first = a[0], last = a.pop();
    if (a.length && last) {
      let i = 0;
      while (i * 2 + 1 < a.length) {
        let child = i * 2 + 1;
        if (child + 1 < a.length && this.before(a[child + 1], a[child])) child++;
        if (!this.before(a[child], last)) break;
        a[i] = a[child]; i = child;
      }
      a[i] = last;
    }
    return first;
  }
}

/** Route lazily over obstacle boundaries; Manhattan A* avoids building a dense visibility graph. */
function routePair(start: FlowPoint, end: FlowPoint, obstacles: Obstacle[], preferredX?: number,
  occupied: RoutingSegment[] = [], allowBlocked = false, fallbackObstacles?: Obstacle[], bounds?: RoutingBounds, directions?: RoutingDirections): FlowPoint[] {
  if (![start.x, start.y, end.x, end.y, ...(preferredX == null ? [] : [preferredX])].every(Number.isFinite)) {
    throw new Error('Invalid diagram connection geometry');
  }
  if (directions && ![directions.start.x, directions.start.y, directions.end.x, directions.end.y].every(Number.isFinite)) {
    throw new Error('Invalid diagram terminal directions');
  }
  if (bounds && (!Object.values(bounds).every((value) => value === undefined || Number.isFinite(value)) ||
    (bounds.left ?? -Infinity) > (bounds.right ?? Infinity) || (bounds.top ?? -Infinity) > (bounds.bottom ?? Infinity) ||
    [start, end].some((point) => point.x < (bounds.left ?? -Infinity) || point.x > (bounds.right ?? Infinity) ||
      point.y < (bounds.top ?? -Infinity) || point.y > (bounds.bottom ?? Infinity)))) {
    throw new Error('Invalid diagram routing bounds');
  }
  if (!allowBlocked && obstacles.some((obstacle) => inside(start, obstacle) || inside(end, obstacle))) {
    return routePair(start, end, fallbackObstacles ?? obstacles, preferredX, occupied, !fallbackObstacles, undefined, bounds, directions);
  }
  const xs = new Set<number>([start.x, end.x]), ys = new Set<number>([start.y, end.y]);
  if (directions) {
    for (const point of [start, end]) {
      xs.add(point.x - 12); xs.add(point.x + 12); ys.add(point.y - 12); ys.add(point.y + 12);
    }
  }
  if (preferredX != null) xs.add(preferredX);
  for (const obstacle of obstacles) {
    xs.add(obstacle.left); xs.add(obstacle.right); ys.add(obstacle.top); ys.add(obstacle.bottom);
  }
  for (const { start: a, end: b } of occupied) {
    if (a.x === b.x) {
      xs.add(a.x - 8); xs.add(a.x + 8); ys.add(Math.min(a.y, b.y) - 8); ys.add(Math.max(a.y, b.y) + 8);
    } else {
      ys.add(a.y - 8); ys.add(a.y + 8); xs.add(Math.min(a.x, b.x) - 8); xs.add(Math.max(a.x, b.x) + 8);
    }
  }
  if (bounds?.left != null) xs.add(bounds.left);
  if (bounds?.right != null) xs.add(bounds.right);
  if (bounds?.top != null) ys.add(bounds.top);
  if (bounds?.bottom != null) ys.add(bounds.bottom);
  const xx = [...xs].filter((x) => x >= (bounds?.left ?? -Infinity) && x <= (bounds?.right ?? Infinity)).sort((a, b) => a - b);
  const yy = [...ys].filter((y) => y >= (bounds?.top ?? -Infinity) && y <= (bounds?.bottom ?? Infinity)).sort((a, b) => a - b);
  const key = (x: number, y: number, dir: number) => (x * yy.length + y) * 3 + dir;
  const heuristic = (x: number, y: number) => Math.abs(xx[x] - end.x) + Math.abs(yy[y] - end.y);
  const queue = new SearchQueue(), costs = new Map<number, number>();
  const segments = new Map<number, { clear: boolean; intrusion: number; congestion: number }>();
  let order = 0;
  const initial = { x: xx.indexOf(start.x), y: yy.indexOf(start.y), dir: 0, cost: 0, score: 0, order: order++ };
  initial.score = heuristic(initial.x, initial.y);
  queue.push(initial); costs.set(key(initial.x, initial.y, 0), 0);
  let current: SearchState | undefined;
  while ((current = queue.pop())) {
    if (costs.get(key(current.x, current.y, current.dir)) !== current.cost) continue;
    const a = { x: xx[current.x], y: yy[current.y] };
    if (a.x === end.x && a.y === end.y) {
      const path: FlowPoint[] = [];
      for (let cursor: SearchState | undefined = current; cursor; cursor = cursor.previous) path.push({ x: xx[cursor.x], y: yy[cursor.y] });
      return compact(path.reverse());
    }
    for (const [dx, dy, dir] of [[-1, 0, 1], [1, 0, 1], [0, -1, 2], [0, 1, 2]]) {
      const x = current.x + dx, y = current.y + dy;
      if (x < 0 || x >= xx.length || y < 0 || y >= yy.length) continue;
      const b = { x: xx[x], y: yy[y] };
      if (directions && ((!current.previous && (b.x - a.x) * directions.start.x + (b.y - a.y) * directions.start.y < -EPS) ||
        b.x === end.x && b.y === end.y && (b.x - a.x) * directions.end.x + (b.y - a.y) * directions.end.y < -EPS)) continue;
      // Edge checks are fixed for this search; arrival direction changes only the bend cost.
      const segmentKey = (current.x * yy.length + current.y) * 4 + (dir === 1 ? dx < 0 ? 0 : 1 : dy < 0 ? 2 : 3);
      let segment = segments.get(segmentKey);
      if (!segment) {
        const clear = clearSegment(a, b, obstacles);
        let intrusion = 0;
        if (!clear && allowBlocked) for (const obstacle of obstacles) {
          const length = dir === 1 && a.y > obstacle.top + EPS && a.y < obstacle.bottom - EPS
            ? Math.min(Math.max(a.x, b.x), obstacle.right) - Math.max(Math.min(a.x, b.x), obstacle.left)
            : dir === 2 && a.x > obstacle.left + EPS && a.x < obstacle.right - EPS
              ? Math.min(Math.max(a.y, b.y), obstacle.bottom) - Math.max(Math.min(a.y, b.y), obstacle.top) : 0;
          intrusion += Math.max(0, length) * 1000000;
        }
        segment = { clear, intrusion, congestion: clear || allowBlocked ? congestionCost(a, b, occupied, start, end) : 0 };
        segments.set(segmentKey, segment);
      }
      if (!segment.clear && !allowBlocked) continue;
      const bend = current.dir !== 0 && current.dir !== dir ? BEND_COST : 0;
      const preference = preferredX != null && dir === 2 ? Math.min(8, Math.abs(a.x - preferredX) * 0.01) : 0;
      const cost = current.cost + Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + bend + preference + segment.congestion + segment.intrusion;
      const nextKey = key(x, y, dir);
      if (cost >= (costs.get(nextKey) ?? Infinity)) continue;
      costs.set(nextKey, cost);
      queue.push({ x, y, dir, cost, score: cost + heuristic(x, y), previous: current, order: order++ });
    }
  }
  if (!allowBlocked && !fallbackObstacles && directions) return routePair(start, end, obstacles, preferredX, occupied, false, undefined, bounds);
  if (!allowBlocked) return routePair(start, end, fallbackObstacles ?? obstacles, preferredX, occupied, !fallbackObstacles, undefined, bounds, directions);
  if (directions) return routePair(start, end, obstacles, preferredX, occupied, true, undefined, bounds);
  throw new Error('Invalid diagram connection geometry');
}

export function routeOrthogonalPoints(rects: Map<string, FlowRect>, start: FlowPoint, end: FlowPoint,
  excludedIds: string[], preferredX?: number, occupied: RoutingSegment[] = [], endpointBodies: string[] = [], bounds?: RoutingBounds, directions?: RoutingDirections): FlowPoint[] {
  const excluded = routingExclusions(rects, excludedIds);
  endpointBodies.forEach((id) => excluded.delete(id));
  return routePair(start, end, routingObstacles(rects, excluded), preferredX, occupied, false,
    routingObstacles(rects, excluded, 0), bounds, directions);
}

export function clearRoutingSegment(rects: Map<string, FlowRect>, start: FlowPoint, end: FlowPoint, excludedIds: string[], clearance = CLEARANCE, endpointBodies: string[] = []): boolean {
  const excluded = routingExclusions(rects, excludedIds);
  endpointBodies.forEach((id) => excluded.delete(id));
  return clearSegment(start, end, routingObstacles(rects, excluded, clearance));
}

/** Route a local resource leg to a canonical connection port without moving that port. */
export function routeBetweenPoints(nodes: DiagramNode[], start: FlowPoint, end: FlowPoint, excludedIds: string[], preferredX?: number,
  ports?: { startOwner?: string; endOwner?: string }): FlowPoint[] {
  const rects = absoluteNodeRects(nodes);
  const excluded = routingExclusions(rects, excludedIds);
  const outside = (point: FlowPoint, ownerId?: string): FlowPoint => {
    const owner = ownerId ? rects.get(ownerId) : undefined;
    if (!owner) return point;
    const centre = flowAnchorPoint(owner);
    const dx = point.x - centre.x, dy = point.y - centre.y;
    if (dx === 0 && dy === 0) return point;
    excluded.delete(owner.id);
    return Math.abs(dx) >= Math.abs(dy)
      ? { x: dx < 0 ? owner.x - CLEARANCE : owner.x + owner.width + CLEARANCE, y: point.y }
      : { x: point.x, y: dy < 0 ? owner.y - CLEARANCE : owner.y + owner.height + CLEARANCE };
  };
  const from = outside(start, ports?.startOwner), to = outside(end, ports?.endOwner);
  const obstacles = routingObstacles(rects, excluded);
  return compact([start, ...routePair(from, to, obstacles, preferredX), end]);
}

/** Reuse local joins only while this graph's node geometry is fixed. */
export function createLocalFlowRouter(nodes: DiagramNode[]) {
  const paths = new Map<string, FlowPoint[]>();
  return (start: FlowPoint, end: FlowPoint, excludedIds: string[], preferredX?: number,
    ports?: { startOwner?: string; endOwner?: string }): FlowPoint[] => {
    const coordinates = [start.x, start.y, end.x, end.y, preferredX].map((value) => Object.is(value, -0) ? '-0' : String(value));
    const key = JSON.stringify([coordinates, excludedIds, ports?.startOwner, ports?.endOwner]);
    const cached = paths.get(key);
    if (cached) return cached.map((point) => ({ ...point }));
    const path = routeBetweenPoints(nodes, start, end, excludedIds, preferredX, ports);
    paths.set(key, path.map((point) => ({ ...point })));
    return path;
  };
}

/**
 * Route an ordered logical packet path through every actual resource while
 * keeping every leg clear of unrelated leaf resources. This single polyline is
 * consumed unchanged by the live renderer and the Draw.io exporter.
 */
export function routeFlowGeometry(nodes: DiagramNode[], waypointIds: string[], preferredX?: number): FlowPoint[] {
  const rects = absoluteNodeRects(nodes);
  const resolved = waypointIds.map((id) => rects.get(id)).filter((rect): rect is FlowRect => rect != null);
  if (resolved.length < 2) return [];

  const result: FlowPoint[] = [];
  for (let index = 1; index < resolved.length; index++) {
    const from = resolved[index - 1];
    const to = resolved[index];
    const excluded = routingExclusions(rects, [from.id, to.id]);
    const obstacles = routingObstacles(rects, excluded);
    const leg = routePair(flowAnchorPoint(from), flowAnchorPoint(to), obstacles, preferredX);
    result.push(...(result.length === 0 ? leg : leg.slice(1)));
  }
  return compact(result);
}
