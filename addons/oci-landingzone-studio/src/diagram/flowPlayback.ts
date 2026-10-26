import type { DiagramEdge } from '../model/types';
import { pathLengths, type Point } from './flowOverlayGeometry';

export interface ActiveRouteRule { tableId: string; ruleId: string }
interface PlaybackStop {
  distance: number;
  arrival: number;
  departure: number;
  rule?: ActiveRouteRule;
}
export interface FlowPlayback {
  valid: boolean;
  stops: PlaybackStop[];
  totalDistance: number;
  duration: number;
  travelMsPerUnit: number;
}
export interface PlaybackFrame {
  distance: number;
  hopIndex?: number;
  rule?: ActiveRouteRule;
}

const RULE_DWELL_MS = 960;
const TERMINAL_DWELL_MS = 500;

export interface FlowHopMarker extends Point {
  node: string;
  seq: number;
  anchorId?: string;
  inspected?: boolean;
}
interface HopEvent {
  marker: FlowHopMarker;
  distance: number;
  rule?: ActiveRouteRule;
}
const ANCHOR_TOLERANCE = 0.0001;

/** Resolve occurrence, marker and packet stop together; never project onto a nearby resource. */
function hopEvents(edge: DiagramEdge): HopEvent[] | undefined {
  const points = edge.points ?? [];
  const finitePath = points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (!finitePath) return;
  const { cumulative, total } = pathLengths(points);
  const events: HopEvent[] = [];
  let previousDistance = 0;
  for (const [index, hop] of (edge.flowHops ?? []).entries()) {
    const visit = edge.visits?.[hop.visitIndex];
    const point = visit && Number.isInteger(visit.pointIndex) ? points[visit.pointIndex] : undefined;
    const routed = !!(hop.tableId || hop.ruleId);
    if (!visit || visit.node !== hop.node || !point
      || hop.seq !== index + 1
      || !Number.isFinite(visit.distance) || visit.distance < previousDistance
      || visit.distance < 0 || visit.distance > total + ANCHOR_TOLERANCE
      || Math.abs(cumulative[visit.pointIndex] - visit.distance) > ANCHOR_TOLERANCE
      || (routed && (!hop.tableId || !hop.ruleId || !visit.anchorId?.trim()))) return undefined;
    const onPath = pointAtDistance(points, visit.distance);
    if (Math.hypot(onPath.x - point.x, onPath.y - point.y) > ANCHOR_TOLERANCE) return undefined;
    previousDistance = visit.distance;
    events.push({
      distance: visit.distance,
      marker: { node: hop.node, seq: hop.seq, x: point.x, y: point.y,
        anchorId: visit.anchorId, inspected: hop.inspected },
      rule: hop.tableId && hop.ruleId ? { tableId: hop.tableId, ruleId: hop.ruleId } : undefined,
    });
  }
  return events;
}

/** Live and exported numbers use exactly the same validated anchors as packet playback. */
export function flowHopMarkers(edge: DiagramEdge): FlowHopMarker[] {
  return edge.showHopMarkers === false ? [] : hopEvents(edge)?.map((event) => event.marker) ?? [];
}

/** One route clock controls both the packet position and the effective rule. */
export function createFlowPlayback(edge: DiagramEdge): FlowPlayback {
  const totalDistance = pathLengths(edge.points ?? []).total;
  const travelMsPerUnit = totalDistance > 0 ? Math.min(6000, Math.max(1750, totalDistance / 240 * 1000)) / totalDistance : 0;
  const events = hopEvents(edge);
  if (!events) return { valid: false, stops: [], totalDistance, travelMsPerUnit, duration: 1 };
  let distance = 0;
  let time = 0;
  const stops = events.map((event) => {
    const { distance: nextDistance, rule } = event;
    const arrival = time + (nextDistance - distance) * travelMsPerUnit;
    time = arrival + (rule ? RULE_DWELL_MS : 360);
    distance = nextDistance;
    return { distance, arrival, departure: time, rule };
  });
  return { valid: true, stops, totalDistance, travelMsPerUnit,
    duration: Math.max(1, time + (totalDistance - distance) * travelMsPerUnit + TERMINAL_DWELL_MS) };
}

/** Pure sampling makes looping, manual steps and reduced motion use identical hop positions. */
export function sampleFlowPlayback(playback: FlowPlayback, elapsed: number, step?: number | null, reducedMotion = false): PlaybackFrame {
  if (!playback.valid) return { distance: 0 };
  if (step != null || reducedMotion) {
    const index = Math.max(0, Math.min(playback.stops.length - 1, step ?? 0));
    const stop = playback.stops[index];
    return stop ? { distance: stop.distance, hopIndex: index, rule: stop.rule } : { distance: 0 };
  }
  const time = ((elapsed % playback.duration) + playback.duration) % playback.duration;
  let distance = 0;
  let departure = 0;
  for (const [index, stop] of playback.stops.entries()) {
    if (time < stop.arrival) return { distance: distance + (time - departure) / playback.travelMsPerUnit };
    if (time < stop.departure) return { distance: stop.distance, hopIndex: index, rule: stop.rule };
    distance = stop.distance;
    departure = stop.departure;
  }
  return { distance: Math.min(playback.totalDistance, distance + (time - departure) / (playback.travelMsPerUnit || 1)) };
}

export function pointAtDistance(points: Point[], distance: number): Point {
  const { cumulative: lengths, total } = pathLengths(points);
  const at = Math.max(0, Math.min(total, distance));
  for (let i = 1; i < points.length; i++) {
    if (at > lengths[i]) continue;
    const length = lengths[i] - lengths[i - 1];
    const ratio = length ? (at - lengths[i - 1]) / length : 0;
    return { x: points[i - 1].x + (points[i].x - points[i - 1].x) * ratio,
      y: points[i - 1].y + (points[i].y - points[i - 1].y) * ratio };
  }
  return points.at(-1) ?? { x: 0, y: 0 };
}
