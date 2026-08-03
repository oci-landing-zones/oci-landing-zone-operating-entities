/** Trigger a browser download of a text file (drawio XML, JSON, SVG, …). */
export function downloadTextFile(filename: string, content: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Let the browser consume the URL before releasing it.
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
