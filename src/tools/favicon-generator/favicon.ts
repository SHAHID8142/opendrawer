// SPDX-License-Identifier: AGPL-3.0-or-later
// Builds a favicon package in the browser: PNG sizes, a multi-entry ICO and a ZIP.

import { decodeImageFile } from '../../lib/decode-image';
import { ICO_SIZES, wrapIcoMulti } from '../../lib/ico';
import { byteLimitMessage, pixelLimitMessage } from '../../lib/image-format';
import { zipStore, type ZipEntry } from '../../lib/zip';
import { FAVICON_PNGS, htmlSnippet, manifestJson } from './engine';

export interface FaviconPackage {
  zip: Blob;
  ico: Blob;
  preview: Blob;
  snippet: string;
  files: string[];
}

export type FaviconResult = { ok: true; package: FaviconPackage } | { ok: false; message: string };

function fit(size: number, width: number, height: number): { width: number; height: number; x: number; y: number } {
  const scale = Math.min(size / width, size / height);
  const drawWidth = Math.max(1, Math.round(width * scale));
  const drawHeight = Math.max(1, Math.round(height * scale));
  return {
    width: drawWidth,
    height: drawHeight,
    x: Math.round((size - drawWidth) / 2),
    y: Math.round((size - drawHeight) / 2),
  };
}

export async function buildFavicons(file: File): Promise<FaviconResult> {
  const tooBig = byteLimitMessage(file.size);
  if (tooBig !== null) return { ok: false, message: tooBig };

  const decoded = await decodeImageFile(file);
  if (!decoded) {
    return {
      ok: false,
      message:
        'That file could not be decoded as an image. This browser reads PNG, JPEG, WebP, AVIF, GIF, BMP, ICO and SVG; HEIC and TIFF depend on the browser.',
    };
  }

  try {
    const pixels = pixelLimitMessage(decoded.width, decoded.height);
    if (pixels !== null) return { ok: false, message: pixels };

    const renderPng = async (size: number): Promise<Uint8Array> => {
      const canvas = window.document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('no canvas');
      const box = fit(size, decoded.width, decoded.height);
      context.drawImage(decoded.source, box.x, box.y, box.width, box.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((value) => resolve(value), 'image/png'),
      );
      canvas.width = 0;
      canvas.height = 0;
      if (!blob) throw new Error('no png');
      return new Uint8Array(await blob.arrayBuffer());
    };

    const entries: ZipEntry[] = [];
    let preview: Blob | null = null;
    for (const asset of FAVICON_PNGS) {
      const png = await renderPng(asset.size);
      entries.push({ name: asset.name, bytes: png });
      if (asset.size === 512) preview = new Blob([png], { type: 'image/png' });
    }

    const layers: { png: Uint8Array; size: number }[] = [];
    for (const size of ICO_SIZES) layers.push({ png: await renderPng(size), size });
    const icoBytes = wrapIcoMulti(layers);
    entries.push({ name: 'favicon.ico', bytes: icoBytes });

    const manifest = new TextEncoder().encode(manifestJson());
    const snippet = htmlSnippet();
    entries.push({ name: 'site.webmanifest', bytes: manifest });
    entries.push({ name: 'html-snippet.txt', bytes: new TextEncoder().encode(`${snippet}\n`) });

    if (!preview) return { ok: false, message: 'The icon preview could not be rendered.' };
    return {
      ok: true,
      package: {
        zip: zipStore(entries),
        ico: new Blob([icoBytes], { type: 'image/x-icon' }),
        preview,
        snippet,
        files: entries.map((entry) => entry.name),
      },
    };
  } catch {
    return { ok: false, message: 'The icon could not be generated. Reload the page and try again.' };
  } finally {
    decoded.close();
  }
}
