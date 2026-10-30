import type { DiagramEdge, DiagramNode } from '../model/types';
import { absoluteNodeRects, clearRoutingSegment, createLocalFlowRouter, flowAnchorPoint, routeOrthogonalPoints, type FlowRect, type RoutingSegment } from './flowGeometry';
import { type Point } from './flowOverlayGeometry';
import { drgCaptionLayout } from './layoutPolicy';

export function polylinePath(points: Point[]): string {
  return points.length < 2 ? '' : points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
}

export function flowDisplayPoints(edge: DiagramEdge): Point[] {
  return edge.points ?? [];
}

type Side = NonNullable<DiagramEdge['sourceSide']>;

function borderPoint(rect: FlowRect, other: FlowRect, side?: Side, port = 0.5): Point & { side: Side } {
  const { x, y, width: w, height: h } = rect;
  if (side === 'left') return { x, y: y + h * port, side };
  if (side === 'right') return { x: x + w, y: y + h * port, side };
  if (side === 'top') return { x: x + w * port, y, side };
  if (side === 'bottom') return { x: x + w * port, y: y + h, side };
  const dx = other.x + other.width / 2 - (x + w / 2);
  const dy = other.y + other.height / 2 - (y + h / 2);
  const scale = 1 / (Math.max(Math.abs(dx) / (w / 2), Math.abs(dy) / (h / 2)) || 1);
  const point = { x: x + w / 2 + dx * scale, y: y + h / 2 + dy * scale };
  const inferred = point.x <= x + 1 ? 'left' : point.x >= x + w - 1 ? 'right' : point.y <= y + 1 ? 'top' : 'bottom';
  return { ...point, side: inferred };
}

function outward(point: Point, side: Side, length = 12): Point {
  return { x: point.x + (side === 'left' ? -length : side === 'right' ? length : 0),
    y: point.y + (side === 'top' ? -length : side === 'bottom' ? length : 0) };
}

function routeStructural(edge: DiagramEdge, rects: Map<string, FlowRect>, occupied: RoutingSegment[], automaticTarget = false): DiagramEdge {
  const source = rects.get(edge.source), target = rects.get(edge.target);
  if (!source || !target) throw new Error(`Unknown diagram connection endpoint: ${edge.id}`);
  if ([edge.sourcePort, edge.targetPort, edge.centerX, edge.channel].some((value) => value != null && !Number.isFinite(value))) throw new Error(`Invalid diagram connection geometry: ${edge.id}`);
  if ([source, target].some((rect) => ![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0)) throw new Error(`Invalid diagram connection endpoint: ${edge.id}`);
  const excluded = [source.id, target.id];
  const port = (rect: FlowRect, other: FlowRect, side: Side | undefined, value: number | undefined, automatic = false) => {
    const initial = borderPoint(rect, other, side, value);
    const clear = (p: Point & { side: Side }) => clearRoutingSegment(rects, p, outward(p, p.side), excluded);
    if (clear(initial)) return initial;
    if (value != null && !automatic || rect.node.kind === 'rtdot') return initial;
    // Move only an automatic port, retaining its side and every actual endpoint anchor.
    const length = initial.side === 'left' || initial.side === 'right' ? rect.height : rect.width;
    const preferred = initial.side === 'left' || initial.side === 'right' ? (initial.y - rect.y) / rect.height : (initial.x - rect.x) / rect.width;
    const candidates = new Set<number>([0.1, 0.25, 0.5, 0.75, 0.9]);
    for (const obstacle of rects.values()) {
      const low = initial.side === 'left' || initial.side === 'right' ? obstacle.y - rect.y : obstacle.x - rect.x;
      const size = initial.side === 'left' || initial.side === 'right' ? obstacle.height : obstacle.width;
      candidates.add((low - 12) / length); candidates.add((low + size + 12) / length);
    }
    for (const candidate of [...candidates].filter((v) => v > 0.03 && v < 0.97).sort((a, b) => Math.abs(a - preferred) - Math.abs(b - preferred) || a - b)) {
      const point = borderPoint(rect, other, initial.side, candidate);
      if (clear(point)) return point;
    }
    if (!side) {
      const alternatives: Side[] = ['left', 'right', 'top', 'bottom'];
      const centre = { x: other.x + other.width / 2, y: other.y + other.height / 2 };
      alternatives.sort((a, b) => {
        const aa = borderPoint(rect, other, a), bb = borderPoint(rect, other, b);
        return Math.abs(aa.x - centre.x) + Math.abs(aa.y - centre.y) - Math.abs(bb.x - centre.x) - Math.abs(bb.y - centre.y);
      });
      for (const alternative of alternatives) {
        const point = borderPoint(rect, other, alternative);
        if (clear(point)) return point;
      }
    }
    return initial;
  };
  const s = port(source, target, edge.sourceSide, edge.sourcePort), t = port(target, source, edge.targetSide, edge.targetPort, automaticTarget);
  const facingGap = s.side === 'bottom' && t.side === 'top' ? t.y - s.y
    : s.side === 'top' && t.side === 'bottom' ? s.y - t.y
      : s.side === 'right' && t.side === 'left' ? t.x - s.x
        : s.side === 'left' && t.side === 'right' ? s.x - t.x : Infinity;
  const budget = facingGap >= 0 ? Math.min(12, facingGap / 2) : 12;
  const stub = (point: Point & { side: Side }) => {
    for (const length of [...new Set([budget, Math.min(8, budget), Math.min(4, budget), Math.min(1, budget)])]) {
      const candidate = outward(point, point.side, length);
      if (clearRoutingSegment(rects, point, candidate, excluded, 0)) return candidate;
    }
    return { x: point.x, y: point.y };
  };
  const start = stub(s), end = stub(t);
  const preferredX = edge.centerX != null ? edge.centerX + (edge.channel ?? 0)
    : edge.channel != null ? (s.x + t.x) / 2 + edge.channel : undefined;
  const sourceDirection = outward(s, s.side, 1), targetDirection = outward(t, t.side, 1);
  const middle = routeOrthogonalPoints(rects, start, end, excluded, preferredX, occupied, [source.id, target.id], undefined, {
    start: { x: sourceDirection.x - s.x, y: sourceDirection.y - s.y },
    end: { x: t.x - targetDirection.x, y: t.y - targetDirection.y },
  });
  const points: Point[] = [{ x: s.x, y: s.y }, ...middle, { x: t.x, y: t.y }]
    .filter((point, index, path) => index === 0 || point.x !== path[index - 1].x || point.y !== path[index - 1].y);
  const fraction = (rect: FlowRect, point: Point & { side: Side }) => point.side === 'left' || point.side === 'right'
    ? (point.y - rect.y) / rect.height : (point.x - rect.x) / rect.width;
  return { ...edge, sourceSide: s.side, targetSide: t.side, sourcePort: fraction(source, s), targetPort: fraction(target, t), points };
}

/** Stored structural paths are the canonical paths for canvas, packet animation and export. */
export function structuralEdgePoints(edge: DiagramEdge, rects: Map<string, FlowRect>): Point[] {
  return edge.points ?? routeStructural(edge, rects, []).points!;
}

function connectionConflict(paths: Point[][], others: Point[][]): number {
  let score = 0;
  for (const other of others) {
    const contacts = new Set<string>();
    for (const points of paths) for (let i = 1; i < points.length; i++) for (let j = 1; j < other.length; j++) {
      const a = points[i - 1], b = points[i], c = other[j - 1], d = other[j];
      const horizontal = a.y === b.y, otherHorizontal = c.y === d.y;
      if (horizontal === otherHorizontal) {
        if (horizontal ? a.y !== c.y : a.x !== c.x) continue;
        const overlap = horizontal
          ? Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) - Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x))
          : Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) - Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y));
        score += Math.max(0, overlap) * 3;
      } else {
        const h1 = horizontal ? a : c, h2 = horizontal ? b : d, v1 = horizontal ? c : a, v2 = horizontal ? d : b;
        const point = { x: v1.x, y: h1.y };
        if (point.x < Math.min(h1.x, h2.x) || point.x > Math.max(h1.x, h2.x) ||
          point.y < Math.min(v1.y, v2.y) || point.y > Math.max(v1.y, v2.y)) continue;
        const endpoint = (path: Point[]) => [path[0], path.at(-1)!].some((p) => p.x === point.x && p.y === point.y);
        if (!(endpoint(points) && endpoint(other))) contacts.add(`${point.x}:${point.y}`);
      }
    }
    score += contacts.size * 4000;
  }
  return score;
}

function physicalFanRoutes(rects: Map<string, FlowRect>, edges: DiagramEdge[]): Map<string, DiagramEdge> {
  const groups = new Map<string, { edge: DiagramEdge; source: FlowRect; target: FlowRect; s: Point; t: Point; side: Side; reverse: boolean }[]>();
  for (const edge of edges) {
    const a = rects.get(edge.source), b = rects.get(edge.target);
    if (!a || !b) continue;
    const reverse = a.node.kind === 'drg' && ['attachment', 'vpntunnel', 'fastconnect'].includes(b.node.kind)
      || ['vpn', 'customerrouter'].includes(a.node.kind);
    const source = reverse ? b : a, target = reverse ? a : b;
    const drgConnection = ['attachment', 'vpntunnel', 'fastconnect'].includes(source.node.kind) && target.node.kind === 'drg';
    const customerConnection = source.node.kind === 'vpntunnel' && target.node.kind === 'vpn'
      || source.node.kind === 'fastconnect' && target.node.kind === 'customerrouter';
    const reservedChannel = source.node.kind === 'vcn' && target.node.kind === 'attachment' && edge.centerX != null;
    if (!drgConnection && !customerConnection && !reservedChannel) continue;
    const s = borderPoint(source, target, reverse ? edge.targetSide : edge.sourceSide, reverse ? edge.targetPort : edge.sourcePort);
    const t = borderPoint(target, source, reverse ? edge.sourceSide : edge.targetSide, reverse ? edge.sourcePort : edge.targetPort);
    if (!((s.side === 'left' && t.side === 'right') || (s.side === 'right' && t.side === 'left'))) continue;
    const key = reservedChannel ? `channel:${edge.centerX}:${t.side}:${t.x}` : `${target.id}:${t.side}`;
    groups.set(key, [...(groups.get(key) ?? []), { edge, source, target, s, t, side: t.side, reverse }]);
  }
  const result = new Map<string, DiagramEdge>();
  for (const fan of groups.values()) {
    if (fan.length < 2) continue;
    // External connections leave the near-DRG space for short table-annotation branches.
    const hybridDrg = fan[0].target.node.kind === 'drg' && fan.some(({ source }) => ['vpntunnel', 'fastconnect'].includes(source.node.kind));
    const channels = fan[0].source.node.kind === 'vcn'
      ? [...new Set(fan.map(({ edge }) => edge.centerX! + (edge.channel ?? 0)))].sort((a, b) => fan[0].side === 'right' ? a - b : b - a)
      : undefined;
    const lanes: { low: number; high: number; index: number }[] = [];
    fan.sort((a, b) => {
      const aTop = a.s.y <= a.t.y, bTop = b.s.y <= b.t.y;
      return aTop !== bTop ? Number(bTop) - Number(aTop)
        : (aTop ? a.s.y - b.s.y : b.s.y - a.s.y) || a.edge.id.localeCompare(b.edge.id);
    });
    for (const { edge, source, target, s, t, side, reverse } of fan) {
      const low = Math.min(s.y, t.y), high = Math.max(s.y, t.y);
      // Blocked inner rails must not let later branches cross an already nested outer rail.
      let lane = Math.max(0, ...lanes.filter((used) => low <= used.high + 8 && high >= used.low - 8).map((used) => used.index + 1));
      const direction = side === 'right' ? 1 : -1;
      const premises = ['vpn', 'customerrouter'].includes(target.node.kind) ? rects.get(target.node.parentId ?? '') : undefined;
      const offset = premises
        ? (direction === 1 ? premises.x + premises.width - t.x : t.x - premises.x) + 12
        : Math.max(drgCaptionLayout(target.node.label, target.width).overhang + 12, hybridDrg ? 128 : 0);
      let points: Point[] | undefined;
      for (; channels ? lane < channels.length : offset + lane * 8 <= direction * (s.x - t.x) - 12; lane++) {
        const x = channels ? channels[lane] : t.x + direction * (offset + lane * 8);
        const candidate = [s, { x, y: s.y }, { x, y: t.y }, t].map(({ x, y }) => ({ x, y }))
          .filter((point, index, path) => index === 0 || point.x !== path[index - 1].x || point.y !== path[index - 1].y);
        if (candidate.slice(1).every((point, i) => clearRoutingSegment(rects, candidate[i], point,
          [source.id, target.id], 0, [source.id, target.id]))) { points = candidate; break; }
      }
      if (!points) continue;
      lanes.push({ low, high, index: lane });
      result.set(edge.id, { ...edge, points: reverse ? points.reverse() : points });
    }
  }
  return result;
}

function association(edge: DiagramEdge, rects: Map<string, FlowRect>): boolean {
  return rects.get(edge.source)?.node.kind === 'rtdot' && rects.get(edge.target)?.node.kind === 'routetable';
}

/** Draw the exact per-table segment union once while retaining complete logical association paths. */
export function associationDisplaySegments(nodes: DiagramNode[], edges: DiagramEdge[]): Map<string, Point[][]> {
  return associationSegments(absoluteNodeRects(nodes), edges);
}

function associationSegments(rects: Map<string, FlowRect>, edges: DiagramEdge[]): Map<string, Point[][]> {
  const result = new Map<string, Point[][]>();
  const covered = new Map<string, Map<string, [number, number][]>>();
  for (const edge of [...edges].filter((edge) => association(edge, rects)).sort((a, b) => a.id.localeCompare(b.id))) {
    const axes = covered.get(edge.target) ?? new Map<string, [number, number][]>();
    covered.set(edge.target, axes);
    const paths: Point[][] = [];
    const points = structuralEdgePoints(edge, rects);
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      if (length === 0) continue;
      const sign = b.x > a.x || b.x === a.x && b.y > a.y ? 1 : -1;
      const dx = (b.x - a.x) / length * sign, dy = (b.y - a.y) / length * sign;
      const start = a.x * dx + a.y * dy, end = b.x * dx + b.y * dy;
      if (start === end) continue;
      const key = `${dx.toFixed(9)}:${dy.toFixed(9)}:${(dx * a.y - dy * a.x).toFixed(6)}`;
      const at = (value: number): Point => Math.abs(value - start) < 1e-7 ? { ...a } : Math.abs(value - end) < 1e-7 ? { ...b }
        : { x: a.x + (b.x - a.x) * (value - start) / (end - start), y: a.y + (b.y - a.y) * (value - start) / (end - start) };
      const low = Math.min(start, end), high = Math.max(start, end);
      let pieces: [number, number][] = [[low, high]];
      for (const [from, to] of axes.get(key) ?? []) pieces = pieces.flatMap(([left, right]) =>
        to <= left || from >= right ? [[left, right]] : [
          ...(from > left ? [[left, from] as [number, number]] : []), ...(to < right ? [[to, right] as [number, number]] : []),
        ]);
      if (start > end) pieces.reverse();
      for (const [left, right] of pieces) {
        const from = start < end ? left : right, to = start < end ? right : left;
        const p = at(from), q = at(to);
        const previous = paths.at(-1);
        if (previous?.at(-1)?.x === p.x && previous.at(-1)?.y === p.y) previous.push(q);
        else paths.push([p, q]);
      }
      const intervals = [...(axes.get(key) ?? []), [low, high] as [number, number]].sort((a, b) => a[0] - b[0]);
      const merged: [number, number][] = [];
      for (const interval of intervals) {
        const last = merged.at(-1);
        if (last && interval[0] <= last[1]) last[1] = Math.max(last[1], interval[1]);
        else merged.push([...interval]);
      }
      axes.set(key, merged);
    }
    result.set(edge.id, paths);
  }
  return result;
}

/** Resolve each table marker's source anchor after physical ports are positioned. */
export function tableSourceAnchors(nodes: DiagramNode[], edges: DiagramEdge[]): DiagramEdge[] {
  const rects = absoluteNodeRects(nodes);
  return edges.map((edge) => {
    if (edge.waypoints || !association(edge, rects)) return edge;
    const source = rects.get(edge.source)!, target = rects.get(edge.target)!;
    const { x, y, side } = borderPoint(source, target, edge.sourceSide, edge.sourcePort);
    return { ...edge, sourceSide: side, centerX: undefined, points: [{ x, y }] };
  });
}

/** Route shared fans together, preferring clear lanes over overlaps with earlier connections. */
export function routeStructuralEdges(nodes: DiagramNode[], edges: DiagramEdge[]): DiagramEdge[] {
  const rects = absoluteNodeRects(nodes), byId = new Map<string, DiagramEdge>();
  const ordered = edges.filter((edge) => !edge.waypoints && !association(edge, rects)).map((edge) => ({ ...edge, points: undefined }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const fans = new Map<string, DiagramEdge[]>(), automaticTargets = new Set<string>();
  for (const edge of ordered) {
    const source = rects.get(edge.source), target = rects.get(edge.target);
    if (!source || !target) throw new Error(`Unknown diagram connection endpoint: ${edge.id}`);
    const side = borderPoint(target, source, edge.targetSide, edge.targetPort).side;
    const key = `${target.id}:${side}`;
    fans.set(key, [...(fans.get(key) ?? []), edge]);
  }
  for (const fan of fans.values()) {
    if (fan.length < 2) continue;
    const target = rects.get(fan[0].target)!;
    const side = borderPoint(target, rects.get(fan[0].source)!, fan[0].targetSide, fan[0].targetPort).side;
    fan.sort((a, b) => {
      const aa = rects.get(a.source)!, bb = rects.get(b.source)!;
      return (side === 'left' || side === 'right' ? aa.y + aa.height / 2 - bb.y - bb.height / 2
        : aa.x + aa.width / 2 - bb.x - bb.width / 2) || a.id.localeCompare(b.id);
    });
    const reserved = fan.flatMap((edge) => edge.targetPort == null ? [] : [edge.targetPort]);
    const automatic = fan.filter((edge) => edge.targetPort == null && rects.get(edge.target)!.node.kind !== 'rtdot');
    const slots = Array.from({ length: fan.length + reserved.length }, (_, i) => (i + 1) / (fan.length + reserved.length + 1))
      .filter((value) => reserved.every((fixed) => Math.abs(value - fixed) > 0.001));
    automatic.forEach((edge, i) => {
      edge.targetPort = slots[Math.floor((i + 0.5) * slots.length / automatic.length)];
      automaticTargets.add(edge.id);
    });
  }
  for (const edge of ordered) {
    if (edge.centerX == null || rects.get(edge.source)?.node.kind !== 'vcn' || rects.get(edge.target)?.node.kind !== 'attachment') continue;
    if (edge.sourcePort != null && edge.targetPort != null) continue;
    const ports = routeStructural(edge, rects, []);
    Object.assign(edge, { sourceSide: ports.sourceSide, sourcePort: ports.sourcePort,
      targetSide: ports.targetSide, targetPort: ports.targetPort });
  }
  const physicalFans = physicalFanRoutes(rects, ordered);
  const occupied: RoutingSegment[] = [];
  for (const edge of ordered) {
    const routed = physicalFans.get(edge.id) ?? routeStructural(edge, rects, occupied, automaticTargets.has(edge.id));
    byId.set(edge.id, routed);
    for (let i = 1; i < routed.points!.length; i++) occupied.push({ start: routed.points![i - 1], end: routed.points![i] });
  }
  // Revisit early greedy choices once; a small fixed budget keeps interactive edits bounded.
  const conflicts = [...byId.values()].map((edge) => ({ edge, score: connectionConflict([edge.points!],
    [...byId.values()].filter((other) => other.id !== edge.id).map((other) => other.points!)) }))
    .filter(({ edge, score }) => score > 0 && !physicalFans.has(edge.id)).sort((a, b) => b.score - a.score || a.edge.id.localeCompare(b.edge.id));
  for (const { edge } of conflicts.slice(0, 8)) {
    const others = [...byId.values()].filter((other) => other.id !== edge.id).map((other) => other.points!);
    const occupied = others.flatMap((path) => path.slice(1).map((end, i) => ({ start: path[i], end })));
    const candidate = routeStructural(edge, rects, occupied);
    if (connectionConflict([candidate.points!], others) < connectionConflict([edge.points!], others)) byId.set(edge.id, candidate);
  }
  return edges.map((edge) => byId.get(edge.id) ?? edge);
}

export interface FlowVisitAnchor {
  point: Point;
  owner: string;
  anchorId?: string;
  phase?: 'entry' | 'exit';
}

/** Follow physical connections unchanged and record processing events at their actual ports. */
export function connectionFlowGeometry(nodes: DiagramNode[], connections: DiagramEdge[], nodeVisits: string[], preferredX?: number,
  hopAnchors?: ReadonlyMap<number, FlowVisitAnchor>, routeLocal = createLocalFlowRouter(nodes)): {
  points: Point[]; visits: { node: string; pointIndex: number; distance: number; anchorId?: string }[];
} {
  const rects = absoluteNodeRects(nodes);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  nodeVisits.forEach((id, index) => {
    if (!rects.has(id)) throw new Error(`Unknown flow resource ${id} at visit ${index}`);
  });
  const physicalEdges = connections.filter((edge) => !edge.waypoints);
  const points: Point[] = [];
  const visits: { node: string; pointIndex: number; distance: number; anchorId?: string }[] = [];
  let distance = 0;
  const append = (segment: Point[]) => {
    for (const point of segment) {
      const previous = points.at(-1);
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)
        || previous && previous.x !== point.x && previous.y !== point.y) {
        throw new Error('Flow connection geometry must contain finite orthogonal segments');
      }
      if (previous?.x === point.x && previous.y === point.y) continue;
      if (previous) distance += Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y);
      points.push(point);
    }
  };
  const vcnOf = (id: string): string | undefined => {
    let node = byId.get(id);
    while (node) {
      if (node.kind === 'vcn') return node.id;
      node = node.parentId ? byId.get(node.parentId) : undefined;
    }
  };
  const physical = (from: string, to: string): Point[] | undefined => {
    const forward = physicalEdges.find((edge) => edge.source === from && edge.target === to);
    if (forward) return structuralEdgePoints(forward, rects);
    const reverse = physicalEdges.find((edge) => edge.source === to && edge.target === from);
    return reverse ? [...structuralEdgePoints(reverse, rects)].reverse() : undefined;
  };
  const legs = nodeVisits.slice(1).map((to, index) => {
    const from = nodeVisits[index];
    const direct = physical(from, to);
    const outbound = !direct && byId.get(to)?.kind === 'attachment' ? physical(vcnOf(from) ?? '', to) : undefined;
    const inbound = !direct && byId.get(from)?.kind === 'attachment' ? physical(from, vcnOf(to) ?? '') : undefined;
    return { connection: direct || outbound || inbound, outbound, inbound,
      entryOwner: inbound ? vcnOf(to) : direct ? to : undefined };
  });
  for (const [index, anchor] of hopAnchors ?? []) {
    if (!Number.isInteger(index) || index < 0 || index >= nodeVisits.length || !rects.has(anchor.owner)
      || !Number.isFinite(anchor.point.x) || !Number.isFinite(anchor.point.y)) {
      throw new Error(`Invalid flow hop anchor at visit ${index}`);
    }
    if (anchor.owner !== nodeVisits[index] && (legs[index]?.entryOwner !== anchor.owner || !legs[index]?.connection?.length)) {
      throw new Error(`Flow hop anchor ${anchor.owner} has no outgoing connection at visit ${index}`);
    }
  }
  const endpoint = (index: number, phase: 'entry' | 'exit'): Point => {
    const anchor = hopAnchors?.get(index);
    if (anchor?.owner === nodeVisits[index]) {
      return (anchor.phase ?? 'exit') === phase ? anchor.point : flowAnchorPoint(rects.get(nodeVisits[index])!);
    }
    // VCN ingress follows the connection; DRG events still traverse the attachment centre first.
    if (anchor && byId.get(anchor.owner)?.kind !== 'drg') return legs[index].connection![0];
    return flowAnchorPoint(rects.get(nodeVisits[index])!);
  };
  const record = (index: number) => {
    visits[index] = { node: nodeVisits[index], pointIndex: points.length - 1, distance,
      anchorId: hopAnchors?.get(index)?.anchorId ?? nodeVisits[index] };
  };
  const portOwner = (index: number, phase: 'entry' | 'exit') => {
    const anchor = hopAnchors?.get(index);
    return anchor?.owner === nodeVisits[index] && (anchor.phase ?? 'exit') === phase ? anchor.owner : undefined;
  };
  // These short joins stay inside the attachment/DRG glyph, between its centre and port.
  const join = (from: Point, to: Point) => append([from, { x: to.x, y: from.y }, to]);
  for (let index = 0; index < nodeVisits.length; index++) {
    const id = nodeVisits[index];
    const anchor = endpoint(index, 'entry');
    if (index === 0) append([anchor]);
    else {
      const from = nodeVisits[index - 1];
      const start = endpoint(index - 1, 'exit');
      const { connection, outbound, inbound, entryOwner } = legs[index - 1];
      if (connection?.length) {
        const first = connection[0], last = connection.at(-1)!;
        if (outbound) append(routeLocal(start, first, [from, id], preferredX, { startOwner: portOwner(index - 1, 'exit') }));
        else join(start, first);
        append(connection);
        const previousEvent = hopAnchors?.get(index - 1);
        if (previousEvent && previousEvent.owner !== from && previousEvent.owner === entryOwner) {
          append(routeLocal(last, previousEvent.point, [from, id, previousEvent.owner], preferredX));
          record(index - 1);
          append(routeLocal(previousEvent.point, anchor, [from, id], preferredX, { endOwner: portOwner(index, 'entry') }));
        } else if (inbound) append(routeLocal(last, anchor, [from, id], preferredX, { endOwner: portOwner(index, 'entry') }));
        else join(last, anchor);
      } else append(routeLocal(start, anchor, [from, id], preferredX,
        { startOwner: portOwner(index - 1, 'exit'), endOwner: portOwner(index, 'entry') }));
    }
    const event = hopAnchors?.get(index);
    const ownEvent = event?.owner === id;
    const local = () => append(routeLocal(anchor, endpoint(index, 'exit'), [id], preferredX));
    if (ownEvent && event.phase !== 'entry') local();
    record(index);
    if (ownEvent && event.phase === 'entry') local();
  }
  return { points, visits };
}
