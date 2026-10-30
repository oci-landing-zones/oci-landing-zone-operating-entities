import type { DiagramEdge, DiagramNode, EdgeSide } from '../model/types';
import { absoluteNodeRects } from './flowGeometry';
import { drgCaptionBounds } from './layoutPolicy';
import { tableLineConflicts, tableLineEntersBox, type Box, type Point, type Segment } from './lineGeometry';

const containers = new Set(['region', 'tenancy', 'landingzone', 'compartment', 'vcn', 'premises', 'project']);
const length = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
type Cost = readonly [number, number, number, number];
const better = (a: Cost, b: Cost) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i] - 1e-7;
  return false;
};
const overlaps = (a: Box, b: Box) => a.x < b.x + b.width + 12 && a.x + a.width + 12 > b.x
  && a.y < b.y + b.height + 12 && a.y + a.height + 12 > b.y;

/** Direct leaders deliberately permit resource crossings; their ports and physical links stay fixed. */
export function tableAssociations(nodes: DiagramNode[], edges: DiagramEdge[]): DiagramEdge[] {
  const rects = absoluteNodeRects(nodes), groups = new Map<string, DiagramEdge[]>();
  for (const edge of edges) if (!edge.waypoints && rects.get(edge.source)?.node.kind === 'rtdot' && rects.get(edge.target)?.node.kind === 'routetable') {
    groups.set(edge.target, [...(groups.get(edge.target) ?? []), edge]);
  }
  const changed = new Map<string, DiagramEdge>();
  for (const [id, group] of groups) {
    const table = rects.get(id)!, ports = group.map((edge) => edge.points![0]);
    const x = ports.reduce((sum, p) => sum + p.x, 0) / ports.length - table.x - table.width / 2;
    const y = ports.reduce((sum, p) => sum + p.y, 0) / ports.length - table.y - table.height / 2;
    const side: EdgeSide = Math.abs(x) / table.width >= Math.abs(y) / table.height ? x < 0 ? 'left' : 'right' : y < 0 ? 'top' : 'bottom';
    const entry = { x: side === 'left' ? table.x : side === 'right' ? table.x + table.width
      : Math.max(table.x + 8, Math.min(table.x + table.width - 8, table.x + table.width / 2 + x)),
      y: side === 'top' ? table.y : side === 'bottom' ? table.y + table.height
        : Math.max(table.y + 8, Math.min(table.y + table.height - 8, table.y + table.height / 2 + y)) };
    const targetPort = side === 'left' || side === 'right' ? (entry.y - table.y) / table.height : (entry.x - table.x) / table.width;
    for (const edge of group) changed.set(edge.id, { ...edge, centerX: undefined, targetSide: side, targetPort,
      points: [edge.points![0], entry] });
  }
  return edges.map((edge) => changed.get(edge.id) ?? edge);
}

export type TableColumns = readonly [number, number, number];

/** Choose each card's column and vertical order without moving physical resources. */
export function optimizeTablePlacement(nodes: DiagramNode[], edges: DiagramEdge[], columns: TableColumns, optimize = true): DiagramNode[] {
  const rects = absoluteNodeRects(nodes);
  const tables = nodes.filter((node) => node.kind === 'routetable');
  if (!tables.length) return nodes;
  const boxes: Box[] = [...rects.values()].filter((rect) => !['routetable', 'rtdot'].includes(rect.node.kind)).flatMap((rect) => [
    { ...rect, height: containers.has(rect.node.kind) ? Math.min(56, rect.height) : rect.height, clearance: 0 },
    ...(rect.node.kind === 'drg' && rect.node.label.trim() ? [{ ...drgCaptionBounds({ ...rect, label: rect.node.label }), id: `${rect.id}:caption`, clearance: 0 }] : []),
  ]);
  const sourceKinds = new Map(nodes.map((node) => [node.id, node.kind]));
  const bodies = new Set(nodes.filter((node) => !containers.has(node.kind) && !['routetable', 'rtdot'].includes(node.kind)).map((node) => node.id));
  const physical: Segment[] = edges.filter((edge) => !edge.waypoints && sourceKinds.get(edge.source) !== 'rtdot')
    .flatMap((edge) => (edge.points ?? []).slice(1).map((b, i) => ({ a: edge.points![i], b, id: edge.id, physical: true })));
  const positions = new Map(tables.map((table) => [table.id, { ...rects.get(table.id)!, clearance: 0 }]));
  const moved = () => nodes.map((node) => {
    const position = positions.get(node.id), original = rects.get(node.id)!;
    return position ? { ...node, x: node.x + position.x - original.x, y: node.y + position.y - original.y } : node;
  });
  const global = { x: Math.min(...[...rects.values()].map((r) => r.x)), y: Math.min(...[...rects.values()].map((r) => r.y)),
    right: Math.max(...[...rects.values()].map((r) => r.x + r.width)), bottom: Math.max(...[...rects.values()].map((r) => r.y + r.height)) };
  let availableBottom = global.bottom;
  const boundsFor = (table: DiagramNode) => {
    const parent = rects.get(table.parentId ?? 'landingzone');
    return parent ? { x: parent.x + 8, y: parent.y + 56, right: parent.x + parent.width - 8,
      bottom: parent.y + parent.height - 16 + availableBottom - global.bottom } : { ...global, bottom: availableBottom };
  };
  const canPlace = (candidate: Box, ignore = new Set([candidate.id])) => {
    const table = rects.get(candidate.id)!.node, bounds = boundsFor(table);
    return columns.includes(candidate.x) && candidate.x >= bounds.x && candidate.y >= bounds.y
      && candidate.x + candidate.width <= bounds.right && candidate.y + candidate.height <= bounds.bottom
      && ![...boxes, ...[...positions.values()].filter((box) => !ignore.has(box.id))].some((box) => overlaps(candidate, box))
      && !physical.some(({ a, b }) => tableLineEntersBox(a, b, candidate));
  };
  let useProximity = false;
  const score = (): Cost => {
    const leaders = tableAssociations(moved(), edges);
    const annotations = leaders.filter((edge) => !edge.waypoints && sourceKinds.get(edge.source) === 'rtdot');
    let resourceHits = 0, textHits = 0, conflicts = 0, worstContacts = 0, sharedLength = 0, distance = 0, proximity = 0, separation = 0;
    for (const edge of annotations) {
      const path = edge.points!, hit = new Set<string>();
      let edgeContacts = 0;
      const ports = annotations.filter((other) => other.target === edge.target).map((other) => other.points![0]);
      const table = positions.get(edge.target)!, port = edge.points![0];
      const gap = Math.max(table.y - port.y, port.y - table.y - table.height, 0);
      // Average per table so a distant single-owner card cannot hide behind larger bundles.
      proximity += 2 * Math.max(0, gap / table.width - 0.5) ** 2 / ports.length;
      separation += Math.max(0, gap / table.width - 2) ** 2 / ports.length;
      const occupied: Segment[] = [...physical, ...annotations.filter((other) => other.target !== edge.target)
        .flatMap((other) => other.points!.slice(1).map((b, i) => ({ a: other.points![i], b, id: other.id, physical: false })))];
      for (let i = 1; i < path.length; i++) {
        distance += length(path[i - 1], path[i]);
        const measured = tableLineConflicts(path[i - 1], path[i], occupied, ports);
        conflicts += measured.crossings; edgeContacts += measured.crossings; sharedLength += measured.sharedLength;
        for (const box of [...boxes, ...positions.values()]) if (tableLineEntersBox(path[i - 1], path[i], box)) hit.add(box.id);
      }
      for (const id of hit) if (bodies.has(id)) resourceHits++; else textHits++;
      // A single leader must not absorb all the crossings saved on a larger bundle.
      worstContacts = Math.max(worstContacts, edgeContacts);
    }
    return [sharedLength, useProximity ? separation : 0,
      resourceHits * 4 + conflicts + worstContacts ** 2 + textHits * 2 + (useProximity ? proximity : 0), distance];
  };
  const relocate = (table: DiagramNode) => {
    const original = positions.get(table.id)!, bounds = boundsFor(table);
    const ports = edges.filter((edge) => !edge.waypoints && edge.target === table.id).map((edge) => edge.points![0]);
    const desired = ports.length ? ports.reduce((sum, p) => sum + p.y, 0) / ports.length - original.height / 2 : original.y;
    let best = canPlace(original) ? original : undefined, bestCost = best ? score() : [Infinity, Infinity, Infinity, Infinity] as Cost;
    const slots = [desired,
      ...physical.flatMap(({ a, b }) => [Math.min(a.y, b.y) - original.height - 12, Math.max(a.y, b.y) + 12]),
      ...[...boxes, ...positions.values()].filter((box) => box.id !== table.id).flatMap((box) => [box.y - original.height - 12, box.y + box.height + 12])];
    const ys = [...new Set([original.y, bounds.y, bounds.bottom - original.height,
      ...Array.from({ length: 16 }, (_, i) => bounds.y + Math.max(0, bounds.bottom - original.height - bounds.y) * i / 15),
      ...[...new Set(slots)].sort((a, b) => Math.abs(a - desired) - Math.abs(b - desired) || a - b).slice(0, 47)])];
    for (const x of columns) for (const y of ys) {
      const candidate = { ...original, x, y };
      if (!canPlace(candidate)) continue;
      positions.set(table.id, candidate);
      const cost = score();
      if (!best || better(cost, bestCost)) { best = candidate; bestCost = cost; }
    }
    if (!best) {
      // Crowded columns grow vertically rather than inventing a fourth column or hiding a table.
      best = { ...original, x: columns[0], y: availableBottom + 12 };
      const parent = rects.get(table.parentId ?? 'landingzone');
      const parentBottom = parent ? parent.y + parent.height : global.bottom;
      availableBottom = Math.max(availableBottom, global.bottom + best.y + best.height + 16 - parentBottom);
    }
    positions.set(table.id, best);
  };
  for (const table of tables) if (!canPlace(positions.get(table.id)!)) relocate(table);
  for (let pass = 0; pass < (optimize ? 2 : 0); pass++) {
    useProximity = pass > 0;
    for (const table of tables) relocate(table);
    const pairs = tables.flatMap((table, i) => tables.slice(i + 1).map((other) => [table.id, other.id] as const)).slice(0, 256);
    for (const [aId, bId] of pairs) {
      const [upper, lower] = [positions.get(aId)!, positions.get(bId)!].sort((a, b) => a.y - b.y || a.id.localeCompare(b.id));
      const candidates = [[{ ...upper, x: lower.x, y: lower.y }, { ...lower, x: upper.x, y: upper.y }]];
      if (upper.x === lower.x) candidates.push([{ ...upper, y: lower.y + lower.height - upper.height }, { ...lower, y: upper.y }]);
      for (const x of columns) {
        if (x !== upper.x) candidates.push([{ ...upper, x }, { ...lower, x: upper.x, y: upper.y }]);
        if (x !== lower.x) candidates.push([{ ...upper, x: lower.x, y: lower.y }, { ...lower, x }]);
      }
      const initial = new Map(positions);
      let best = initial, bestCost = score();
      const restore = (snapshot: typeof positions) => { positions.clear(); for (const [id, box] of snapshot) positions.set(id, box); };
      for (const [a, b] of candidates) {
        restore(initial);
        positions.set(a.id, a); positions.set(b.id, b);
        // Inserting a taller card can require moving several neighbours together.
        for (const x of columns) {
          let bottom = -Infinity;
          for (const box of [...positions.values()].filter((box) => box.x === x).sort((a, b) => a.y - b.y || a.id.localeCompare(b.id))) {
            const y = Math.max(box.y, bottom);
            if (y !== box.y) positions.set(box.id, { ...box, y });
            bottom = y + box.height + 12;
          }
        }
        if ([...positions.values()].some((box) => {
          const previous = initial.get(box.id)!;
          return (box.x !== previous.x || box.y !== previous.y) && !canPlace(box);
        })) continue;
        const cost = score();
        if (better(cost, bestCost)) { best = new Map(positions); bestCost = cost; }
      }
      restore(best);
    }
  }
  const result = moved(), resultById = new Map(result.map((node) => [node.id, node]));
  for (const table of tables) {
    let bottom = positions.get(table.id)!.y + table.height;
    let parentId = table.parentId ?? (resultById.has('landingzone') ? 'landingzone' : undefined);
    while (parentId) {
      const parent = resultById.get(parentId)!, original = rects.get(parentId)!;
      if (bottom + 16 <= original.y + parent.height) break;
      const grown = { ...parent, height: bottom + 16 - original.y };
      resultById.set(parentId, grown);
      bottom = original.y + grown.height; parentId = parent.parentId;
    }
  }
  return result.map((node) => resultById.get(node.id)!);
}
