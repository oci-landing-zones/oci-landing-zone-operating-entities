import { evaluate } from '../generator/jsonnetVm';
import { importConfig, type ImportedConfig } from './importConfig';

export type ImportWorkerResult = { ok: true; result: ImportedConfig } | { ok: false; message: string };

self.onmessage = async (event: MessageEvent<string>) => {
  let response: ImportWorkerResult;
  try {
    // The uploaded file is the entire import filesystem. It cannot read local
    // paths, fetch imports, or access the repository's generator files.
    const value = await evaluate('config.jsonnet', { 'config.jsonnet': event.data });
    response = { ok: true, result: importConfig(value) };
  } catch (error) {
    response = { ok: false, message: error instanceof Error ? error.message : 'Could not read this configuration.' };
  }
  self.postMessage(response);
};
