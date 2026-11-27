// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for compress-image: local resize and JPEG/WebP/PNG re-encoding with before/after sizes.
import { useEffect, useRef, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import { byteLimitMessage, sniffImage } from '../../lib/image-format';
import { compressImage, type CompressResult } from './compress';
import {
  MAX_EDGE_OPTIONS,
  QUALITY_MAX,
  QUALITY_MIN,
  clampQuality,
  outputName,
  type OutputFormat,
} from './engine';

type Phase = 'idle' | 'working' | 'done' | 'error';

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<OutputFormat>('jpeg');
  const [quality, setQuality] = useState(80);
  const [maxEdge, setMaxEdge] = useState(1920);
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<CompressResult | null>(null);
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

  function resetResult() {
    setResult(null);
    setError(null);
    setPhase('idle');
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = '';
      setPreviewUrl('');
    }
  }

  async function choose(files: File[]) {
    const chosen = files[0];
    if (!chosen) return;
    resetResult();
    const tooBig = byteLimitMessage(chosen.size);
    if (tooBig !== null) {
      setFile(null);
      setError(tooBig);
      setPhase('error');
      return;
    }
    const sniffed = sniffImage(new Uint8Array(await chosen.arrayBuffer()));
    if (!sniffed.ok) {
      setFile(null);
      setError(sniffed.message);
      setPhase('error');
      return;
    }
    setFile(chosen);
  }

  async function compress() {
    if (!file) return;
    resetResult();
    setPhase('working');
    const outcome = await compressImage(file, { format, quality: clampQuality(quality), maxEdge });
    if (!outcome.ok) {
      setError(outcome.message);
      setPhase('error');
      return;
    }
    setResult(outcome.result);
    const url = URL.createObjectURL(outcome.result.blob);
    previewRef.current = url;
    setPreviewUrl(url);
    setPhase('done');
  }

  const saved =
    result === null ? 0 : Math.round((1 - result.blob.size / result.originalBytes) * 100);
  const larger = result !== null && result.blob.size >= result.originalBytes;

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <div className="card stack">
        <FileDrop
          id="compress-input"
          accept="image/png,image/jpeg,image/webp,image/avif"
          label="Image to compress"
          hint="PNG, JPEG, WebP or AVIF up to 25 MB. Photos and screenshots work; animated images keep one frame."
          buttonLabel="Choose an image"
          working={busy}
          disabled={!ready || busy}
          selectedFile={file ? { name: file.name, size: file.size } : null}
          previewFiles={file ? [file] : []}
          onFiles={(files) => void choose(files)}
          onClear={() => {
            setFile(null);
            resetResult();
          }}
        />

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
                resetResult();
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
                resetResult();
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
              resetResult();
            }}
          />
          <p className="field__hint">Lower is smaller and softer. PNG keeps every pixel, so quality does not apply.</p>
        </div>

        <p>
          <button type="button" className="btn btn--primary" disabled={!ready || busy || file === null} onClick={() => void compress()}>
            {busy ? 'Compressing…' : 'Compress the image'}
          </button>
        </p>
      </div>

      <p className="status" role="status" aria-live="polite">
        {phase === 'error'
          ? 'Nothing was produced. The reason is below.'
          : !file
            ? 'No image yet. Choose one to see the trade-off.'
            : busy
              ? 'Re-encoding in this tab. Nothing is uploaded.'
              : phase === 'done' && result
                ? `${formatBytes(result.originalBytes)} → ${formatBytes(result.blob.size)}.`
                : 'Ready to compress.'}
      </p>

      {error && (
        <div className="note note--danger">
          <h2>What happened</h2>
          <p>{error}</p>
        </div>
      )}

      {result && phase === 'done' && (
        <section className="card stack" aria-labelledby="compress-heading">
          <h2 id="compress-heading">Result</h2>
          <dl className="stat-grid">
            <div><dt>Original</dt><dd>{formatBytes(result.originalBytes)}</dd></div>
            <div><dt>New size</dt><dd>{formatBytes(result.blob.size)}</dd></div>
            <div><dt>Saved</dt><dd>{larger ? 'No saving' : `${saved}%`}</dd></div>
            <div>
              <dt>Dimensions</dt>
              <dd>
                {result.originalWidth} × {result.originalHeight} → {result.width} × {result.height}
              </dd>
            </div>
          </dl>

          {larger && (
            <div className="note">
              <h2>This output is larger</h2>
              <p>
                Re-encoding added bytes. Try WebP at a lower quality, a smaller size, or keep the original.
              </p>
            </div>
          )}

          {previewUrl && (
            <div className="compressed-preview">
              <img src={previewUrl} alt="Compressed preview" />
            </div>
          )}

          <p>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => downloadBlob(result.blob, outputName(file?.name ?? 'image', format))}
            >
              Download the image
            </button>
          </p>
          <p className="field__hint">Metadata such as camera and location is removed by re-encoding.</p>
        </section>
      )}
    </div>
  );
}
