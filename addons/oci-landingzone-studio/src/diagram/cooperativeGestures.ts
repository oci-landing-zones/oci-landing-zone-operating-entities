import type { Viewport } from '@xyflow/react';

export type DiagramGestureHint = 'touch' | 'wheel' | null;

/** Let one finger scroll the page; reserve two fingers for the diagram. */
export function attachCooperativeGestures(element: HTMLElement, {
  getViewport, setViewport, onHint, minZoom, maxZoom,
}: {
  getViewport: () => Viewport;
  setViewport: (viewport: Viewport) => void;
  onHint: (hint: DiagramGestureHint) => void;
  minZoom: number;
  maxZoom: number;
}) {
  type Pair = { ids: number[]; x: number; y: number; distance: number };
  let gesture: { pair: Pair; viewport: Viewport } | null = null;
  let single: { x: number; y: number; id: number } | null = null;

  function overControl(event: Event) {
    return !!(event.target as Element | null)?.closest?.('button, input, select, textarea, a, .react-flow__panel');
  }
  function pair(touches: TouchList): Pair {
    const [a, b] = Array.from(touches);
    const bounds = element.getBoundingClientRect();
    return { ids: [a.identifier, b.identifier],
      x: (a.clientX + b.clientX) / 2 - bounds.left,
      y: (a.clientY + b.clientY) / 2 - bounds.top,
      distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) };
  }
  function start(event: TouchEvent) {
    if (overControl(event)) return;
    event.stopPropagation();
    gesture = null;
    single = null;
    if (event.touches.length === 2) {
      event.preventDefault();
      gesture = { pair: pair(event.touches), viewport: getViewport() };
      onHint(null);
    } else if (event.touches.length === 1) {
      const touch = event.touches[0];
      single = { x: touch.clientX, y: touch.clientY, id: touch.identifier };
    }
  }
  function move(event: TouchEvent) {
    if (overControl(event)) return;
    event.stopPropagation();
    if (event.touches.length !== 2) {
      gesture = null;
      const touch = event.touches[0];
      if (single && touch?.identifier === single.id && Math.hypot(touch.clientX - single.x, touch.clientY - single.y) > 10) {
        onHint('touch');
        single = null;
      }
      return;
    }
    event.preventDefault();
    const next = pair(event.touches);
    const current = gesture;
    if (!current || next.ids.some((id) => !current.pair.ids.includes(id))) {
      gesture = { pair: next, viewport: getViewport() };
      return;
    }
    const { pair: initial, viewport } = current;
    const ratio = initial.distance > 0 ? next.distance / initial.distance : 1;
    const zoom = Math.min(maxZoom, Math.max(minZoom, viewport.zoom * ratio));
    setViewport({
      x: next.x - (initial.x - viewport.x) * zoom / viewport.zoom,
      y: next.y - (initial.y - viewport.y) * zoom / viewport.zoom,
      zoom,
    });
  }
  function end() {
    gesture = null;
    single = null;
  }
  function wheel(event: WheelEvent) {
    if (overControl(event)) return;
    onHint(event.ctrlKey || event.metaKey ? null : 'wheel');
  }

  element.addEventListener('touchstart', start, { capture: true, passive: false });
  element.addEventListener('touchmove', move, { capture: true, passive: false });
  element.addEventListener('touchend', end, true);
  element.addEventListener('touchcancel', end, true);
  element.addEventListener('wheel', wheel, { capture: true, passive: true });
  return () => {
    element.removeEventListener('touchstart', start, { capture: true });
    element.removeEventListener('touchmove', move, { capture: true });
    element.removeEventListener('touchend', end, { capture: true });
    element.removeEventListener('touchcancel', end, { capture: true });
    element.removeEventListener('wheel', wheel, { capture: true });
  };
}
