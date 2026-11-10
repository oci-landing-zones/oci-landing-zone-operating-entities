import { describe, expect, it, vi } from 'vitest';
import type { DiagramNode } from '../model/types';
import { absoluteNodeRects, clearRoutingSegment, createLocalFlowRouter, routeBetweenPoints, routeOrthogonalPoints } from './flowGeometry';

describe('shared orthogonal visibility router', () => {
  it('uses a nearby parallel lane to reduce avoidable collinear overlap', () => {
    const start = { x: 0, y: 0 }, end = { x: 200, y: 0 };
    const direct = routeOrthogonalPoints(new Map(), start, end, []);
    const routed = routeOrthogonalPoints(new Map(), start, end, [], undefined, [{ start, end }]);
    expect(direct).toEqual([start, end]);
    expect(routed[0]).toEqual(start);
    expect(routed.at(-1)).toEqual(end);
    expect(routed.some((p) => p.y !== 0)).toBe(true);
    expect(routed.slice(1).some((p, i) => p.y === 0 && routed[i].y === 0 && p.x !== routed[i].x)).toBe(false);
  });

  it('prefers an available detour to crossing an existing unrelated line', () => {
    const occupied = [{ start: { x: 100, y: -10 }, end: { x: 100, y: 10 } }];
    const routed = routeOrthogonalPoints(new Map(), { x: 0, y: 0 }, { x: 200, y: 0 }, [], undefined, occupied);
    expect(routed.some((p) => Math.abs(p.y) >= 18)).toBe(true);
    expect(routeOrthogonalPoints(new Map(), { x: 0, y: 0 }, { x: 200, y: 0 }, [], undefined, occupied)).toEqual(routed);
  });

  it('counts crossings on visibility-grid vertices and existing line corners', () => {
    for (const occupied of [
      [{ start: { x: 100, y: -10 }, end: { x: 100, y: 10 } }],
      [{ start: { x: 100, y: -10 }, end: { x: 100, y: 0 } }, { start: { x: 100, y: 0 }, end: { x: 120, y: 0 } }],
    ]) {
      const routed = routeOrthogonalPoints(new Map(), { x: 0, y: 0 }, { x: 200, y: 0 }, [], 100, occupied);
      expect(routed.some((p) => p.y !== 0)).toBe(true);
    }
  });

  it('keeps a DRG caption blocked even when routing through its owner is allowed', () => {
    const rects = absoluteNodeRects([{ id: 'router', kind: 'drg', label: 'DRG caption', x: 0, y: 0, width: 48, height: 48 }]);
    expect(clearRoutingSegment(rects, { x: 24, y: 48 }, { x: 24, y: 100 }, ['router'], 0)).toBe(false);
    expect(clearRoutingSegment(rects, { x: 0, y: 24 }, { x: -12, y: 24 }, ['router'], 0)).toBe(true);
  });

  it('uses a hoisted route marker physical owner for routing exclusions', () => {
    const rects = absoluteNodeRects([
      { id: 'tunnel', kind: 'vpntunnel', label: '', x: -600, y: 60, width: 500, height: 96 },
      { id: 'drg', kind: 'drg', label: '', x: 100, y: 76, width: 48, height: 48 },
      { id: 'dot', kind: 'rtdot', label: '', rtDotOwnerId: 'tunnel', rtDotPhysicalOwnerId: 'drg', x: 92, y: 92, width: 16, height: 16 },
    ]);
    expect(clearRoutingSegment(rects, { x: 98, y: 100 }, { x: 104, y: 100 }, ['dot'], 0)).toBe(true);
    expect(clearRoutingSegment(rects, { x: -200, y: 100 }, { x: -190, y: 100 }, ['dot'], 0)).toBe(false);
  });

  it('keeps a constrained prefix inside its allowed arrival corridor', () => {
    const path = routeOrthogonalPoints(new Map(), { x: 0, y: 0 }, { x: 200, y: 0 }, [], undefined,
      [{ start: { x: 100, y: -10 }, end: { x: 100, y: 10 } }], [], { left: -24, right: 200, top: 0, bottom: 0 });
    expect(path).toEqual([{ x: 0, y: 0 }, { x: 200, y: 0 }]);
    for (const bounds of [{ right: 100 }, { left: 300, right: 100 }, { top: Number.NaN }]) {
      expect(() => routeOrthogonalPoints(new Map(), { x: 0, y: 0 }, { x: 200, y: 0 }, [], undefined, [], [], bounds)).toThrow('bounds');
    }
  });

  it('respects terminal directions with a clear detour and keeps constrained fallbacks feasible', () => {
    const directions = { start: { x: 0, y: 1 }, end: { x: 0, y: 1 } };
    const path = routeOrthogonalPoints(new Map(), { x: 0, y: 0 }, { x: 0, y: -10 }, [], undefined, [], [], undefined, directions);
    expect(path.some((point) => point.x !== 0)).toBe(true);
    expect(path[1].y - path[0].y).toBeGreaterThanOrEqual(0);
    expect(path.at(-1)!.y - path.at(-2)!.y).toBeGreaterThanOrEqual(0);
    const constrained = routeOrthogonalPoints(new Map(), { x: 0, y: 0 }, { x: 10, y: 0 }, [], undefined, [], [],
      { left: 0, right: 10, top: 0, bottom: 0 }, { start: { x: -1, y: 0 }, end: { x: -1, y: 0 } });
    expect(constrained).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }]);
    expect(() => routeOrthogonalPoints(new Map(), { x: 0, y: 0 }, { x: 10, y: 0 }, [], undefined, [], [], undefined,
      { ...directions, end: { x: Number.NaN, y: 0 } })).toThrow('directions');
  });

  it('rejects non-finite geometry before starting its search', () => {
    expect(() => routeOrthogonalPoints(new Map(), { x: Number.NaN, y: 0 }, { x: 200, y: 0 }, [])).toThrow('Invalid');
  });

  it('uses a narrow obstacle-free corridor before allowing any resource intrusion', () => {
    const nodes: DiagramNode[] = [
      { id: 'upper', kind: 'resourcegroup', label: '', x: 50, y: -100, width: 100, height: 98 },
      { id: 'lower', kind: 'compartment', label: '', x: 50, y: 2, width: 100, height: 98 },
    ];
    const routed = routeOrthogonalPoints(absoluteNodeRects(nodes), { x: 60, y: 0 }, { x: 140, y: 0 }, []);
    expect(routed).toEqual([{ x: 60, y: 0 }, { x: 140, y: 0 }]);
  });
});

describe('local flow routing within one graph', () => {
  const obstacle = (): DiagramNode => ({ id: 'block', kind: 'resourcegroup', label: '', x: 40, y: -10, width: 20, height: 20 });

  it('reuses successful joins and starts fresh for new graph geometry', () => {
    let x = 40;
    const readX = vi.fn(() => x);
    const node = { ...obstacle(), get x() { return readX(); } };
    const nodes = [node];
    const route = createLocalFlowRouter(nodes);
    const start = { x: 0, y: 0 }, end = { x: 100, y: 0 };
    const original = route(start, end, []);
    const reads = readX.mock.calls.length;
    expect(reads).toBeGreaterThan(0);
    expect(route({ ...start }, { ...end }, [])).toEqual(original);
    expect(readX).toHaveBeenCalledTimes(reads);

    x = 200;
    const updated = createLocalFlowRouter(nodes)(start, end, []);
    expect(updated).toEqual(routeBetweenPoints(nodes, start, end, []));
    expect(updated).not.toEqual(original);
  });

  it('matches uncached routing for distinct endpoints, exclusions, lanes and owner ports', () => {
    const nodes: DiagramNode[] = [obstacle(), { id: 'owner', kind: 'gateway', label: '', x: -20, y: -20, width: 20, height: 40 }];
    const route = createLocalFlowRouter(nodes);
    const queries: Parameters<typeof route>[] = [
      [{ x: 0, y: 0 }, { x: 100, y: 0 }, ['owner']],
      [{ x: 0, y: 5 }, { x: 100, y: 0 }, ['owner']],
      [{ x: 0, y: 0 }, { x: 100, y: 5 }, ['owner']],
      [{ x: 0, y: 0 }, { x: 100, y: 0 }, ['owner', 'block']],
      [{ x: 0, y: 0 }, { x: 100, y: 0 }, ['owner'], 80],
      [{ x: 0, y: 0 }, { x: 100, y: 0 }, ['owner'], undefined, { startOwner: 'owner' }],
      [{ x: 100, y: 0 }, { x: 0, y: 0 }, ['owner'], undefined, { endOwner: 'owner' }],
    ];
    for (const query of queries) {
      const expected = routeBetweenPoints(nodes, ...query);
      expect(route(...query)).toEqual(expected);
      expect(route(...query)).toEqual(expected);
    }
  });

  it('keeps cached joins separate from caller-owned points and returned paths', () => {
    const route = createLocalFlowRouter([]);
    const start = { x: 0, y: 0 }, end = { x: 100, y: 0 };
    const expected = [{ ...start }, { ...end }];
    const first = route(start, end, []);
    start.x = -100;
    first.at(-1)!.x = 500;
    first.push({ x: 600, y: 0 });
    const cached = route(expected[0], expected[1], []);
    expect(cached).toEqual(expected);
    cached[0].y = 50;
    expect(route(expected[0], expected[1], [])).toEqual(expected);
  });

  it('does not let a cached default lane bypass invalid geometry errors', () => {
    const route = createLocalFlowRouter([]);
    const start = { x: 0, y: 0 }, end = { x: 100, y: 0 };
    route(start, end, []);
    for (const lane of [Number.NaN, Infinity, -Infinity]) {
      expect(() => route(start, end, [], lane)).toThrow('Invalid diagram connection geometry');
      expect(() => route(start, end, [], lane)).toThrow('Invalid diagram connection geometry');
    }
    expect(() => route({ x: Number.NaN, y: 0 }, end, [])).toThrow('Invalid diagram connection geometry');
  });

  it('keeps exceptional coordinates distinct before owner-port routing and validation', () => {
    const nodes: DiagramNode[] = [{ id: 'owner', kind: 'gateway', label: '', x: 0, y: -10, width: 20, height: 20 }];
    const route = createLocalFlowRouter(nodes);
    const end = { x: 100, y: 0 }, ports = { startOwner: 'owner' };
    expect(route({ x: Infinity, y: 0 }, end, ['owner'], undefined, ports))
      .toEqual(routeBetweenPoints(nodes, { x: Infinity, y: 0 }, end, ['owner'], undefined, ports));
    expect(() => route({ x: Number.NaN, y: 0 }, end, ['owner'], undefined, ports)).toThrow('Invalid');

    const empty = createLocalFlowRouter([]);
    empty({ x: 0, y: 0 }, end, []);
    expect(empty({ x: 0, y: -0 }, end, [])).toEqual(routeBetweenPoints([], { x: 0, y: -0 }, end, []));
  });
});
