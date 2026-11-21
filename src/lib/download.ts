/** Download a blob from memory and revoke the object URL afterwards. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Give the browser a moment to start the download before the URL is invalidated.
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}
