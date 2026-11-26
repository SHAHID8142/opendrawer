// SPDX-License-Identifier: AGPL-3.0-or-later
// Lazy universal preview loader supporting incremental PDF page ranges, images, text, media, and containers.
import { inspectUploadedFile, type FileInspection } from './file-inspect';

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
  kind: 'pdf' | 'image' | 'text' | 'media' | 'summary';
  totalPages: number;
  frames: PreviewFrame[];
  inspection: FileInspection;
  mediaUrl?: string;
  mediaType?: 'audio' | 'video';
}

const isPdf = (file: File) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
const isImg = (file: File) => file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|bmp|avif)$/i.test(file.name);

function mediaKindOf(file: File): 'audio' | 'video' | null {
  if (file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(file.name)) return 'audio';
  if (file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogv)$/i.test(file.name)) return 'video';
  return null;
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
      (blob) => (blob ? resolve(URL.createObjectURL(blob)) : reject(new Error('Could not encode preview frame.'))),
      'image/jpeg',
      0.84,
    );
  });
}

export async function renderPdfPages(
  file: File,
  startPage: number,
  endPage: number,
  highRes: boolean,
  signal: AbortSignal,
): Promise<{ totalPages: number; frames: PreviewFrame[] }> {
  const pdfjs = await import('pdfjs-dist');
  const workerMod = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerMod.default;

  const data = new Uint8Array(await file.arrayBuffer());
  if (signal.aborted) return { totalPages: 0, frames: [] };

  const loading = pdfjs.getDocument({ data, useSystemFonts: false });
  const abortHandler = () => void loading.destroy();
  signal.addEventListener('abort', abortHandler, { once: true });

  try {
    const doc = await loading.promise;
    const from = Math.max(1, startPage);
    const to = Math.min(doc.numPages, endPage);
    const frames: PreviewFrame[] = [];

    for (let pageNo = from; pageNo <= to; pageNo += 1) {
      if (signal.aborted) break;
      const page = await doc.getPage(pageNo);
      const baseVp = page.getViewport({ scale: 1 });
      const scale = Math.min(2, Math.max(0.25, (highRes ? 880 : 300) / Math.max(baseVp.width, 1)));
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext('2d');
      if (ctx) await page.render({ canvasContext: ctx, canvas, viewport }).promise;
      const url = await encodeCanvasUrl(canvas);
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();

      frames.push({
        key: `${file.name}-p${pageNo}`,
        pageNumber: pageNo,
        url,
        width: Math.round(baseVp.width),
        height: Math.round(baseVp.height),
        label: `Page ${pageNo}`,
        dimensions: `${Math.round(baseVp.width)} × ${Math.round(baseVp.height)} pt`,
      });
    }
    return { totalPages: doc.numPages, frames };
  } finally {
    signal.removeEventListener('abort', abortHandler);
    void loading.destroy();
  }
}

export async function renderUploadedPreview(
  files: File[],
  endPage: number,
  highRes: boolean,
  signal: AbortSignal,
): Promise<RenderedPreview> {
  const target = files[0];
  if (!target) {
    const empty = await inspectUploadedFile(new File([], 'empty'));
    return { kind: 'summary', totalPages: 0, frames: [], inspection: empty };
  }

  const inspection = await inspectUploadedFile(target);
  if (signal.aborted) return { kind: 'summary', totalPages: 0, frames: [], inspection };

  if (files.every(isImg)) {
    const frames: PreviewFrame[] = [];
    for (const [index, file] of files.entries()) {
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
    return { kind: 'image', totalPages: files.length, frames, inspection };
  }

  const mediaType = mediaKindOf(target);
  if (mediaType) {
    return { kind: 'media', totalPages: 1, frames: [], inspection, mediaUrl: URL.createObjectURL(target), mediaType };
  }

  if (inspection.detectedFormat === 'PDF document' || (isPdf(target) && inspection.statusTone === 'ready')) {
    try {
      const rendered = await renderPdfPages(target, 1, endPage, highRes, signal);
      return { kind: 'pdf', totalPages: rendered.totalPages, frames: rendered.frames, inspection };
    } catch (cause) {
      const protectedPdf = /password/i.test(cause instanceof Error ? cause.message : String(cause));
      return {
        kind: 'summary',
        totalPages: 0,
        frames: [],
        inspection: {
          ...inspection,
          statusTone: 'warn',
          statusLabel: protectedPdf ? 'Password-protected PDF' : 'Could not decode pages',
          detailNote: protectedPdf
            ? 'PDF header verified, but pages are encrypted and require a password to preview.'
            : 'PDF header present, though the internal page tree could not be rendered.',
        },
      };
    }
  }

  if (inspection.textExcerpt !== undefined) return { kind: 'text', totalPages: 1, frames: [], inspection };
  return { kind: 'summary', totalPages: 1, frames: [], inspection };
}

export function revokePreviewResources(preview: { frames: PreviewFrame[]; mediaUrl?: string }): void {
  for (const frame of preview.frames) URL.revokeObjectURL(frame.url);
  if (preview.mediaUrl) URL.revokeObjectURL(preview.mediaUrl);
}
