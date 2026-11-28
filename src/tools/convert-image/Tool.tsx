// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for convert-image: batch conversion with a ZIP download and per-file results.
import { useEffect, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { decodeImageFile } from '../../lib/decode-image';
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import { byteLimitMessage } from '../../lib/image-format';
import { zipStore } from '../../lib/zip';
import { convertImage } from './convert';
import {
  QUALITY_MAX,
  QUALITY_MIN,
  clampQuality,
  convertFileName,
  keepsTransparency,
  uniqueFileName,
  type ConvertFormat,
} from './engine';

type Phase = 'idle' | 'working' | 'done' | 'error';

interface ConvertedFile {
  name: string;
  sourceName: string;
  bytes: Uint8Array;
  width: number;
  height: number;
  sourceLabel: string;
}

interface Failure {
  name: string;
  message: string;
}

export default function Tool() {
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState<ConvertFormat>('webp');
  const [quality, setQuality] = useState(85);
  const [phase, setPhase] = useState<Phase>('idle');
  const [results, setResults] = useState<ConvertedFile[]>([]);
  const [failures, setFailures] = useState<Failure[]>([]);
  const [zip, setZip] = useState<Blob | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);
  const busy = phase === 'working';

  function clearResults() {
    setResults([]);
    setFailures([]);
    setZip(null);
    setError(null);
    setProgress({ done: 0, total: 0 });
    setPhase('idle');
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

  async function convertAll() {
    if (files.length === 0) return;
    clearResults();
    setPhase('working');
    setProgress({ done: 0, total: files.length });
    const used = new Set<string>();
    const converted: ConvertedFile[] = [];
    const failed: Failure[] = [];

    for (const [index, file] of files.entries()) {
      const outcome = await convertImage(file, format, clampQuality(quality));
      if (outcome.ok) {
        const bytes = new Uint8Array(await outcome.outcome.blob.arrayBuffer());
        converted.push({
          name: uniqueFileName(convertFileName(file.name, format), used),
          sourceName: file.name,
          bytes,
          width: outcome.outcome.width,
          height: outcome.outcome.height,
          sourceLabel: outcome.outcome.sourceLabel,
        });
      } else {
        failed.push({ name: file.name, message: outcome.message });
      }
      setProgress({ done: index + 1, total: files.length });
    }

    setResults(converted);
    setFailures(failed);
    if (converted.length === 0) {
      setError(failed[0]?.message ?? 'No image could be converted.');
      setPhase('error');
      return;
    }
    setZip(zipStore(converted.map((entry) => ({ name: entry.name, bytes: entry.bytes }))));
    setPhase('done');
  }

  function updateFormat(next: ConvertFormat) {
    setFormat(next);
    clearResults();
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <div className="card stack">
        <FileDrop
          id="convert-input"
          accept="image/*"
          multiple
          label="Images to convert"
          hint="Select one or several images up to 25 MB each — PNG, JPEG, WebP, AVIF, GIF, BMP, ICO or SVG. Output is a ZIP when more than one succeeds."
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
            {files.length} image{files.length === 1 ? '' : 's'} · {formatBytes(totalBytes)} total
          </p>
        )}

        <div className="field">
          <label className="field__label" htmlFor="convert-format">
            Convert all to
          </label>
          <select
            id="convert-format"
            className="select"
            value={format}
            disabled={!ready || busy}
            onChange={(event) => updateFormat(event.target.value as ConvertFormat)}
          >
            <option value="webp">WebP</option>
            <option value="jpeg">JPEG</option>
            <option value="png">PNG (lossless)</option>
            <option value="bmp">BMP (lossless, large)</option>
            <option value="ico">ICO (16/32/48/256 icon)</option>
          </select>
          <p className="field__hint">
            {format === 'ico'
              ? 'Each image becomes one multi-size .ico; transparency is kept.'
              : keepsTransparency(format)
                ? 'Transparency is kept where the format allows.'
                : 'This format has no transparency; transparent areas become white.'}
          </p>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="convert-quality">
            Quality: {format === 'png' || format === 'bmp' || format === 'ico' ? 'not used for this format' : quality}
          </label>
          <input
            id="convert-quality"
            type="range"
            min={QUALITY_MIN}
            max={QUALITY_MAX}
            step={1}
            value={quality}
            disabled={!ready || busy || format === 'png' || format === 'bmp' || format === 'ico'}
            onChange={(event) => {
              setQuality(Number(event.target.value));
              clearResults();
            }}
          />
        </div>

        <p>
          <button type="button" className="btn btn--primary" disabled={!ready || busy || files.length === 0} onClick={() => void convertAll()}>
            {busy ? `Converting ${progress.done + 1} of ${progress.total}…` : 'Convert the images'}
          </button>
        </p>
      </div>

      <p className="status" role="status" aria-live="polite">
        {phase === 'error'
          ? 'Nothing was produced. The reason is below.'
          : files.length === 0
            ? 'No images yet. Choose one or several.'
            : busy
              ? `Converting ${progress.done} of ${progress.total}. Nothing is uploaded.`
              : phase === 'done'
                ? `${results.length} of ${files.length} converted.`
                : 'Ready to convert.'}
      </p>

      {error && (
        <div className="note note--danger">
          <h2>What happened</h2>
          <p>{error}</p>
        </div>
      )}

      {results.length > 0 && phase === 'done' && (
        <section className="card stack" aria-labelledby="convert-heading">
          <h2 id="convert-heading">Converted files</h2>
          <ul className="converted-list">
            {results.map((entry) => (
              <li key={entry.name}>
                <span>
                  <strong>{entry.name}</strong>
                  <br />
                  <span className="muted">
                    {entry.sourceLabel} → {format.toUpperCase()} · {entry.width} × {entry.height} · {formatBytes(entry.bytes.length)}
                  </span>
                </span>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => downloadBlob(new Blob([entry.bytes], { type: 'application/octet-stream' }), entry.name)}
                >
                  Download
                </button>
              </li>
            ))}
          </ul>

          {failures.length > 0 && (
            <div className="note">
              <h2>{failures.length} file{failures.length === 1 ? '' : 's'} skipped</h2>
              <ul>
                {failures.map((failure) => (
                  <li key={failure.name}>
                    {failure.name}: {failure.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {zip && (
            <p>
              <button
                type="button"
                className="btn btn--primary"
                disabled={results.length === 0}
                onClick={() => downloadBlob(zip, 'converted-images.zip')}
              >
                Download all as .zip
              </button>
            </p>
          )}
          <p className="field__hint">Re-encoding removes EXIF metadata, including camera details and GPS location.</p>
        </section>
      )}
    </div>
  );
}
