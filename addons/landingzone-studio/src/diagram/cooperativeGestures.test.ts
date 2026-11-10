import { describe, expect, it, vi } from 'vitest';
import type { Viewport } from '@xyflow/react';
import { attachCooperativeGestures } from './cooperativeGestures';

class Canvas extends EventTarget {
  closest() { return null; }
  getBoundingClientRect() { return { left: 20, top: 30 }; }
}
const touch = (identifier: number, clientX: number, clientY: number) => ({ identifier, clientX, clientY });
function setup() {
  const canvas = new Canvas();
  let viewport: Viewport = { x: 0, y: 0, zoom: 1 };
  const onHint = vi.fn();
  const setViewport = vi.fn((next: Viewport) => { viewport = next; });
  const cleanup = attachCooperativeGestures(canvas as unknown as HTMLElement, {
    getViewport: () => viewport, setViewport, onHint, minZoom: 0.2, maxZoom: 4,
  });
  const send = (type: string, touches: ReturnType<typeof touch>[]) => {
    const event = Object.assign(new Event(type, { cancelable: true }), { touches });
    canvas.dispatchEvent(event);
    return event;
  };
  return { canvas, send, onHint, setViewport, cleanup, viewport: () => viewport };
}

describe('cooperative diagram gestures', () => {
  it('leaves a one-finger swipe and ordinary wheel scrolling to the page', () => {
    const state = setup();
    expect(state.send('touchstart', [touch(1, 100, 100)]).defaultPrevented).toBe(false);
    expect(state.send('touchmove', [touch(1, 100, 140)]).defaultPrevented).toBe(false);
    expect(state.onHint).toHaveBeenLastCalledWith('touch');
    const wheel = Object.assign(new Event('wheel', { cancelable: true }), { ctrlKey: false, metaKey: false });
    state.canvas.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(false);
    expect(state.onHint).toHaveBeenLastCalledWith('wheel');
    expect(state.setViewport).not.toHaveBeenCalled();
    state.cleanup();
  });
  it('moves the diagram with two fingers without scrolling the page', () => {
    const state = setup();
    expect(state.send('touchstart', [touch(1, 100, 100), touch(2, 200, 100)]).defaultPrevented).toBe(true);
    expect(state.send('touchmove', [touch(1, 130, 120), touch(2, 230, 120)]).defaultPrevented).toBe(true);
    expect(state.viewport()).toEqual({ x: 30, y: 20, zoom: 1 });
    state.cleanup();
  });
  it.each(['ctrlKey', 'metaKey'])('clears guidance and leaves %s wheel zoom to React Flow', (modifier) => {
    const state = setup();
    const wheel = Object.assign(new Event('wheel', { cancelable: true }), { ctrlKey: false, metaKey: false, [modifier]: true });
    state.canvas.dispatchEvent(wheel);
    expect(state.onHint).toHaveBeenLastCalledWith(null);
    expect(state.setViewport).not.toHaveBeenCalled();
    state.cleanup();
  });
  it('pinches around the finger midpoint and respects zoom limits', () => {
    const state = setup();
    state.send('touchstart', [touch(1, 100, 100), touch(2, 200, 100)]);
    state.send('touchmove', [touch(1, 50, 100), touch(2, 250, 100)]);
    expect(state.viewport()).toEqual({ x: -130, y: -70, zoom: 2 });
    state.send('touchmove', [touch(1, -1000, 100), touch(2, 1300, 100)]);
    expect(state.viewport().zoom).toBe(4);
    state.cleanup();
  });
  it('ends a gesture when a finger lifts and removes listeners on cleanup', () => {
    const state = setup();
    state.send('touchstart', [touch(1, 100, 100), touch(2, 200, 100)]);
    state.send('touchend', [touch(1, 100, 100)]);
    state.send('touchmove', [touch(1, 150, 150)]);
    expect(state.setViewport).not.toHaveBeenCalled();
    state.cleanup();
    state.send('touchstart', [touch(1, 100, 100), touch(2, 200, 100)]);
    state.send('touchmove', [touch(1, 130, 120), touch(2, 230, 120)]);
    expect(state.setViewport).not.toHaveBeenCalled();
  });
});
