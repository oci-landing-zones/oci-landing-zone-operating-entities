import { afterEach, describe, expect, it, vi } from 'vitest';
import { importConfigFile, MAX_CONFIG_BYTES } from './configImportFile';
import { emptyLzModel } from '../model/defaults';

class TestWorker {
  static created: (worker: TestWorker) => void;
  onmessage?: (event: MessageEvent) => void;
  onerror?: (event: ErrorEvent) => void;
  terminate = vi.fn();
  postMessage = vi.fn();
  constructor() { TestWorker.created(this); }
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
const file = (content = '{}', name = 'config.jsonnet') => new File([content], name);
async function start(signal?: AbortSignal) {
  vi.stubGlobal('Worker', TestWorker);
  const ready = new Promise<TestWorker>((resolve) => { TestWorker.created = resolve; });
  const promise = importConfigFile(file(), signal);
  const worker = await ready;
  return { promise, worker };
}

describe('configuration file import lifecycle', () => {
  it('rejects ZIPs, empty and oversized files before evaluation', async () => {
    await expect(importConfigFile(file('{}', 'export.zip'))).rejects.toThrow(/config.jsonnet/);
    await expect(importConfigFile(file(''))).rejects.toThrow(/empty/);
    await expect(importConfigFile(file(' '.repeat(MAX_CONFIG_BYTES + 1)))).rejects.toThrow(/1 MB/);
  });
  it('returns the reconstructed design and disposes the worker', async () => {
    const { promise, worker } = await start();
    const result = { model: emptyLzModel(), warnings: [] };
    worker.onmessage!({ data: { ok: true, result } } as MessageEvent);
    await expect(promise).resolves.toEqual(result);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it('reports evaluation errors and permits a new attempt', async () => {
    const first = await start();
    first.worker.onmessage!({ data: { ok: false, message: 'Invalid Jsonnet at line 2' } } as MessageEvent);
    await expect(first.promise).rejects.toThrow(/line 2/);
    expect(first.worker.terminate).toHaveBeenCalledOnce();
    const second = await start();
    const result = { model: emptyLzModel(), warnings: [] };
    second.worker.onmessage!({ data: { ok: true, result } } as MessageEvent);
    await expect(second.promise).resolves.toEqual(result);
  });
  it('terminates stalled evaluations at the time limit', async () => {
    vi.useFakeTimers();
    const { promise, worker } = await start();
    const rejection = expect(promise).rejects.toThrow(/too long/);
    await vi.advanceTimersByTimeAsync(30_000);
    await rejection;
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it('cancels evaluation when its dialog is closed', async () => {
    const controller = new AbortController();
    const { promise, worker } = await start(controller.signal);
    controller.abort();
    await expect(promise).rejects.toThrow(/cancelled/);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
