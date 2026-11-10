import type { ImportedConfig } from './importConfig';
import type { ImportWorkerResult } from './importConfig.worker';

export const MAX_CONFIG_BYTES = 1024 * 1024;
const IMPORT_TIMEOUT_MS = 30_000;

export async function importConfigFile(file: File, signal?: AbortSignal): Promise<ImportedConfig> {
  if (!file.name.toLowerCase().endsWith('.jsonnet')) throw new Error('Choose the config.jsonnet file from your Studio ZIP.');
  if (!file.size) throw new Error('The configuration file is empty. Choose a config.jsonnet exported by Studio.');
  if (file.size > MAX_CONFIG_BYTES) throw new Error('The configuration exceeds the 1 MB import limit.');
  const source = await file.text();
  if (signal?.aborted) throw new Error('Import cancelled.');
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./importConfig.worker.ts', import.meta.url), { type: 'module' });
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      worker.terminate();
    };
    const abort = () => { cleanup(); reject(new Error('Import cancelled.')); };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Import took too long. Choose a standalone config.jsonnet exported by Studio.'));
    }, IMPORT_TIMEOUT_MS);
    signal?.addEventListener('abort', abort, { once: true });
    worker.onmessage = (event: MessageEvent<ImportWorkerResult>) => {
      cleanup();
      if (event.data.ok) resolve(event.data.result);
      else reject(new Error(event.data.message));
    };
    worker.onerror = (event) => {
      event.preventDefault();
      cleanup();
      reject(new Error('Could not load the import engine. Reload Studio and try again.'));
    };
    worker.postMessage(source);
  });
}
