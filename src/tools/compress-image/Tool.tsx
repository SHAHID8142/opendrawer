// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for compress-image: resize and re-encode one image or a batch, with a ZIP for many.
import { useEffect, useRef, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { decodeImageFile } from '../../lib/decode-image';
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import { byteLimitMessage } from '../../lib/image-format';
import { zipStore } from '../../lib/zip';
import { ResultList } from './ResultList';
import { compressImage } from './compress';
import {
  MAX_EDGE_OPTIONS,
  QUALITY_MAX,
  QUALITY_MIN,
  clampQuality,
  outputName,
  uniqueOutputName,
  type OutputFormat,
} from './engine';
import type { CompressedFile, Failure } from './types';

type Phase = 'idle' | 'working' | 'done' | 'error';

export default function Tool() {
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState<OutputFormat>('jpeg');
  const [quality, setQuality] = useState(80);
  const [maxEdge, setMaxEdge] = useState(1920);
  const [phase, setPhase] = useState<Phase>('idle');
  const [results, setResults] = useState<CompressedFile[]>([]);
  const [failures, setFailures] = useState<Failure[]>([]);
  const [zip, setZip] = useState<Blob | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const previewRef = useRef('');

  useEffect(() => {
    setReady(true);
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const busy = phase === 'working';

  function clearResults() {
    setResults([]);
    setFailures([]);
    setZip(null);
    setProgress({ done: 0, total: 0 });
    setError(null);
    setPhase('idle');
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = '';
      setPreviewUrl('');
    }
  }

  async function choose(selected: File[]) {
    clearResults();
    const valid: File[] = [];
    const rejected: string[] = [];
    for (const file of selected) {
      const tooBig = byteLimitMessage(file.size);
      if (tooBig !== null) {
        rejected.push(`${file.name}: ${tooBig}`);
        continue;
      }
      const decoded = await decodeImageFile(file);
      if (!decoded) {
        rejected.push(`${file.name}: not an image this browser can read.`);
        continue;
      }
      decoded.close();
      valid.push(file);
    }
    setFiles(valid);
    if (rejected.length > 0) {
      setError(rejected.join(' '));
      if (valid.length === 0) setPhase('error');
    }
  }

  async function compressAll() {
    if (files.length === 0) return;
    clearResults();
    setPhase('working');
    setProgress({ done: 0, total: files.length });
    const used = new Set<string>();
    const compressed: CompressedFile[] = [];
    const failed: Failure[] = [];

    for (const [index, file] of files.entries()) {
      const outcome = await compressImage(file, { format, quality: clampQuality(quality), maxEdge });
      if (outcome.ok) {
        compressed.push({
          name: uniqueOutputName(outputName(file.name, format), used),
          sourceName: file.name,
          blob: outcome.result.blob,
          originalBytes: outcome.result.originalBytes,
          width: outcome.result.width,
          height: outcome.result.height,
          originalWidth: outcome.result.originalWidth,
          originalHeight: outcome.result.originalHeight,
        });
      } else {
        failed.push({ name: file.name, message: outcome.message });
      }
      setProgress({ done: index + 1, total: files.length });
    }

    setResults(compressed);
    setFailures(failed);
    if (compressed.length === 0) {
      setError(failed[0]?.message ?? 'No image could be compressed.');
      setPhase('error');
      return;
    }

    const first = compressed[0];
    if (first) {
      const url = URL.createObjectURL(first.blob);
      previewRef.current = url;
      setPreviewUrl(url);
    }
    const bytes = await Promise.all(
      compressed.map(async (entry) => ({ name: entry.name, bytes: new Uint8Array(await entry.blob.arrayBuffer()) })),
    );
    setZip(zipStore(bytes));
    setPhase('done');
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <div className="card stack">
        <FileDrop
          id="compress-input"
          accept="image/*"
          multiple
          label="Images to compress"
          hint="Select one or several images up to 25 MB each. PNG, JPEG, WebP, AVIF, GIF, BMP or ICO; animated images keep one frame."
          buttonLabel="Choose images"
          working={busy}
          disabled={!ready || busy}
          selectedFile={files.length === 1 && files[0] ? { name: files[0].name, size: files[0].size } : null}
          previewFiles={files}
          onFiles={(selected) => void choose(selected)}
          onClear={() => {
            setFiles([]);
            clearResults();
          }}
        />

        {files.length > 0 && (
          <p className="muted">
            {files.length} image{files.length === 1 ? '' : 's'} · {formatBytes(files.reduce((sum, file) => sum + file.size, 0))} total
          </p>
        )}

        <div className="form__row">
          <div className="field">
            <label className="field__label" htmlFor="compress-format">
              Output format
            </label>
            <select
              id="compress-format"
              className="select"
              value={format}
              disabled={!ready || busy}
              onChange={(event) => {
                setFormat(event.target.value as OutputFormat);
                clearResults();
              }}
            >
              <option value="jpeg">JPEG</option>
              <option value="webp">WebP</option>
              <option value="png">PNG (lossless)</option>
            </select>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="compress-edge">
              Largest side
            </label>
            <select
              id="compress-edge"
              className="select"
              value={maxEdge}
              disabled={!ready || busy}
              onChange={(event) => {
                setMaxEdge(Number(event.target.value));
                clearResults();
              }}
            >
              {MAX_EDGE_OPTIONS.map((edge) => (
                <option key={edge} value={edge}>
                  {edge === 0 ? 'Keep original size' : `${edge} px`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="compress-quality">
            Quality: {format === 'png' ? 'not used for PNG' : quality}
          </label>
          <input
            id="compress-quality"
            type="range"
            min={QUALITY_MIN}
            max={QUALITY_MAX}
            step={1}
            value={quality}
            disabled={!ready || busy || format === 'png'}
            onChange={(event) => {
              setQuality(Number(event.target.value));
              clearResults();
            }}
          />
          <p className="field__hint">Lower is smaller and softer. PNG keeps every pixel, so quality does not apply.</p>
        </div>

        <p>
          <button type="button" className="btn btn--primary" disabled={!ready || busy || files.length === 0} onClick={() => void compressAll()}>
            {busy ? `Compressing ${progress.done + 1} of ${progress.total}…` : 'Compress the images'}
          </button>
        </p>
      </div>

      <p className="status" role="status" aria-live="polite">
        {phase === 'error'
          ? 'Nothing was produced. The reason is below.'
          : files.length === 0
            ? 'No images yet. Choose one or several.'
            : busy
              ? `Compressing ${progress.done} of ${progress.total}. Nothing is uploaded.`
              : phase === 'done'
                ? `${results.length} of ${files.length} compressed.`
                : 'Ready to compress.'}
      </p>

      {error && (
        <div className="note note--danger">
          <h2>What happened</h2>
          <p>{error}</p>
        </div>
      )}

      {results.length > 0 && phase === 'done' && (
        <ResultList results={results} failures={failures} zip={zip} previewUrl={previewUrl} />
      )}
    </div>
  );
}
