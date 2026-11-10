import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { loadDiagramPreview } from './diagramPreview';

class PreviewWorker {
  static instances: PreviewWorker[] = [];
  onmessage?: (event: { data: unknown }) => void;
  onerror?: (event: { preventDefault: () => void }) => void;
  terminate = vi.fn();
  postMessage = vi.fn();
  constructor() { PreviewWorker.instances.push(this); }
}

beforeEach(() => {
  PreviewWorker.instances = [];
  vi.stubGlobal('Worker', PreviewWorker);
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('diagram generation lifecycle', () => {
  const preview = { tables: [], inventory: { compartments: [], groups: [] } };
  it('returns one generated routing and resource snapshot and terminates the worker', async () => {
    const model = emptyLzModel();
    const pending = loadDiagramPreview(model, new AbortController().signal);
    const worker = PreviewWorker.instances[0];
    expect(worker.postMessage).toHaveBeenCalledWith(model);
    worker.onmessage?.({ data: { ok: true, preview } });
    await expect(pending).resolves.toEqual(preview);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('cancels obsolete generation without accepting its late response', async () => {
    const controller = new AbortController();
    const pending = loadDiagramPreview(emptyLzModel(), controller.signal);
    const cancelled = expect(pending).rejects.toThrow('cancelled');
    const worker = PreviewWorker.instances[0];
    controller.abort();
    worker.onmessage?.({ data: { ok: true, preview } });
    await cancelled;
    expect(worker.terminate).toHaveBeenCalled();
  });

  it('reports a generation failure without returning stale tables', async () => {
    const pending = loadDiagramPreview(emptyLzModel(), new AbortController().signal);
    PreviewWorker.instances[0].onmessage?.({ data: { ok: false, message: 'Invalid VCN range.' } });
    await expect(pending).rejects.toThrow('Invalid VCN range.');
  });

  it('stops a worker that exceeds the generation timeout', async () => {
    vi.useFakeTimers();
    const pending = loadDiagramPreview(emptyLzModel(), new AbortController().signal);
    const failed = expect(pending).rejects.toThrow('too long');
    await vi.advanceTimersByTimeAsync(30_000);
    await failed;
    expect(PreviewWorker.instances[0].terminate).toHaveBeenCalledOnce();
  });
});
