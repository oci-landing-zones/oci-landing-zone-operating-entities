import { describe, expect, it } from 'vitest';
import { flowGroup, labelAnchor, marksAlong } from './flowOverlayGeometry';

describe('flowGroup', () => {
  it('reduces every trace id form to its flow', () => {
    expect(flowGroup('prod:egress#0')).toBe('prod:egress');
    expect(flowGroup('prod:egress:web#0')).toBe('prod:egress');
  expect(flowGroup('Hub>prod/oke:api:mgmt#0')).toBe('Hub>prod/oke:api');
  expect(flowGroup('preprod>prod/oke:api:web#0')).toBe('preprod>prod/oke:api');
    expect(flowGroup('prod>preprod:east-west:db#2')).toBe('prod>preprod:east-west');
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

it('keeps OKE worker and pod animation controls separate while grouping Projects endpoints', () => {
  expect(flowGroup('prod/oke:egress:workers#1')).toBe('prod/oke:egress:workers');
  expect(flowGroup('prod/oke:egress:pods#0')).toBe('prod/oke:egress:pods');
  expect(flowGroup('prod:egress:web#0')).toBe('prod:egress');
  expect(flowGroup('Hub>prod/oke:api:mgmt#0')).toBe('Hub>prod/oke:api');
  expect(flowGroup('preprod>prod/oke:api:web#0')).toBe('preprod>prod/oke:api');
});
