import type { DiagramEdge, DiagramNode } from '../model/types';
import { absoluteNodeRects, BEND_COST, clearRoutingSegment, createLocalFlowRouter, flowAnchorPoint, routeOrthogonalPoints, type FlowRect, type RoutingSegment } from './flowGeometry';
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
    const reverse = a.node.kind === 'drg' && b.node.kind === 'attachment';
    const source = reverse ? b : a, target = reverse ? a : b;
    if (source.node.kind !== 'attachment' || target.node.kind !== 'drg') continue;
    const s = borderPoint(source, target, reverse ? edge.targetSide : edge.sourceSide, reverse ? edge.targetPort : edge.sourcePort);
    const t = borderPoint(target, source, reverse ? edge.sourceSide : edge.targetSide, reverse ? edge.sourcePort : edge.targetPort);
    if (!((s.side === 'left' && t.side === 'right') || (s.side === 'right' && t.side === 'left'))) continue;
    const key = `${target.id}:${t.side}`;
    groups.set(key, [...(groups.get(key) ?? []), { edge, source, target, s, t, side: t.side, reverse }]);
  }
  const result = new Map<string, DiagramEdge>();
  for (const fan of groups.values()) {
    if (fan.length < 2) continue;
    const lanes: { low: number; high: number; index: number }[] = [];
    fan.sort((a, b) => {
      const aTop = a.s.y <= a.t.y, bTop = b.s.y <= b.t.y;
      return aTop !== bTop ? Number(bTop) - Number(aTop)
        : (aTop ? a.s.y - b.s.y : b.s.y - a.s.y) || a.edge.id.localeCompare(b.edge.id);
    });
    for (const { edge, source, target, s, t, side, reverse } of fan) {
      const low = Math.min(s.y, t.y), high = Math.max(s.y, t.y);
      let lane = 0;
      while (lanes.some((used) => used.index === lane && low <= used.high + 8 && high >= used.low - 8)) lane++;
      const direction = side === 'right' ? 1 : -1;
      const x = t.x + direction * (drgCaptionLayout(target.node.label, target.width).overhang + 12 + lane * 8);
      if (direction * (s.x - x) < 12) continue;
      const points = [s, { x, y: s.y }, { x, y: t.y }, t].map(({ x, y }) => ({ x, y }))
        .filter((point, index, path) => index === 0 || point.x !== path[index - 1].x || point.y !== path[index - 1].y);
      if (!points.slice(1).every((point, i) => clearRoutingSegment(rects, points[i], point,
        [source.id, target.id], 0, [source.id, target.id]))) continue;
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
      const a = points[i - 1], b = points[i], horizontal = a.y === b.y;
      const start = horizontal ? a.x : a.y, end = horizontal ? b.x : b.y;
      if (start === end) continue;
      const key = horizontal ? `h:${a.y}` : `v:${a.x}`;
      const low = Math.min(start, end), high = Math.max(start, end);
      let pieces: [number, number][] = [[low, high]];
      for (const [from, to] of axes.get(key) ?? []) pieces = pieces.flatMap(([left, right]) =>
        to <= left || from >= right ? [[left, right]] : [
          ...(from > left ? [[left, from] as [number, number]] : []), ...(to < right ? [[to, right] as [number, number]] : []),
        ]);
      if (start > end) pieces.reverse();
      for (const [left, right] of pieces) {
        const from = start < end ? left : right, to = start < end ? right : left;
        const p = horizontal ? { x: from, y: a.y } : { x: a.x, y: from };
        const q = horizontal ? { x: to, y: a.y } : { x: a.x, y: to };
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

function pathSimplicity(paths: Point[][]): number {
  const vertices = new Map<string, Point>();
  const segments = paths.flatMap((points) => points.slice(1).flatMap((b, i) => {
    const a = points[i];
    if (a.x === b.x && a.y === b.y) return [];
    vertices.set(`${a.x}:${a.y}`, a); vertices.set(`${b.x}:${b.y}`, b);
    return [{ a, b }];
  }));
  const length = segments.reduce((sum, { a, b }) => sum + Math.abs(b.x - a.x) + Math.abs(b.y - a.y), 0);
  const corners = [...vertices.values()].filter((point) => {
    let axes = 0;
    for (const { a, b } of segments) {
      if (a.y === b.y && point.y === a.y && point.x >= Math.min(a.x, b.x) && point.x <= Math.max(a.x, b.x)) axes |= 1;
      if (a.x === b.x && point.x === a.x && point.y >= Math.min(a.y, b.y) && point.y <= Math.max(a.y, b.y)) axes |= 2;
    }
    return axes === 3;
  }).length;
  return length + BEND_COST * corners;
}

function associationRank(rects: Map<string, FlowRect>, edges: DiagramEdge[], others: Point[][]): [number, number] {
  const paths = [...associationSegments(rects, edges).values()].flat();
  return [connectionConflict(paths, others), pathSimplicity(paths)];
}

function associationStart(edge: DiagramEdge, target: FlowRect, rects: Map<string, FlowRect>) {
  const source = rects.get(edge.source)!, s = borderPoint(source, target, edge.sourceSide, edge.sourcePort);
  const owner = source.node.rtDotOwnerId ? rects.get(source.node.rtDotOwnerId) : undefined;
  let start: Point = s;
  const escaped = outward(s, s.side);
  if (owner) {
    if (s.side === 'left') escaped.x = Math.min(escaped.x, owner.x - 12);
    if (s.side === 'right') escaped.x = Math.max(escaped.x, owner.x + owner.width + 12);
    if (s.side === 'top') escaped.y = Math.min(escaped.y, owner.y - 12);
    if (s.side === 'bottom') escaped.y = Math.max(escaped.y, owner.y + owner.height + 12);
  }
  if (clearRoutingSegment(rects, s, escaped, [source.id, target.id], 0)) start = escaped;
  else for (const length of [8, 4, 1]) {
    const candidate = outward(s, s.side, length);
    if (clearRoutingSegment(rects, s, candidate, [source.id, target.id], 0)) { start = candidate; break; }
  }
  return { edge, source, s, start, ownerIds: owner ? [owner.id] : [] };
}

function routeAssociations(rects: Map<string, FlowRect>, leaders: DiagramEdge[], physical: DiagramEdge[]): DiagramEdge[] {
  const groups = new Map<string, DiagramEdge[]>();
  for (const edge of leaders) groups.set(edge.target, [...(groups.get(edge.target) ?? []), edge]);
  const items = [...groups.entries()].map(([tableId, branches]) => {
    const target = rects.get(tableId)!;
    const side = borderPoint(target, rects.get(branches[0].source)!, branches[0].targetSide).side;
    const terminal = borderPoint(target, rects.get(branches[0].source)!, side, 0.5);
    const sources = branches.map((edge) => associationStart(edge, target, rects));
    return { branches: sources, target, side, terminal, low: Math.min(terminal.y, ...sources.map(({ start }) => start.y)),
      high: Math.max(terminal.y, ...sources.map(({ start }) => start.y)) };
  }).sort((a, b) => a.low - b.low || a.target.id.localeCompare(b.target.id));
  const occupied = physical.flatMap((edge) => edge.points!.slice(1).map((end, i) => ({ start: edge.points![i], end })));
  const lanes: { x: number; low: number; high: number }[] = [];
  const routed: DiagramEdge[] = [];
  for (const { branches, target, side, terminal, low, high } of items) {
    const direction = side === 'right' ? 1 : -1, border = side === 'right' ? target.x + target.width : target.x;
    const excluded = [target.id, ...branches.map(({ source }) => source.id)];
    const ownerBodies = branches.flatMap(({ ownerIds }) => ownerIds);
    const candidates = Array.from({ length: 6 }, (_, lane) => border + direction * (16 + lane * 8));
    const free = candidates.filter((x) => !lanes.some((used) => Math.abs(used.x - x) < 1 && low <= used.high + 8 && high >= used.low - 8));
    // Crowded gutters compress the lane spacing instead of sending annotations across the drawing.
    let rail = free[0] ?? border + direction * (16 + (lanes.length + 1) / (lanes.length + 2) * 40);
    const otherPaths = [...physical.map((edge) => edge.points!), ...[...associationSegments(rects, routed).values()].flat()];
    let bestScore = Infinity;
    for (const x of free) {
      if (!clearRoutingSegment(rects, { x, y: low }, { x, y: high }, excluded, 0, [target.id, ...ownerBodies]) ||
        !clearRoutingSegment(rects, { x, y: terminal.y }, terminal, excluded, 0, [target.id, ...ownerBodies])) continue;
      const score = connectionConflict([[{ x, y: low }, { x, y: high }]], otherPaths)
        + connectionConflict([[{ x, y: terminal.y }, terminal]], otherPaths);
      if (score < bestScore) { rail = x; bestScore = score; }
    }
    const group: DiagramEdge[] = [], alternatives: DiagramEdge[][] = [];
    for (const { edge, source, s, start, ownerIds } of branches.sort((a, b) => a.edge.id.localeCompare(b.edge.id))) {
      const join = { x: rail, y: start.y };
      const distance = Math.min(12, Math.abs(start.x - rail) / 2);
      const prejoin = { x: rail + (start.x <= rail ? -distance : distance), y: start.y };
      const halfPlane = start.x <= rail ? { right: prejoin.x } : { left: prejoin.x };
      const radius = Math.max(48, target.height);
      const localBounds = { left: Math.min(start.x, prejoin.x) - 24, right: Math.max(start.x, prejoin.x) + 24,
        top: start.y - radius, bottom: start.y + radius, ...halfPlane };
      const exclusions = [source.id, target.id], bodies = [target.id, ...ownerIds];
      let prefix = routeOrthogonalPoints(rects, start, prejoin, exclusions, rail, occupied, bodies, localBounds);
      if (!prefix.slice(1).every((point, i) => clearRoutingSegment(rects, prefix[i], point, exclusions, 0, bodies))) {
        prefix = routeOrthogonalPoints(rects, start, prejoin, exclusions, rail, occupied, bodies, halfPlane);
      }
      prefix.push(join);
      const trunk = [{ x: rail, y: start.y }, { x: rail, y: terminal.y }, { x: terminal.x, y: terminal.y }];
      const clearTrunk = trunk.slice(1).every((point, i) => clearRoutingSegment(rects, trunk[i], point, [source.id, target.id], 0, [target.id, ...ownerIds]));
      const suffix = clearTrunk ? trunk : routeOrthogonalPoints(rects, join,
        outward(terminal, side), [source.id, target.id], rail, occupied, [target.id, ...ownerIds]).concat([{ x: terminal.x, y: terminal.y }]);
      const points: Point[] = [{ x: s.x, y: s.y }, ...prefix, ...suffix.slice(1)];
      const result = { ...edge, centerX: rail, targetSide: side, targetPort: 0.5, points };
      group.push(result);
      const signature = (path: Point[]) => polylinePath(path.filter((point, i) => i === 0 || i === path.length - 1 ||
        !(path[i - 1].x === point.x && point.x === path[i + 1].x || path[i - 1].y === point.y && point.y === path[i + 1].y)));
      const seen = new Set([signature(points)]), choices: DiagramEdge[] = [];
      for (const [index, vertex] of prefix.entries()) {
        if ((vertex.y < low || vertex.y > high) && lanes.some((used) => Math.abs(used.x - rail) < 1 &&
          Math.min(vertex.y, terminal.y) <= used.high + 8 && Math.max(vertex.y, terminal.y) >= used.low - 8)) continue;
        const approach = { x: rail, y: vertex.y };
        const previous = prefix[index - 1] ?? s;
        if ((vertex.x - previous.x) * (approach.x - vertex.x) < -0.001) continue;
        const candidate = [{ x: s.x, y: s.y }, ...prefix.slice(0, index + 1), approach,
          { x: rail, y: terminal.y }, { x: terminal.x, y: terminal.y }]
          .filter((point, i, path) => i === 0 || point.x !== path[i - 1].x || point.y !== path[i - 1].y);
        const key = signature(candidate);
        if (seen.has(key)) continue;
        seen.add(key);
        const forward = outward(s, s.side, 1), first = candidate[1];
        if (first && (first.x - s.x) * (forward.x - s.x) + (first.y - s.y) * (forward.y - s.y) < -0.001) continue;
        if (candidate.some((point, i) => i > 1 && (point.x - candidate[i - 1].x) * (candidate[i - 1].x - candidate[i - 2].x)
          + (point.y - candidate[i - 1].y) * (candidate[i - 1].y - candidate[i - 2].y) < -0.001)) continue;
        const hasStub = start.x !== s.x || start.y !== s.y;
        if (!candidate.slice(1).every((point, i) => i === 0 && hasStub && point.x === start.x && point.y === start.y
          || clearRoutingSegment(rects, candidate[i], point, exclusions, 0, bodies))) continue;
        choices.push({ ...result, points: candidate });
      }
      alternatives.push(choices);
    }
    let selected = group;
    if (alternatives.some((choices) => choices.length)) {
      let rank = associationRank(rects, selected, otherPaths);
      alternatives.forEach((choices, index) => {
        for (const choice of choices) {
          const candidate = selected.map((edge, i) => i === index ? choice : edge);
          const candidateRank = associationRank(rects, candidate, otherPaths);
          if (candidateRank[0] < rank[0] || candidateRank[0] === rank[0] && candidateRank[1] < rank[1]) {
            selected = candidate; rank = candidateRank;
          }
        }
      });
    }
    // Reserve the chosen corridor joins, including detours beyond the original source heights.
    const railHeights = selected.flatMap((edge) => edge.points!.filter((point) => point.x === rail).map((point) => point.y));
    lanes.push({ x: rail, low: Math.min(low, ...railHeights), high: Math.max(high, ...railHeights) });
    routed.push(...selected);
    const groupPoints = routed.filter((edge) => edge.target === target.id);
    occupied.push(...groupPoints.flatMap((edge) => edge.points!.slice(1).map((end, i) => ({ start: edge.points![i], end }))));
  }
  return routed;
}

/** Route shared fans together, preferring clear lanes over overlaps with earlier connections. */
export function routeStructuralEdges(nodes: DiagramNode[], edges: DiagramEdge[]): DiagramEdge[] {
  const rects = absoluteNodeRects(nodes), byId = new Map<string, DiagramEdge>();
  const leaders = edges.filter((edge) => !edge.waypoints && association(edge, rects));
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
  for (const edge of routeAssociations(rects, leaders, [...byId.values()])) byId.set(edge.id, edge);
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
    // Ingress processing happens after this connection, not at the attachment centre.
    if (anchor) return legs[index].connection![0];
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
