import { describe, expect, it } from 'vitest';
import { badgeSlots, flowGroup, fractionNearest, labelAnchor, laneOffsets, marksAlong, offsetPolyline } from './flowOverlayGeometry';

describe('flowGroup', () => {
  it('reduces every trace id form to its flow', () => {
    expect(flowGroup('prod:egress#0')).toBe('prod:egress');
    expect(flowGroup('prod:egress:web#0')).toBe('prod:egress');
    expect(flowGroup('prod>preprod:east-west:db#2')).toBe('prod>preprod:east-west');
  });
});

describe('laneOffsets', () => {
  it('keeps a single flow on the route and centres several around it', () => {
    expect([...laneOffsets(['a']).values()]).toEqual([0]);
    expect([...laneOffsets(['a', 'b', 'a']).values()]).toEqual([-3.5, 3.5]);
    expect([...laneOffsets(['a', 'b', 'c']).values()]).toEqual([-7, 0, 7]);
  });
});

describe('offsetPolyline', () => {
  it('shifts an L-shaped route and keeps the corner square', () => {
    // East, then south. Left of eastward travel is -y; left of southward travel is +x.
    const out = offsetPolyline([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], 2);
    expect(out).toEqual([{ x: 0, y: -2 }, { x: 12, y: -2 }, { x: 12, y: 10 }]);
  });

  it('survives duplicate points and a leg that doubles back', () => {
    const out = offsetPolyline([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 0 }], 2);
    expect(out).toHaveLength(3);
    expect(out.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
  });

  it('returns the route unchanged for a zero offset', () => {
    const pts = [{ x: 0, y: 0 }, { x: 5, y: 5 }];
    expect(offsetPolyline(pts, 0)).toEqual(pts);
  });
});

describe('fractionNearest', () => {
  it('places a hop at its distance along the route', () => {
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 30 }];
    expect(fractionNearest(pts, { x: 11, y: 1 })).toBe(0.25);
    expect(fractionNearest(pts, { x: 10, y: 29 })).toBe(1);
  });
});

describe('marksAlong', () => {
  it('spaces direction marks evenly, heading the way the route travels', () => {
    const marks = marksAlong([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }], 50);
    expect(marks.map((m) => [m.x, m.y, m.angle])).toEqual([[25, 0, 0], [75, 0, 0], [100, 25, 90], [100, 75, 90]]);
  });

  it('leaves short routes unmarked', () => {
    expect(marksAlong([{ x: 0, y: 0 }, { x: 30, y: 0 }], 50)).toEqual([]);
  });
});

describe('labelAnchor', () => {
  it('centres the label on the first horizontal leg that fits it', () => {
    const pts = [{ x: 0, y: 0 }, { x: 0, y: 200 }, { x: 300, y: 200 }];
    expect(labelAnchor(pts, 100)).toEqual({ x: 150, y: 200 });
  });

  it('falls back to a long vertical leg, then to the source', () => {
    expect(labelAnchor([{ x: 0, y: 0 }, { x: 0, y: 200 }, { x: 30, y: 200 }], 100)).toEqual({ x: 0, y: 100 });
    expect(labelAnchor([{ x: 5, y: 5 }, { x: 20, y: 5 }], 100)).toEqual({ x: 5, y: 5 });
  });
});

describe('badgeSlots', () => {
  it('gives badges on the same resource their own slot across flows', () => {
    expect(badgeSlots([{ node: 'drg' }, { node: 'fw' }, { node: 'drg' }, { node: 'drg' }])).toEqual([0, 0, 1, 2]);
  });
});
