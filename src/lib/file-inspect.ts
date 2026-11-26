// SPDX-License-Identifier: AGPL-3.0-or-later
// Client-side magic-byte inspection and status summary for any uploaded file format.

export type InspectionStatusTone = 'ready' | 'warn';

export interface FileInspection {
  fileName: string;
  fileSize: number;
  modifiedLabel: string;
  detectedFormat: string;
  statusLabel: string;
  statusTone: InspectionStatusTone;
  headerHex: string;
  detailNote: string;
  textExcerpt?: string;
  lineCount?: number;
  truncatedText?: boolean;
}

const TEXT_EXT = /\.(txt|md|markdown|csv|tsv|json|xml|html?|css|js|mjs|ts|tsx|jsx|yml|yaml|log|srt|vtt|svg|ini|env|toml|sql)$/i;
const OFFICE_MAP: Record<string, string> = {
  docx: 'Word document (.docx)',
  xlsx: 'Excel workbook (.xlsx)',
  pptx: 'PowerPoint deck (.pptx)',
  odt: 'OpenDocument text (.odt)',
  ods: 'OpenDocument sheet (.ods)',
  epub: 'EPUB e-book (.epub)',
};

function matchesAt(bytes: Uint8Array, seq: number[], offset = 0): boolean {
  if (bytes.length < offset + seq.length) return false;
  return seq.every((b, idx) => bytes[offset + idx] === b);
}

function hasPdfHeader(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.length, 1024);
  for (let i = 0; i <= limit - 5; i += 1) {
    if (matchesAt(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d], i)) return true;
  }
  return false;
}

function isLikelyText(bytes: Uint8Array): boolean {
  const sample = bytes.subarray(0, Math.min(bytes.length, 4096));
  if (sample.length === 0) return true;
  let bad = 0;
  for (const b of sample) {
    if (b === 0) return false;
    if (b < 9 || (b > 13 && b < 32)) bad += 1;
  }
  return bad / sample.length < 0.05;
}

function detectSignature(file: File, bytes: Uint8Array): string {
  if (hasPdfHeader(bytes)) return 'PDF document';
  if (matchesAt(bytes, [0x89, 0x50, 0x4e, 0x47])) return 'PNG image';
  if (matchesAt(bytes, [0xff, 0xd8, 0xff])) return 'JPEG image';
  if (matchesAt(bytes, [0x47, 0x49, 0x46, 0x38])) return 'GIF image';
  if (matchesAt(bytes, [0x52, 0x49, 0x46, 0x46]) && matchesAt(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return 'WebP image';
  }
  if (matchesAt(bytes, [0x52, 0x49, 0x46, 0x46]) && matchesAt(bytes, [0x57, 0x41, 0x56, 0x45], 8)) {
    return 'WAV audio';
  }
  if (matchesAt(bytes, [0x49, 0x44, 0x33]) || matchesAt(bytes, [0xff, 0xfb])) return 'MP3 audio';
  if (matchesAt(bytes, [0x4f, 0x67, 0x67, 0x53])) return 'Ogg media';
  if (matchesAt(bytes, [0x66, 0x4c, 0x61, 0x43])) return 'FLAC audio';
  if (matchesAt(bytes, [0x66, 0x74, 0x79, 0x70], 4)) return 'MP4 / M4A media';
  if (matchesAt(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return 'WebM / MKV video';
  if (matchesAt(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    return OFFICE_MAP[ext] ?? 'ZIP archive';
  }
  if (matchesAt(bytes, [0xd0, 0xcf, 0x11, 0xe0])) return 'Legacy Office document';
  if (file.type.startsWith('text/') || TEXT_EXT.test(file.name) || isLikelyText(bytes)) {
    const ext = file.name.split('.').pop()?.toUpperCase();
    return ext ? `${ext} text document` : 'Plain text';
  }
  return file.type || 'Binary file';
}

export async function inspectUploadedFile(file: File): Promise<FileInspection> {
  const MAX_READ = 24 * 1024;
  const slice = file.slice(0, MAX_READ);
  const bytes = new Uint8Array(await slice.arrayBuffer());
  const headerHex = Array.from(bytes.subarray(0, 12))
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
  const detectedFormat = detectSignature(file, bytes);
  const modifiedLabel = file.lastModified
    ? new Date(file.lastModified).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Unknown date';

  const claimsPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
  const mismatch = claimsPdf && detectedFormat !== 'PDF document';
  const textReadable = !mismatch && isLikelyText(bytes) && detectedFormat !== 'PDF document';

  let textExcerpt: string | undefined;
  let lineCount: number | undefined;
  let truncatedText: boolean | undefined;

  if (textReadable || (mismatch && isLikelyText(bytes))) {
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    const lines = decoded.split(/\r?\n/);
    lineCount = lines.length;
    truncatedText = file.size > MAX_READ || lines.length > 220;
    textExcerpt = lines.slice(0, 220).join('\n');
  }

  return {
    fileName: file.name,
    fileSize: file.size,
    modifiedLabel,
    detectedFormat,
    statusLabel: mismatch ? 'Header mismatch' : 'Verified locally · Ready',
    statusTone: mismatch ? 'warn' : 'ready',
    headerHex: headerHex || 'Empty file (0 bytes)',
    detailNote: mismatch
      ? `File is named .pdf but header bytes look like ${detectedFormat}.`
      : `Signature verified locally in browser memory (${detectedFormat}).`,
    textExcerpt,
    lineCount,
    truncatedText,
  };
}
