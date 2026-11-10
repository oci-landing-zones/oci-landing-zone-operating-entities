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
    const table = rects.get(id)!;
    for (const edge of group) {
      const source = edge.points![0];
      const side: EdgeSide = source.x <= table.x + table.width / 2 ? 'left' : 'right';
      const entry = { x: side === 'left' ? table.x : table.x + table.width, y: table.y };
      changed.set(edge.id, { ...edge, centerX: undefined, targetSide: side, targetPort: 0,
        points: [source, entry] });
    }
  }
  return edges.map((edge) => changed.get(edge.id) ?? edge);
}

export type TableColumns = readonly [number, number, number];

/** Choose each card's column and vertical order without moving physical resources. */
export function optimizeTablePlacement(nodes: DiagramNode[], edges: DiagramEdge[], columns: TableColumns, optimize = true): DiagramNode[] {
  const rects = absoluteNodeRects(nodes);
  const tables = nodes.filter((node) => node.kind === 'routetable');
  if (!tables.length) return nodes;
  // Include compartment-border lanes so cards can straddle their boundaries.
  const placementColumns = [...new Set([...columns, ...[...rects.values()]
    .filter((rect) => rect.node.kind === 'compartment')
    .map((rect) => rect.x + rect.width - Math.max(...tables.map((table) => table.width)) / 2)])];
  const spokePosition = (id: string) => {
    const table = rects.get(id)!;
    if (table.node.rtLayoutRole !== 'spoke') return undefined;
    const leader = edges.find((edge) => !edge.waypoints && edge.target === id);
    const dot = leader && rects.get(leader.source)?.node;
    let owner = rects.get(dot?.rtDotOwnerId ?? '');
    while (owner && owner.node.kind !== 'vcn') owner = rects.get(owner.node.parentId ?? '');
    if (!owner) return undefined;
    const ports = edges.filter((edge) => !edge.waypoints && edge.target === id)
      .flatMap((edge) => edge.points?.slice(0, 1) ?? []);
    const centerY = ports.length ? ports.reduce((sum, port) => sum + port.y, 0) / ports.length : owner.y + owner.height / 2;
    const network = rects.get(owner.node.parentId ?? '');
    const environment = rects.get(network?.node.parentId ?? '');
    return { x: owner.x + owner.width + 40, y: centerY - table.height / 2, environment, vcn: owner };

  };
  const ownerGap = 66;
  const leftIds = new Set(tables.filter((table) => table.rtKeepLeft).map((table) => table.id));
  const leftPorts = edges.filter((edge) => !edge.waypoints && leftIds.has(edge.target))
    .flatMap((edge) => edge.points?.slice(0, 1) ?? []);
  const leftRightEdge = leftPorts.length ? Math.min(...leftPorts.map((port) => port.x)) - ownerGap : undefined;
  const columnCache = new Map<string, number[]>();
  const columnsFor = (id: string) => {
    if (columnCache.has(id)) return columnCache.get(id)!;
    const table = rects.get(id)!;
    const leaders = edges.filter((edge) => !edge.waypoints && edge.target === id);
    const ports = leaders.flatMap((edge) => edge.points?.slice(0, 1) ?? []);
    const owners = leaders.flatMap((edge) => {
      const dot = rects.get(edge.source)?.node;
      const owner = rects.get(dot?.rtDotPhysicalOwnerId ?? dot?.rtDotOwnerId ?? '');
      return owner ? [owner] : [];
    });
    let lanes = ports.length ? [...new Set([...placementColumns,
      Math.min(...ports.map((port) => port.x)) - table.width - ownerGap,
      Math.max(...ports.map((port) => port.x)) + ownerGap,
      ...owners.flatMap((owner) => [owner.x - table.width - ownerGap, owner.x + owner.width + ownerGap])])] : placementColumns;
    if (leftIds.has(id) && ports.length) {
      lanes = [...new Set([...(leftRightEdge == null ? [] : [leftRightEdge - table.width]), ...lanes])]
        .filter((x) => x + table.width <= Math.min(...ports.map((port) => port.x)) - 12);
    }
    if (table.node.rtLayoutRole === 'hub-subnet' && rects.has('hub-vcn')) {
      const vcn = rects.get('hub-vcn')!;
      lanes.push(vcn.x + vcn.width + ownerGap);
    }
    const spoke = spokePosition(id);
    if (spoke) lanes.push(spoke.x);
    if (table.node.rtLayoutRole === 'hub-drg' && rects.has('cmp-network')) {
      lanes = [rects.get('cmp-network')!.x - table.width - 12];
    }
    if (table.node.rtLayoutRole === 'spoke-drg' && rects.has('drg')) {
      const drg = rects.get('drg')!;
      lanes.push(drg.x + drg.width + 24);
    }
    if (table.node.rtColumnPreference === 'initial') lanes = [table.x];
    if (table.node.rtColumnPreference === 'right' && ports.length) {
      lanes = lanes.filter((x) => x >= Math.max(...ports.map((port) => port.x)) + 12);
    }
    columnCache.set(id, lanes);
    return lanes;
  };
  const boxes: Box[] = [...rects.values()].filter((rect) => !['routetable', 'rtdot'].includes(rect.node.kind)).flatMap((rect) => [
    { ...rect, ...(rect.node.kind === 'compartment' ? { width: Math.min(rect.width, rect.node.label.length * 8 + 32), height: 28 } : {}),
      ... (containers.has(rect.node.kind) && rect.node.kind !== 'compartment' ? { height: Math.min(56, rect.height) } : {}), clearance: 0 },
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
  const vcnInteriors = [...rects.values()].filter((rect) => rect.node.kind === 'vcn')
    .map((rect) => ({ ...rect, x: rect.x + 0.5, y: rect.y + 0.5, width: rect.width - 1, height: rect.height - 1, clearance: 0 }));
  const leaderClearsVcns = (candidate: Box) => edges.filter((edge) => !edge.waypoints && edge.target === candidate.id)
    .every((edge) => {
      const source = edge.points?.[0];
      if (!source) return true;
      const dot = rects.get(edge.source)?.node;
      const owner = rects.get(dot?.rtDotOwnerId ?? '');
      const entry = { x: source.x <= candidate.x + candidate.width / 2 ? candidate.x : candidate.x + candidate.width, y: candidate.y };
      return vcnInteriors.every((vcn) => {
        // Subnet/gateway annotations must exit their own VCN, but VCN-border
        // annotations and annotations outside a VCN must not re-enter it.
        const startsInside = source.x > vcn.x && source.x < vcn.x + vcn.width
          && source.y > vcn.y && source.y < vcn.y + vcn.height;
        return startsInside && owner?.node.kind !== 'vcn' || !tableLineEntersBox(source, entry, vcn);
      });
    });
  const canPlace = (candidate: Box, ignore = new Set([candidate.id]), extendRight = false) => {
    const table = rects.get(candidate.id)!.node, bounds = boundsFor(table);
    const environment = spokePosition(candidate.id)?.environment;
    const insideEnvironment = !environment || candidate.y >= environment.y + 56
      && candidate.y + candidate.height <= environment.y + environment.height - 16;
    return insideEnvironment && leaderClearsVcns(candidate) && columnsFor(candidate.id).includes(candidate.x) && candidate.x >= bounds.x && candidate.y >= bounds.y
      && (extendRight || candidate.x + candidate.width <= bounds.right) && candidate.y + candidate.height <= bounds.bottom
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
      const gap = Math.hypot(
        Math.max(table.x - port.x, port.x - table.x - table.width, 0),
        Math.max(table.y - port.y, port.y - table.y - table.height, 0));
      // Average per table so a distant single-owner card cannot hide behind larger bundles.
      proximity += 4 * ((gap - ownerGap) / ownerGap) ** 2 / ports.length;
      separation += (Math.max(0, (gap - ownerGap * 2) / ownerGap) ** 2
        + Math.max(0, (ownerGap - gap) / ownerGap) ** 2) / ports.length;
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
    const alignment = leftRightEdge == null ? 0 : [...positions.values()]
      .filter((table) => leftIds.has(table.id))
      .reduce((sum, table) => sum + ((table.x + table.width - leftRightEdge) / ownerGap) ** 2, 0);
    return [sharedLength, useProximity ? separation + alignment : 0,
      resourceHits * 4 + conflicts + worstContacts ** 2 + textHits * 2 + (useProximity ? proximity : 0), distance];
  };
  const relocate = (table: DiagramNode) => {
    const original = positions.get(table.id)!, bounds = boundsFor(table);
    const ports = edges.filter((edge) => !edge.waypoints && edge.target === table.id).map((edge) => edge.points![0]);
    const desired = ports.length ? ports.reduce((sum, p) => sum + p.y, 0) / ports.length - original.height / 2 : original.y;
    let best = canPlace(original) ? original : undefined, bestCost = best ? score() : [Infinity, Infinity, Infinity, Infinity] as Cost;
    const slots = [desired, ...ports.map((port) => port.y + 12),
      ...physical.flatMap(({ a, b }) => [Math.min(a.y, b.y) - original.height - 12, Math.max(a.y, b.y) + 12]),
      ...[...boxes, ...positions.values()].filter((box) => box.id !== table.id).flatMap((box) => [box.y - original.height - 12, box.y + box.height + 12])];
    const ys = [...new Set([original.y, bounds.y, bounds.bottom - original.height,
      ...Array.from({ length: 16 }, (_, i) => bounds.y + Math.max(0, bounds.bottom - original.height - bounds.y) * i / 15),
      ...[...new Set(slots)].sort((a, b) => Math.abs(a - desired) - Math.abs(b - desired) || a - b).slice(0, 47)])];
    for (const x of columnsFor(table.id)) for (const y of ys) {
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
      for (const x of new Set([...columnsFor(aId), ...columnsFor(bId)])) {
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
        for (const x of new Set([...columnsFor(aId), ...columnsFor(bId)])) {
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
  // Keep the hub ingress and DRG cards in a readable stack beside the hub exit.
  const ingress = tables.find((table) => table.rtLayoutRole === 'hub-ingress');
  const hubDrg = tables.find((table) => table.rtLayoutRole === 'hub-drg');
  if (ingress && hubDrg) {
    const ports = edges.filter((edge) => !edge.waypoints && edge.target === ingress.id)
      .flatMap((edge) => edge.points?.slice(0, 1) ?? []);
    if (ports.length) {
      const currentIngress = positions.get(ingress.id)!, currentDrg = positions.get(hubDrg.id)!;
      const x = leftRightEdge == null ? currentIngress.x : leftRightEdge - ingress.width;
      const desiredY = Math.max(...ports.map((port) => port.y));
      const ignore = new Set([ingress.id, hubDrg.id]);
      const candidateYs = [desiredY, ...Array.from({ length: 8 }, (_, i) => desiredY - (i + 1) * 12)];
      for (const y of candidateYs) {
        const nextIngress = { ...currentIngress, x, y };
        const nextDrg = { ...currentDrg, x: rects.has('cmp-network') ? rects.get('cmp-network')!.x - hubDrg.width - 12 : x + ingress.width - hubDrg.width, y: rects.has('drg') ? rects.get('drg')!.y + rects.get('drg')!.height + 12 : y + ingress.height + 16 };
        if (canPlace(nextIngress, ignore) && canPlace(nextDrg, ignore)) {
          positions.set(ingress.id, nextIngress);
          positions.set(hubDrg.id, nextDrg);
          break;
        }
      }
    }
  }
  if (hubDrg && rects.has('cmp-network') && rects.has('drg')) {
    const current = positions.get(hubDrg.id)!;
    const drg = rects.get('drg')!;
    const candidate = { ...current, x: rects.get('cmp-network')!.x - hubDrg.width - 12, y: drg.y + drg.height + 12 };
    if (canPlace(candidate)) positions.set(hubDrg.id, candidate);
  }
  const spokeCards = tables.filter((table) => table.rtLayoutRole === 'spoke')
    .sort((a, b) => (spokePosition(a.id)?.y ?? 0) - (spokePosition(b.id)?.y ?? 0) || a.id.localeCompare(b.id));
  const pendingSpokeCards = new Set(spokeCards.map((table) => table.id));
  const groups = new Map<string, DiagramNode[]>();
  for (const table of spokeCards) {
    const desired = spokePosition(table.id);
    if (!desired?.environment) { pendingSpokeCards.delete(table.id); continue; }
    const key = `${desired.environment.id}:${desired.vcn.id}:${desired.x}`;
    groups.set(key, [...(groups.get(key) ?? []), table]);
  }
  for (const cards of groups.values()) {
    const first = spokePosition(cards[0].id)!;
    const environment = first.environment!;
    const top = environment.y + 56, bottom = environment.y + environment.height - 16;
    let remaining = [...cards], x = first.x;
    while (remaining.length) {
      let packed = false;
      for (let count = remaining.length; count > 0 && !packed; count--) {
        const batch = remaining.slice(0, count);
        const height = batch.reduce((sum, table) => sum + table.height + 12, -12);
        if (height > bottom - top) continue;
        const ownerAlignedY = batch.length > 1
          ? first.vcn.y + (first.vcn.height - height) / 2
          : spokePosition(batch[0].id)!.y;
        const preferred = Math.max(top, Math.min(bottom - height, ownerAlignedY));
        const starts = [...new Set([preferred, top, bottom - height,
          ...Array.from({ length: Math.ceil((bottom - top - height) / 12) + 1 }, (_, i) => top + i * 12)])]
          .filter((y) => y >= top && y + height <= bottom)
          .sort((a, b) => Math.abs(a - preferred) - Math.abs(b - preferred) || a - b);
        for (const table of batch) {
          const lanes = columnsFor(table.id);
          if (!lanes.includes(x)) lanes.push(x);
        }
        for (const start of starts) {
          let y = start;
          const candidates = batch.map((table) => {
            const candidate = { ...positions.get(table.id)!, x, y };
            y += table.height + 12;
            return candidate;
          });
          if (!candidates.every((candidate) => canPlace(candidate, pendingSpokeCards, true))) continue;
          for (const candidate of candidates) { positions.set(candidate.id, candidate); pendingSpokeCards.delete(candidate.id); }
          remaining = remaining.slice(count);
          packed = true;
          break;
        }
      }
      // A new right-hand column stays beside this environment, never in the next.
      x = Math.max(x + Math.max(...cards.map((table) => table.width)) + 24,
        packed ? -Infinity : global.right + 24);
      if (!packed && remaining[0].height > bottom - top) break;
    }
  }
  for (const table of tables.filter((table) => table.rtLayoutRole === 'spoke-drg')) {
    const drg = rects.get('drg');
    if (!drg) continue;
    const attachments = [...rects.values()].filter((rect) => rect.node.kind === 'attachment' && rect.node.parentId === drg.node.parentId);
    const top = Math.max(drg.y + drg.height, ...attachments.map((rect) => rect.y + rect.height)) + 36;
    const current = positions.get(table.id)!;
    for (let offset = 0; offset <= 240; offset += 12) {
      const candidate = { ...current, x: drg.x + drg.width + 24, y: top + offset };
      if (canPlace(candidate)) { positions.set(table.id, candidate); break; }
    }
  }
  const hubVcn = rects.get('hub-vcn');
  if (hubVcn) {
    const cards = tables.filter((table) => table.rtLayoutRole === 'hub-subnet')
      .sort((a, b) => positions.get(a.id)!.y - positions.get(b.id)!.y || a.id.localeCompare(b.id));
    for (const table of cards) {
      const current = positions.get(table.id)!;
      const x = hubVcn.x + hubVcn.width + ownerGap;
      // Prefer the shared column; slide down instead of creating another column.
      for (let offset = 0; offset <= 600; offset += 12) {
        const candidate = { ...current, x, y: current.y + offset };
        if (canPlace(candidate)) { positions.set(table.id, candidate); break; }
      }
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
