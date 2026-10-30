import { tableAssociations } from './tablePlacement';
import type { DiagramEdge, DiagramModel, DiagramNode } from '../model/types';
import type { GeneratedResourceInventory } from '../services/generatedResources';
import type { RouteTable } from '../services/routeTables';
import { absoluteNodeRects } from './flowGeometry';
import { associationDisplaySegments, routeStructuralEdges, tableSourceAnchors } from './displayGeometry';
import { createFlowPlayback, flowHopMarkers, pointAtDistance } from './flowPlayback';
import { attachmentLabelLayout, DIAGRAM_LAYOUT, drgCaptionBounds, minimumOwnerWidths } from './layoutPolicy';
import { resourceGroupLayout } from './resourceGroups';
import { compartmentStyle } from './compartmentStyle';
import { oracle } from '../theme';

export interface LayoutIssue { code: string; nodeIds: string[]; message: string }
interface LayoutContext {
  physicalPaths?: Record<string, { x: number; y: number }[]>;
  inventory?: GeneratedResourceInventory;
  routeTables?: RouteTable[];
  foundation?: boolean;
  showRouteTables?: boolean;
}
const EPS = 0.01;
const overlay = (node: DiagramNode) => node.kind === 'rtdot';
const physicalOwner = (node?: DiagramNode) => node?.rtDotPhysicalOwnerId ?? node?.rtDotOwnerId;
const compartment = (node: DiagramNode) => ['compartment', 'project', 'landingzone', 'tenancy'].includes(node.kind);
const samePoint = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS;
const segmentEntersBox = (a: { x: number; y: number }, b: { x: number; y: number }, box: { x: number; y: number; width: number; height: number }) => {
  if (Math.abs(a.y - b.y) < EPS) return a.y > box.y + EPS && a.y < box.y + box.height - EPS
    && Math.min(Math.max(a.x, b.x), box.x + box.width) - Math.max(Math.min(a.x, b.x), box.x) > EPS;
  if (Math.abs(a.x - b.x) < EPS) return a.x > box.x + EPS && a.x < box.x + box.width - EPS
    && Math.min(Math.max(a.y, b.y), box.y + box.height) - Math.max(Math.min(a.y, b.y), box.y) > EPS;
  // Separating axes measure slanted segments independently of the router's clipping test.
  const dx = b.x - a.x, dy = b.y - a.y;
  const x = (a.x + b.x) / 2 - box.x - box.width / 2, y = (a.y + b.y) / 2 - box.y - box.height / 2;
  const w = Math.max(0, box.width / 2 - EPS), h = Math.max(0, box.height / 2 - EPS);
  return Math.abs(x) < w + Math.abs(dx) / 2 && Math.abs(y) < h + Math.abs(dy) / 2
    && Math.abs(x * dy - y * dx) < w * Math.abs(dy) + h * Math.abs(dx);
};

/** Independent measurement; constrained diagrams may retain unavoidable intersections. */
export function structuralCrossings(diagram: DiagramModel, options: { includeOwnerBodies?: boolean } = {}): { edgeId: string; nodeId: string }[] {
  const rects = absoluteNodeRects(diagram.nodes);
  const byId = new Map(diagram.nodes.map((node) => [node.id, node]));
  const crossings: { edgeId: string; nodeId: string }[] = [];
  for (const edge of diagram.edges.filter((entry) => !entry.waypoints)) {
    const endpoints = new Set([edge.source, edge.target]);
    for (const id of [edge.source, edge.target]) {
      const owner = physicalOwner(byId.get(id));
      if (owner) endpoints.add(owner);
    }
    const allowed = new Set<string>();
    for (const id of endpoints) {
      let node = byId.get(id);
      while (node && !allowed.has(node.id)) {
        allowed.add(node.id);
        node = node.parentId ? byId.get(node.parentId) : undefined;
      }
    }
    if (options.includeOwnerBodies) for (const id of [edge.source, edge.target]) {
      const owner = physicalOwner(byId.get(id));
      if (owner) allowed.delete(owner);
    }
    const points = edge.points ?? [];
    for (const box of rects.values()) {
      const owner = physicalOwner(box.node);
      if (allowed.has(box.id) || owner && endpoints.has(owner)) continue;
      if (points.slice(1).some((point, index) => segmentEntersBox(points[index], point, box))) crossings.push({ edgeId: edge.id, nodeId: box.id });
    }
  }
  return crossings;
}

/** Counts line contacts independently of the router's congestion costs. */
export function structuralLineContacts(diagram: DiagramModel): { edgeIds: [string, string]; x: number; y: number }[] {
  const rects = absoluteNodeRects(diagram.nodes);
  const edges = diagram.edges.filter((edge) => !edge.waypoints);
  const displayed = associationDisplaySegments(diagram.nodes, edges);
  const contacts = new Map<string, { edgeIds: [string, string]; x: number; y: number }>();
  const segments = (edge: typeof edges[number]) => (displayed.get(edge.id) ?? [edge.points ?? []])
    .flatMap((path) => path.slice(1).map((point, index) => [path[index], point] as const));
  const owners = (edge: typeof edges[number]) => [edge.source, edge.target].map((id) => physicalOwner(rects.get(id)?.node) ?? id);
  const terminal = (edge: typeof edges[number], point: { x: number; y: number }) =>
    !!edge.points?.length && (samePoint(edge.points[0], point) || samePoint(edge.points.at(-1)!, point));
  const portJunction = (annotation: typeof edges[number], physical: typeof edges[number], point: { x: number; y: number }) => {
    if (!displayed.has(annotation.id) || displayed.has(physical.id)) return false;
    const owner = physicalOwner(rects.get(annotation.source)?.node);
    if (!owner || physical.source !== owner && physical.target !== owner) return false;
    const start = annotation.points?.[0], end = annotation.points?.find((candidate) => start && !samePoint(candidate, start));
    if (!start || !end) return false;
    const dx = end.x - start.x, dy = end.y - start.y;
    const outward = annotation.sourceSide === 'left' ? Math.abs(dy) < EPS && dx < 0
      : annotation.sourceSide === 'right' ? Math.abs(dy) < EPS && dx > 0
        : annotation.sourceSide === 'top' ? Math.abs(dx) < EPS && dy < 0
          : annotation.sourceSide === 'bottom' ? Math.abs(dx) < EPS && dy > 0 : false;
    return outward && point.x >= Math.min(start.x, end.x) - EPS && point.x <= Math.max(start.x, end.x) + EPS
      && point.y >= Math.min(start.y, end.y) - EPS && point.y <= Math.max(start.y, end.y) + EPS;
  };
  for (let i = 0; i < edges.length; i++) for (let j = i + 1; j < edges.length; j++) {
    const a = edges[i], b = edges[j];
    const shared = owners(a).filter((id) => owners(b).includes(id));
    for (const [aa, ab] of segments(a)) for (const [ba, bb] of segments(b)) {
      if (samePoint(aa, ab) || samePoint(ba, bb)) continue;
      let point: { x: number; y: number };
      const ax = ab.x - aa.x, ay = ab.y - aa.y, bx = bb.x - ba.x, by = bb.y - ba.y;
      if (Math.abs(ax) >= EPS && Math.abs(ay) >= EPS || Math.abs(bx) >= EPS && Math.abs(by) >= EPS) {
        const cross = ax * by - ay * bx;
        if (Math.abs(cross) < 1e-9) continue;
        const t = ((ba.x - aa.x) * by - (ba.y - aa.y) * bx) / cross;
        const u = ((ba.x - aa.x) * ay - (ba.y - aa.y) * ax) / cross;
        if (t < -1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9) continue;
        point = { x: aa.x + t * ax, y: aa.y + t * ay };
      } else {
        const ah = Math.abs(ay) < EPS, bh = Math.abs(by) < EPS;
        if (ah === bh) continue;
        const [ha, hb, va, vb] = ah ? [aa, ab, ba, bb] : [ba, bb, aa, ab];
        point = { x: va.x, y: ha.y };
        if (point.x < Math.min(ha.x, hb.x) - EPS || point.x > Math.max(ha.x, hb.x) + EPS
          || point.y < Math.min(va.y, vb.y) - EPS || point.y > Math.max(va.y, vb.y) + EPS) continue;
      }
      if (a.target === b.target && displayed.has(a.id) && displayed.has(b.id)) continue;
      if (portJunction(a, b, point) || portJunction(b, a, point)) continue;
      const junction = terminal(a, point) && terminal(b, point) && shared.some((id) => {
        const rect = rects.get(id);
        return rect && point.x >= rect.x - EPS && point.x <= rect.x + rect.width + EPS
          && point.y >= rect.y - EPS && point.y <= rect.y + rect.height + EPS;
      });
      if (junction) continue;
      const edgeIds: [string, string] = [a.id, b.id].sort() as [string, string];
      contacts.set(JSON.stringify([edgeIds, point.x.toFixed(3), point.y.toFixed(3)]), { edgeIds, ...point });
    }
  }
  return [...contacts.values()];
}

/** Positive shared spans can visually merge separate physical OCI connections. */
export function physicalSharedSegments(diagram: DiagramModel): { edgeIds: [string, string]; length: number }[] {
  const nodes = new Map(diagram.nodes.map((node) => [node.id, node]));
  const edges = diagram.edges.filter((edge) => !edge.waypoints && nodes.get(edge.source)?.kind !== 'rtdot' && nodes.get(edge.target)?.kind !== 'routetable');
  return sharedSegments(edges);
}

export function annotationSharedSegments(diagram: DiagramModel): { edgeIds: [string, string]; length: number }[] {
  const nodes = new Map(diagram.nodes.map((node) => [node.id, node]));
  const edges = diagram.edges.filter((edge) => !edge.waypoints && nodes.get(edge.source)?.kind === 'rtdot' && nodes.get(edge.target)?.kind === 'routetable');
  return sharedSegments(edges, (a, b) => a.target !== b.target);
}

function sharedSegments(edges: DiagramEdge[], include: (a: DiagramEdge, b: DiagramEdge) => boolean = () => true): { edgeIds: [string, string]; length: number }[] {
  const shared: { edgeIds: [string, string]; length: number }[] = [];
  for (let i = 0; i < edges.length; i++) for (let j = i + 1; j < edges.length; j++) {
    const a = edges[i], b = edges[j], spans = new Map<string, [number, number][]>();
    if (!include(a, b)) continue;
    for (let s = 1; s < (a.points?.length ?? 0); s++) for (let t = 1; t < (b.points?.length ?? 0); t++) {
      const aa = a.points![s - 1], ab = a.points![s], ba = b.points![t - 1], bb = b.points![t];
      const al = Math.hypot(ab.x - aa.x, ab.y - aa.y), bl = Math.hypot(bb.x - ba.x, bb.y - ba.y);
      if (al < EPS || bl < EPS) continue;
      const sign = ab.x > aa.x || ab.x === aa.x && ab.y > aa.y ? 1 : -1;
      const x = (ab.x - aa.x) / al * sign, y = (ab.y - aa.y) / al * sign;
      if (Math.abs(x * (bb.y - ba.y) - y * (bb.x - ba.x)) > 1e-9 * bl
        || Math.abs(x * (ba.y - aa.y) - y * (ba.x - aa.x)) > EPS) continue;
      const at = (p: { x: number; y: number }) => p.x * x + p.y * y;
      const low = Math.max(Math.min(at(aa), at(ab)), Math.min(at(ba), at(bb)));
      const high = Math.min(Math.max(at(aa), at(ab)), Math.max(at(ba), at(bb)));
      if (high - low <= EPS) continue;
      const key = `${x.toFixed(9)}:${y.toFixed(9)}:${(x * aa.y - y * aa.x).toFixed(3)}`;
      spans.set(key, [...(spans.get(key) ?? []), [low, high]]);
    }
    let length = 0;
    for (const intervals of spans.values()) {
      intervals.sort((a, b) => a[0] - b[0]);
      let end = -Infinity;
      for (const [low, high] of intervals) { length += Math.max(0, high - Math.max(low, end)); end = Math.max(end, high); }
    }
    if (length > EPS) shared.push({ edgeIds: [a.id, b.id], length });
  }
  return shared;
}

/** Geometry and source contracts checked by the default test suite, without browser measurements. */
export function validateDiagramLayout(diagram: DiagramModel, context: LayoutContext = {}): LayoutIssue[] {
  const issues: LayoutIssue[] = [];
  const issue = (code: string, nodes: string[], message: string) => { issues.push({ code, nodeIds: nodes, message }); };
  if (diagram.flowErrors?.length) issue('flow-resolution', [], 'Selected flow geometry must not be dropped or left unresolved.');
  const byId = new Map<string, DiagramNode>();
  for (const node of diagram.nodes) {
    if (byId.has(node.id)) issue('identity', [node.id], 'Diagram node IDs must be unique.');
    byId.set(node.id, node);
    if (![node.x, node.y, node.width, node.height].every(Number.isFinite) || node.width <= 0 || node.height <= 0) {
      issue('geometry', [node.id], 'Node coordinates must be finite and dimensions positive.');
    }
  }
  for (const node of diagram.nodes) {
    let parentId = node.parentId;
    const seen = new Set([node.id]);
    while (parentId) {
      if (seen.has(parentId)) { issue('ancestry', [node.id, parentId], 'Diagram parents must be acyclic.'); break; }
      seen.add(parentId);
      const parent = byId.get(parentId);
      if (!parent) { issue('ancestry', [node.id, parentId], 'Every diagram parent must exist.'); break; }
      parentId = parent.parentId;
    }
  }
  if (issues.some((entry) => ['geometry', 'identity', 'ancestry'].includes(entry.code))) return issues;
  for (const node of diagram.nodes.filter((entry) => entry.kind === 'attachment')) {
    if (node.width + EPS < attachmentLabelLayout(node.label).width) issue('attachment-text', [node.id], 'Attachment pills must fit the full label and reserved terminal padding.');
  }
  const edgesById = new Map(diagram.edges.map((edge) => [edge.id, edge]));
  const fanLink = (id: string) => {
    const edge = edgesById.get(id)!;
    return [byId.get(edge.source)?.kind, byId.get(edge.target)?.kind].sort().join(':') === 'attachment:drg';
  };
  for (const span of physicalSharedSegments(diagram)) if (span.edgeIds.every(fanLink)) {
    issue('physical-merge', span.edgeIds, 'Separate DRG attachment connections must not share a positive-length physical trunk.');
  }

  const children = new Map<string, DiagramNode[]>();
  for (const node of diagram.nodes) {
    if (!node.parentId) continue;
    const siblings = children.get(node.parentId) ?? [];
    siblings.push(node);
    children.set(node.parentId, siblings);
    const parent = byId.get(node.parentId)!;
    if (overlay(node)) continue;
    const boundaryGateway = node.kind === 'gateway' && parent.kind === 'vcn' && Math.abs(node.x + node.width / 2) < EPS;
    if ((!boundaryGateway && node.x < -EPS) || node.y < -EPS || node.x + node.width > parent.width + EPS || node.y + node.height > parent.height + EPS) {
      issue('containment', [node.id, parent.id], 'Children must fit their parent; gateway icons may straddle the left VCN boundary.');
    }
    if (node.kind !== 'gateway' && node.y < 30 - EPS) issue('heading-clearance', [node.id, parent.id], 'Child content must clear the parent heading.');
  }
  for (const [parentId, allChildren] of children) {
    const siblings = allChildren.filter((node) => !overlay(node));
    const resourceColumns = new Map<number, DiagramNode[]>();
    for (const node of siblings.filter((entry) => entry.kind === 'resourcegroup')) {
      const x = Math.round(node.x / EPS);
      resourceColumns.set(x, [...(resourceColumns.get(x) ?? []), node]);
    }
    for (const column of resourceColumns.values()) {
      column.sort((a, b) => a.y - b.y);
      for (let index = 1; index < column.length; index++) {
        const previous = column[index - 1], current = column[index];
        if (Math.abs(current.y - previous.y - previous.height - DIAGRAM_LAYOUT.gap) > EPS) {
          issue('resource-column-gap', [previous.id, current.id], 'Resource columns must use compact content-based gaps rather than row-height gaps.');
        }
      }
    }
    for (let i = 0; i < siblings.length; i++) for (let j = i + 1; j < siblings.length; j++) {
      const a = siblings[i], b = siblings[j];
      if (Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > EPS
        && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > EPS) {
        issue('sibling-overlap', [a.id, b.id], 'Peer nodes must not overlap.');
      }
    }
    const parent = byId.get(parentId)!;
    if (['compartment', 'project'].includes(parent.kind) && siblings.length) {
      const bottom = Math.max(...siblings.map((node) => node.y + node.height));
      const captionSpace = siblings.some((node) => node.kind === 'drg') ? 18 : 0;
      if (parent.height - bottom > 2 * DIAGRAM_LAYOUT.padding + captionSpace + EPS) {
        issue('compact-height', [parent.id], 'Compartment height must follow its content rather than unrelated rows.');
      }
    }
  }

  const shared = ['cmp-network', 'cmp-security', 'cmp-platform'].flatMap((id) => byId.get(id) ? [byId.get(id)!] : []);
  if (shared.length && (shared.length !== 3 || shared.some((node) => Math.abs(node.width - shared[0].width) > EPS))) {
    issue('shared-width', shared.map((node) => node.id), 'Shared network, security and platform compartments must have one column width.');
  }
  if (shared.some((node) => Math.abs(node.x - shared[0].x) > EPS)) {
    issue('shared-alignment', shared.map((node) => node.id), 'Shared compartments must align on one left edge.');
  }
  for (const node of shared) if (node.compartmentScope !== 'shared' || compartmentStyle(node).fill !== oracle.compYellowFill) {
    issue('compartment-palette', [node.id], 'Shared compartments must use the common shared palette and scope.');
  }
  for (const node of diagram.nodes.filter((entry) => entry.kind === 'compartment' && entry.tone === 'yellow')) {
    let parent = node;
    let environment = false;
    while (parent.parentId) {
      if (/^cmp-env-\d+$/.test(parent.id)) environment = true;
      parent = byId.get(parent.parentId)!;
    }
    if (environment && (node.compartmentScope !== 'environment' || compartmentStyle(node).fill !== oracle.compEnvironmentFill)) {
      issue('compartment-palette', [node.id], 'Yellow environment compartments must retain their ancestry-specific palette.');
    }
  }
  const environments = diagram.nodes.filter((node) => /^cmp-env-\d+$/.test(node.id));
  if (environments.some((node) => Math.abs(node.width - environments[0].width) > EPS)) {
    issue('environment-width', environments.map((node) => node.id), 'Environment cards in one layout must share a readable width.');
  }
  if (environments.length && shared.length && Math.abs(Math.min(...shared.map((node) => node.y)) - Math.min(...environments.map((node) => node.y))) > EPS) {
    issue('section-alignment', [...shared, ...environments].map((node) => node.id), 'Shared and environment sections must align at the top.');
  }
  if (context.foundation && environments.length) {
    const readableCard = 4 * DIAGRAM_LAYOUT.padding + 2 * DIAGRAM_LAYOUT.resourceMinWidth + DIAGRAM_LAYOUT.gap;
    for (const env of environments) if (env.width + EPS < readableCard) {
      issue('foundation-readability', [env.id], 'Foundation environment cards must reserve two readable resource columns plus nesting padding.');
    }
    if (environments.length >= 2) {
      if (environments.some((node) => Math.abs(node.x - environments[0].x) > EPS)) {
        issue('foundation-column', environments.map((node) => node.id), 'Foundation environments must form one aligned vertical column.');
      }
      for (let index = 1; index < environments.length; index++) {
        const previous = environments[index - 1], current = environments[index];
        if (Math.abs(current.y - previous.y - previous.height - DIAGRAM_LAYOUT.gap) > EPS) {
          issue('foundation-gap', [previous.id, current.id], 'Foundation environments must stack in order with compact gaps and their actual content heights.');
        }
      }
    }
  }
  for (const node of diagram.nodes.filter((entry) => entry.kind === 'resourcegroup')) {
    if (!node.resourceKind || !node.resourceItems) { issue('resource-content', [node.id], 'Resource blocks need their generated kind and items.'); continue; }
    if (node.width + EPS < DIAGRAM_LAYOUT.resourceMinWidth) issue('resource-readability', [node.id], 'Resource blocks must preserve the minimum readable column width.');
    const measured = resourceGroupLayout(node.resourceKind, node.resourceItems, node.width);
    if (Math.abs(node.height - measured.height) > EPS) issue('resource-height', [node.id], 'Resource block height must equal its shared rendered extent.');
    if (Math.abs((measured.headingYs[0] + measured.headingYs.at(-1)!) / 2 - measured.headerCenter) > EPS
      || Math.abs(measured.iconY + 12 - measured.headerCenter) > EPS
      || measured.bodyTop <= measured.headingYs.at(-1)! + 12) {
      issue('resource-heading', [node.id], 'Resource icon, complete heading block and list must share the measured alignment.');
    }
    if (measured.rows.some((row, index) => row.lines.join('') !== node.resourceItems![index].name)) {
      issue('resource-content', [node.id], 'Wrapping must preserve every generated resource name.');
    }
  }

  if (context.inventory) {
    const metadata = new Map(context.inventory.compartments.map((entry) => [entry.key, entry]));
    const owners = new Map<string, DiagramNode>();
    const resolveOwner = (key: string, seen = new Set<string>()): DiagramNode | undefined => {
      if (owners.has(key)) return owners.get(key);
      const source = metadata.get(key);
      if (!source || seen.has(key)) return undefined;
      const parent = source.parentKey ? resolveOwner(source.parentKey, new Set([...seen, key])) : undefined;
      if (source.parentKey && !parent) return undefined;
      const matches = diagram.nodes.filter((node) => compartment(node) && node.label === source.name
        && (parent ? node.parentId === parent.id : node.kind === 'tenancy'));
      if (matches.length !== 1) return undefined;
      owners.set(key, matches[0]);
      return matches[0];
    };
    const expected = context.inventory.groups.filter((group) => group.items.length);
    const actual = diagram.nodes.filter((node) => node.kind === 'resourcegroup');
    if (actual.length !== expected.length) issue('inventory', actual.map((node) => node.id), 'Every generated resource group must appear exactly once.');
    for (const group of expected) {
      const node = byId.get(`resource-${group.id}`);
      const owner = resolveOwner(group.compartmentKey);
      const items = (value: { key: string; name: string }[]) => value.map((item) => JSON.stringify([item.key, item.name])).sort();
      if (!node || !owner || node.parentId !== owner.id || node.resourceKind !== group.kind
        || JSON.stringify(items(node.resourceItems ?? [])) !== JSON.stringify(items(group.items))) {
        issue('inventory', [node?.id ?? `resource-${group.id}`], 'Generated resource keys, names and actual compartment ownership must be preserved.');
      }
    }
    try {
      for (const [key, minimum] of minimumOwnerWidths(context.inventory)) {
        const owner = resolveOwner(key);
        if (owner && owner.width + EPS < minimum) issue('owner-readability', [owner.id], 'Resource owners must reserve readable descendant columns before placement.');
      }
    } catch { issue('inventory-ancestry', [], 'Generated owner ancestry must be complete and acyclic.'); }
  }

  if (context.showRouteTables && context.routeTables) {
    const actual = diagram.nodes.filter((node) => node.kind === 'routetable');
    if (actual.length !== context.routeTables.length) issue('routing-inventory', actual.map((node) => node.id), 'All generated route tables must remain visible in routing mode.');
    for (const table of context.routeTables) {
      const node = byId.get(table.id);
      if (!node || JSON.stringify(node.rtRows) !== JSON.stringify(table.rules.map((rule) => ({ id: rule.id, destination: rule.destination, targetType: rule.targetType, target: rule.target, routeType: rule.routeType, superseded: rule.superseded })))) {
        issue('routing-inventory', [table.id], 'Displayed route tables must retain all canonical rules.');
      }
      const dots = diagram.nodes.filter((entry) => entry.kind === 'rtdot' && entry.rtDotTableId === table.id);
      const expectedOwners = table.associations.filter((association) => byId.has(association.nodeId)).map((association) => association.nodeId).sort();
      const actualOwners = dots.map((dot) => dot.rtDotOwnerId).sort();
      if (JSON.stringify(actualOwners) !== JSON.stringify(expectedOwners)) {
        issue('association-inventory', [table.id], 'Every canonical association must retain its actual owner dot, including shared-table associations.');
      }
      for (const dot of dots) {
        const leaders = diagram.edges.filter((edge) => !edge.waypoints && edge.source === dot.id && edge.target === table.id);
        if (leaders.length !== 1) issue('association-inventory', [dot.id, table.id], 'Each table association must retain exactly one complete logical leader.');
      }
    }
  }
  const dangling = diagram.edges.filter((edge) => !byId.has(edge.source) || !byId.has(edge.target));
  for (const edge of dangling) issue('edge-identity', [edge.source, edge.target], 'Edge endpoints must exist.');
  if (dangling.length) return issues;
  const rects = absoluteNodeRects(diagram.nodes);
  const captions = [...rects.values()].filter((rect) => rect.node.kind === 'drg' && rect.node.label)
    .map((rect) => ({ id: rect.id, parentId: rect.node.parentId, ...drgCaptionBounds({ ...rect, label: rect.node.label }) }));
  for (const caption of captions) {
    const parent = caption.parentId ? rects.get(caption.parentId) : undefined;
    if (parent && (caption.x < parent.x - EPS || caption.y < parent.y - EPS
      || caption.x + caption.width > parent.x + parent.width + EPS || caption.y + caption.height > parent.y + parent.height + EPS)) {
      issue('drg-caption', [caption.id, parent.id], 'The complete DRG caption must fit its compartment footprint.');
    }
  }
  const tableEntries = new Map<string, { x: number; y: number }>();
  for (const edge of diagram.edges.filter((entry) => !entry.waypoints
    && byId.get(entry.source)?.kind === 'rtdot' && byId.get(entry.target)?.kind === 'routetable')) {
    const entry = edge.points!.at(-1)!;
    const table = rects.get(edge.target)!;
    const inside = entry && entry.x >= table.x - EPS && entry.x <= table.x + table.width + EPS
      && entry.y >= table.y - EPS && entry.y <= table.y + table.height + EPS;
    const border = entry && (Math.abs(entry.x - table.x) < EPS || Math.abs(entry.x - table.x - table.width) < EPS
      || Math.abs(entry.y - table.y) < EPS || Math.abs(entry.y - table.y - table.height) < EPS);
    if (!inside || !border) {
      issue('annotation-junction', [edge.id, edge.target], 'A table leader must end at its card boundary.');
    }
    if (tableEntries.has(edge.target) && !samePoint(tableEntries.get(edge.target)!, entry)) {
      issue('annotation-junction', [edge.id, edge.target], 'Table associations must meet their table at one common entry.');
    }
    tableEntries.set(edge.target, entry);
  }
  for (const overlap of annotationSharedSegments(diagram)) {
    issue('annotation-junction', overlap.edgeIds, 'Leaders for different tables must not share a visible segment.');
  }
  const structural = routeStructuralEdges(diagram.nodes, diagram.edges.filter((edge) => !edge.waypoints)
    .map((edge) => ({ ...edge, points: undefined })));
  const direct = new Set(diagram.edges.filter((edge) => edge.centerX == null && byId.get(edge.source)?.kind === 'rtdot' && byId.get(edge.target)?.kind === 'routetable').map((edge) => edge.id));
  const directPaths = new Map(tableAssociations(diagram.nodes, tableSourceAnchors(diagram.nodes, structural)).map((edge) => [edge.id, edge]));
  const canonical = new Map(structural.map((edge) => direct.has(edge.id) ? directPaths.get(edge.id)! : edge)
    .map((edge) => [edge.id, edge.points ?? []]));
  for (const [id, path] of Object.entries(context.physicalPaths ?? {})) canonical.set(id, path);
  for (const edge of diagram.edges) {
    const points = edge.points ?? [];
    const directLeader = direct.has(edge.id);
    if (points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))
      || !directLeader && points.slice(1).some((point, index) => Math.abs(point.x - points[index].x) > EPS && Math.abs(point.y - points[index].y) > EPS)) {
      issue('edge-geometry', [edge.id], 'Routing paths must be finite; physical and packet paths stay orthogonal.');
    }
    if (!edge.waypoints) {
      for (const caption of captions) if (!directLeader && points.slice(1).some((point, index) => segmentEntersBox(points[index], point, caption))) {
        issue('drg-caption', [edge.id, caption.id], 'Connection paths must avoid the DRG caption, including when the DRG is their endpoint.');
      }
      for (const box of rects.values()) if (!directLeader && box.node.kind === 'routetable'
        && points.slice(1).some((point, index) => segmentEntersBox(points[index], point, box))) {
        issue('table-interior', [edge.id, box.id], 'Connector paths must stop at a table boundary without entering any table body.');
      }
      const canonicalPath = canonical.get(edge.id) ?? [];
      const expected = !directLeader && !context.physicalPaths
        ? [canonicalPath[0], canonicalPath.at(-1)].filter((point) => point != null) : canonicalPath;
      const actual = !directLeader && !context.physicalPaths ? [points[0], points.at(-1)].filter((point) => point != null) : points;
      if (points.length < 2 || actual.length !== expected.length || actual.some((point, index) => !samePoint(point, expected[index]))) {
        issue('structural-path', [edge.id], 'Stored connector geometry must use the shared renderer and export router.');
      }
      continue;
    }
    const playback = createFlowPlayback(edge);
    if (!playback.valid) { issue('flow-anchor', [edge.id], 'Packet stops and numbered markers must have one valid ordered anchor source.'); continue; }
    const belongsTo = (id: string, ancestor: string): boolean => {
      let current = byId.get(id);
      while (current) {
        if (current.id === ancestor) return true;
        current = current.parentId ? byId.get(current.parentId) : undefined;
      }
      return false;
    };
    for (const connection of diagram.edges.filter((candidate) => !candidate.waypoints
      && (['attachment', 'vpn', 'vpntunnel', 'fastconnect', 'customerrouter'].includes(byId.get(candidate.source)?.kind ?? '') || byId.get(candidate.target)?.kind === 'attachment'))) {
      const used = edge.waypoints.some((node, index) => {
        const next = edge.waypoints![index + 1];
        return next && ((node === connection.source && next === connection.target) || (node === connection.target && next === connection.source)
          || (byId.get(connection.source)?.kind === 'vcn' && ((belongsTo(node, connection.source) && next === connection.target)
            || (node === connection.target && belongsTo(next, connection.source)))));
      });
      if (!used) continue;
      const physical = context.physicalPaths?.[connection.id] ?? connection.points ?? canonical.get(connection.id) ?? [];
      const includes = (line: typeof points) => points.some((_, index) => line.every((point, offset) => points[index + offset] && samePoint(point, points[index + offset])));
      if (!includes(physical) && !includes([...physical].reverse())) issue('flow-connection', [edge.id, connection.id], 'Packet paths must reuse the complete physical attachment connection.');
    }
    for (const marker of flowHopMarkers({ ...edge, showHopMarkers: true })) {
      const hop = edge.flowHops![marker.seq - 1];
      const stop = playback.stops[marker.seq - 1];
      if (!samePoint(marker, pointAtDistance(points, stop.distance))) issue('flow-anchor', [edge.id], 'Packet stops must coincide with numbered markers.');
      if (!hop.tableId) continue;
      const dot = marker.anchorId ? rects.get(marker.anchorId) : undefined;
      if (!dot || dot.node.kind !== 'rtdot' || dot.node.rtDotTableId !== hop.tableId || dot.node.rtDotOwnerId !== hop.tableOwner
        || !samePoint(marker, { x: dot.x + dot.width / 2, y: dot.y + dot.height / 2 })) {
        issue('flow-anchor', [edge.id, hop.node], 'Routing markers must use the exact dot for their canonical table and owner.');
      }
    }
  }
  return issues;
}
