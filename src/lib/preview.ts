// SPDX-License-Identifier: AGPL-3.0-or-later
// Lazy client-side thumbnail & page renderer for uploaded PDFs and images with buffer cleanup.

export interface PreviewFrame {
  key: string;
  pageNumber: number;
  url: string;
  width: number;
  height: number;
  label: string;
  dimensions: string;
}

export interface RenderedPreview {
  kind: 'pdf' | 'image';
  totalPages: number;
  frames: PreviewFrame[];
}

function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name);
}

function readImageDimensions(url: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 0, h: 0 });
    img.src = url;
  });
}

function encodeCanvasUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not encode preview frame.'));
          return;
        }
        resolve(URL.createObjectURL(blob));
      },
      'image/jpeg',
      0.84,
    );
  });
}

export async function renderUploadedPreview(
  files: File[],
  pageCap: number,
  highRes: boolean,
  signal: AbortSignal,
): Promise<RenderedPreview> {
  if (files.length === 0) return { kind: 'pdf', totalPages: 0, frames: [] };

  const allImages = files.every(isImageFile);
  if (allImages) {
    const frames: PreviewFrame[] = [];
    for (const [index, file] of files.slice(0, pageCap).entries()) {
      if (signal.aborted) break;
      const url = URL.createObjectURL(file);
      const { w, h } = await readImageDimensions(url);
      frames.push({
        key: `${file.name}-${index}`,
        pageNumber: index + 1,
        url,
        width: w || 400,
        height: h || 400,
        label: file.name,
        dimensions: w && h ? `${w} × ${h} px` : 'Image',
      });
    }
    return { kind: 'image', totalPages: files.length, frames };
  }

  const target = files.find(isPdfFile) ?? files[0];
  if (!target || !isPdfFile(target)) {
    return { kind: 'pdf', totalPages: 0, frames: [] };
  }

  const pdfjs = await import('pdfjs-dist');
  const workerMod = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerMod.default;

  const data = new Uint8Array(await target.arrayBuffer());
  if (signal.aborted) return { kind: 'pdf', totalPages: 0, frames: [] };

  const loading = pdfjs.getDocument({ data, useSystemFonts: false });
  const abortHandler = () => void loading.destroy();
  signal.addEventListener('abort', abortHandler, { once: true });

  const doc = await loading.promise;
  try {
    const count = Math.min(doc.numPages, pageCap);
    const frames: PreviewFrame[] = [];

    for (let pageNo = 1; pageNo <= count; pageNo += 1) {
      if (signal.aborted) break;
      const page = await doc.getPage(pageNo);
      const baseVp = page.getViewport({ scale: 1 });
      const targetWidth = highRes ? 880 : 320;
      const scale = Math.min(2, Math.max(0.25, targetWidth / Math.max(baseVp.width, 1)));
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext('2d');
      if (ctx) {
        await page.render({ canvasContext: ctx, canvas, viewport }).promise;
      }
      const url = await encodeCanvasUrl(canvas);
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();

      frames.push({
        key: `${target.name}-p${pageNo}`,
        pageNumber: pageNo,
        url,
        width: Math.round(baseVp.width),
        height: Math.round(baseVp.height),
        label: `Page ${pageNo}`,
        dimensions: `${Math.round(baseVp.width)} × ${Math.round(baseVp.height)} pt`,
      });
    }

    return { kind: 'pdf', totalPages: doc.numPages, frames };
  } finally {
    signal.removeEventListener('abort', abortHandler);
    void doc.destroy();
  }
}

export function revokePreviewFrames(frames: PreviewFrame[]): void {
  for (const frame of frames) {
    URL.revokeObjectURL(frame.url);
  }
}
