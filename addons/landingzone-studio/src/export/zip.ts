/** Bundle the generated landing-zone artifacts into a downloadable .zip. */

import { strToU8, zipSync } from 'fflate';

/** Zip `files` (name → text) and hand back a Blob ready for `URL.createObjectURL`. */
export function zipTextFiles(files: Record<string, string>): Blob {
  const entries: Record<string, Uint8Array> = {};
  for (const [name, body] of Object.entries(files)) entries[name] = strToU8(body);
  // level 6 keeps a 500 KB bundle well under a second while compressing JSON hard.
  const zipped = zipSync(entries, { level: 6 });
  return new Blob([zipped as unknown as BlobPart], { type: 'application/zip' });
}

/** A predictable, filesystem-safe name for a complete Landing Zone bundle. */
export function bundleFilename(name: string): string {
  const slug = name.trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'landing-zone';
  return `${slug}-lz-outputs.zip`;
}

/** Trigger a browser download of a Blob under `filename`. */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Revoking immediately can race the browser's download hand-off.
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
