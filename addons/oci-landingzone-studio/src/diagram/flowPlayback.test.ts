import { describe, expect, it } from 'vitest';
import type { DiagramEdge } from '../model/types';
import { createFlowPlayback, flowHopMarkers, pointAtDistance, sampleFlowPlayback } from './flowPlayback';

const hairpin: DiagramEdge = {
  id: 'flow-prod>preprod:east-west#0', source: 'vm', target: 'vm2',
  points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 200, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }],
  visits: [
    { node: 'vm', pointIndex: 0, distance: 0, anchorId: 'routing-vm' },
    { node: 'attach-hub', pointIndex: 1, distance: 100, anchorId: 'routing-hub-ingress' },
    { node: 'firewall', pointIndex: 2, distance: 200, anchorId: 'routing-firewall' },
    { node: 'attach-hub', pointIndex: 3, distance: 300, anchorId: 'routing-hub-drg' },
    { node: 'vm2', pointIndex: 4, distance: 400, anchorId: 'vm2' },
  ],
  flowHops: [
    { node: 'vm', seq: 1, visitIndex: 0, tableId: 'subnet-table', ruleId: 'default' },
    { node: 'attach-hub', seq: 2, visitIndex: 1, tableId: 'ingress-table', ruleId: 'inspect' },
    { node: 'firewall', seq: 3, visitIndex: 2, inspected: true, tableId: 'firewall-table', ruleId: 'to-drg' },
    { node: 'attach-hub', seq: 4, visitIndex: 3, tableId: 'drg-table', ruleId: 'to-preprod' },
    { node: 'vm2', seq: 5, visitIndex: 4 },
  ],
};

describe('flow playback timeline', () => {
  it('uses one canonical anchor for every numbered marker, packet stop and active rule', () => {
    const playback = createFlowPlayback(hairpin);
    const markers = flowHopMarkers(hairpin);
    expect(playback.valid).toBe(true);
    expect(markers).toHaveLength(hairpin.flowHops!.length);
    for (const marker of markers) {
      const index = marker.seq - 1;
      const stop = playback.stops[index];
      const frame = sampleFlowPlayback(playback, stop.arrival + 1);
      expect(frame.hopIndex).toBe(index);
      expect(pointAtDistance(hairpin.points!, frame.distance)).toEqual({ x: marker.x, y: marker.y });
      expect(pointAtDistance(hairpin.points!, stop.distance)).toEqual({ x: marker.x, y: marker.y });
      expect(marker.anchorId).toBe(hairpin.visits![hairpin.flowHops![index].visitIndex].anchorId);
    }
    expect(markers[2].inspected).toBe(true);
  });

  it('hides secondary endpoint numbers without changing their packet or rule events', () => {
    const edge = { ...hairpin, showHopMarkers: false };
    expect(flowHopMarkers(edge)).toEqual([]);
    expect(createFlowPlayback(edge)).toEqual(createFlowPlayback(hairpin));
  });

  it.each(['missing-anchor', 'wrong-node', 'missing-point', 'wrong-distance', 'earlier-occurrence', 'nonmonotonic', 'missing-rule'] as const)(
    'rejects %s rather than substituting a resource-centre stop', (invalid) => {
      const edge = structuredClone(hairpin);
      if (invalid === 'missing-anchor') delete edge.visits![1].anchorId;
      if (invalid === 'wrong-node') edge.visits![1].node = 'another-resource';
      if (invalid === 'missing-point') edge.visits![1].pointIndex = 500;
      if (invalid === 'wrong-distance') edge.visits![1].distance = 90;
      if (invalid === 'earlier-occurrence') edge.visits![3].distance = 100;
      if (invalid === 'nonmonotonic') { edge.visits![3].distance = 100; edge.visits![3].pointIndex = 1; }
      if (invalid === 'missing-rule') delete edge.flowHops![1].ruleId;
      const playback = createFlowPlayback(edge);
      expect(playback.valid).toBe(false);
      expect(playback.stops).toEqual([]);
      expect(sampleFlowPlayback(playback, 5000, 1)).toEqual({ distance: 0 });
      expect(sampleFlowPlayback(playback, 5000)).toEqual({ distance: 0 });
      expect(flowHopMarkers(edge)).toEqual([]);
    },
  );

  it('never exposes a partial marker sequence when one anchor is invalid', () => {
    const edge = structuredClone(hairpin);
    delete edge.visits![1].anchorId;
    expect(flowHopMarkers(edge)).toEqual([]);
  });

  it.each([[100, 1750], [1000, 1000 / 240 * 1000], [10000, 6000]])(
    'moves along a %i-unit path in %i ms, excluding hop pauses', (distance, duration) => {
      const playback = createFlowPlayback({ id: 'travel', source: 'a', target: 'b', points: [{ x: 0, y: 0 }, { x: distance, y: 0 }] });
      expect(playback.travelMsPerUnit * distance).toBeCloseTo(duration);
      expect(sampleFlowPlayback(playback, duration / 2).distance).toBeCloseTo(distance / 2);
    },
  );

  it('holds every numbered routing hop for 960 ms and each other numbered stop for 360 ms', () => {
    const playback = createFlowPlayback(hairpin);
    expect(playback.stops.map((stop) => stop.departure - stop.arrival)).toEqual([960, 960, 960, 960, 360]);
    for (const [index, stop] of playback.stops.entries()) {
      expect(sampleFlowPlayback(playback, stop.departure - 1)).toEqual({ distance: stop.distance, hopIndex: index, rule: stop.rule });
      expect(sampleFlowPlayback(playback, stop.departure).hopIndex).toBeUndefined();
    }
  });

  it('shows only the effective rule while the same clock holds its packet at that hop', () => {
    const playback = createFlowPlayback(hairpin);
    for (const [index, stop] of playback.stops.entries()) {
      const frame = sampleFlowPlayback(playback, (stop.arrival + stop.departure) / 2);
      expect(frame).toEqual({ distance: stop.distance, hopIndex: index, rule: stop.rule });
    }
    const transit = sampleFlowPlayback(playback, (playback.stops[1].departure + playback.stops[2].arrival) / 2);
    expect(transit.rule).toBeUndefined();
    expect(transit.hopIndex).toBeUndefined();
    expect(transit.distance).toBeCloseTo(150);
  });

  it('keeps repeated attachment occurrences separate even when coordinates are identical', () => {
    const playback = createFlowPlayback(hairpin);
    const first = sampleFlowPlayback(playback, 0, 1);
    const returned = sampleFlowPlayback(playback, 0, 3);
    expect(first.distance).toBe(100);
    expect(returned.distance).toBe(300);
    expect(pointAtDistance(hairpin.points!, first.distance)).toEqual(pointAtDistance(hairpin.points!, returned.distance));
    expect(first.rule?.tableId).toBe('ingress-table');
    expect(returned.rule?.tableId).toBe('drg-table');
    expect(pointAtDistance(hairpin.points!, 350)).toEqual({ x: 100, y: 50 });
  });

  it('uses exact hop positions for previous/next/goto and stays static under reduced motion', () => {
    const playback = createFlowPlayback(hairpin);
    expect(sampleFlowPlayback(playback, 20000, 2)).toEqual(sampleFlowPlayback(playback, 0, 2));
    expect(sampleFlowPlayback(playback, 20000, null, true)).toEqual(sampleFlowPlayback(playback, 0, 0));
    expect(sampleFlowPlayback(playback, 20000, 3, true).rule?.ruleId).toBe('to-preprod');
    expect(sampleFlowPlayback(playback, 0, 99).distance).toBe(400);
    expect(sampleFlowPlayback(playback, 0, -1).distance).toBe(0);
  });

  it('clears the rule at delivery and loops deterministically without carrying the previous row', () => {
    const playback = createFlowPlayback(hairpin);
    expect(sampleFlowPlayback(playback, playback.duration - 1)).toEqual({ distance: 400 });
    expect(sampleFlowPlayback(playback, playback.duration + 100)).toEqual(sampleFlowPlayback(playback, 100));
    expect(sampleFlowPlayback(playback, playback.duration - 1).rule).toBeUndefined();
  });

  it('does not flash a rule when its resource occurrence has no valid geometry', () => {
    const edge = structuredClone(hairpin);
    edge.visits![1].node = 'different-resource';
    const playback = createFlowPlayback(edge);
    expect(sampleFlowPlayback(playback, 0, 1).rule).toBeUndefined();
  });

  it('handles an empty path without NaN or animation', () => {
    const playback = createFlowPlayback({ id: 'empty', source: 'a', target: 'b' });
    expect(sampleFlowPlayback(playback, 10000, null, true)).toEqual({ distance: 0 });
    expect(pointAtDistance([], 10000)).toEqual({ x: 0, y: 0 });
  });
});
