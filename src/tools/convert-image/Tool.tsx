// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for convert-image: change the encoding locally and preview the result.
import { useEffect, useRef, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import { byteLimitMessage } from '../../lib/image-format';
import { convertImage } from './convert';
import { decodeImageFile } from './decode';
import {
  QUALITY_MAX,
  QUALITY_MIN,
  clampQuality,
  convertFileName,
  keepsTransparency,
  type ConvertFormat,
} from './engine';

type Phase = 'idle' | 'working' | 'done' | 'error';

interface Output {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  sourceLabel: string;
}

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<ConvertFormat>('webp');
  const [quality, setQuality] = useState(85);
  const [phase, setPhase] = useState<Phase>('idle');
  const [output, setOutput] = useState<Output | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const outputUrl = useRef('');

  useEffect(() => {
    setReady(true);
    return () => {
      if (outputUrl.current) URL.revokeObjectURL(outputUrl.current);
    };
  }, []);

  const busy = phase === 'working';

  function clearOutput() {
    setOutput(null);
    setError(null);
    setPhase('idle');
    if (outputUrl.current) {
      URL.revokeObjectURL(outputUrl.current);
      outputUrl.current = '';
    }
  }

  async function choose(files: File[]) {
    const chosen = files[0];
    if (!chosen) return;
    clearOutput();
    const tooBig = byteLimitMessage(chosen.size);
    if (tooBig !== null) {
      setFile(null);
      setError(tooBig);
      setPhase('error');
      return;
    }
    const decoded = await decodeImageFile(chosen);
    if (!decoded) {
      setFile(null);
      setError(
        'That file could not be decoded as an image. This browser reads PNG, JPEG, WebP, AVIF, GIF, BMP, ICO and SVG; HEIC and TIFF depend on the browser.',
      );
      setPhase('error');
      return;
    }
    decoded.close();
    setFile(chosen);
  }

  async function convert() {
    if (!file) return;
    clearOutput();
    setPhase('working');
    const result = await convertImage(file, format, clampQuality(quality));
    if (!result.ok) {
      setError(result.message);
      setPhase('error');
      return;
    }
    const url = URL.createObjectURL(result.outcome.blob);
    outputUrl.current = url;
    setOutput({ ...result.outcome, url });
    setPhase('done');
  }

  const larger = output !== null && file !== null && output.blob.size >= file.size;

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <div className="card stack">
        <FileDrop
          id="convert-input"
          accept="image/*"
          label="Image to convert"
          hint="Any image your browser can read, up to 25 MB: PNG, JPEG, WebP, AVIF, GIF, BMP, ICO or SVG. The pixels stay the same; only the encoding changes."
          buttonLabel="Choose an image"
          working={busy}
          disabled={!ready || busy}
          selectedFile={file ? { name: file.name, size: file.size } : null}
          previewFiles={file ? [file] : []}
          onFiles={(files) => void choose(files)}
          onClear={() => {
            setFile(null);
            clearOutput();
          }}
        />

        <div className="field">
          <label className="field__label" htmlFor="convert-format">
            Convert to
          </label>
          <select
            id="convert-format"
            className="select"
            value={format}
            disabled={!ready || busy}
            onChange={(event) => {
              setFormat(event.target.value as ConvertFormat);
              clearOutput();
            }}
          >
            <option value="webp">WebP</option>
            <option value="jpeg">JPEG</option>
            <option value="png">PNG (lossless)</option>
            <option value="bmp">BMP (lossless, large)</option>
            <option value="ico">ICO (256 × 256 icon)</option>
          </select>
          <p className="field__hint">
            {format === 'ico'
              ? 'One .ico holds 16, 32, 48 and 256 px PNG icons; transparency is kept.'
              : keepsTransparency(format)
                ? 'Transparency is kept.'
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
              clearOutput();
            }}
          />
        </div>

        <p>
          <button type="button" className="btn btn--primary" disabled={!ready || busy || file === null} onClick={() => void convert()}>
            {busy ? 'Converting…' : 'Convert the image'}
          </button>
        </p>
      </div>

      <p className="status" role="status" aria-live="polite">
        {phase === 'error'
          ? 'Nothing was produced. The reason is below.'
          : !file
            ? 'No image yet. Choose one to convert.'
            : busy
              ? 'Encoding in this tab. Nothing is uploaded.'
              : phase === 'done' && output
                ? `${output.sourceLabel} converted to ${format === 'ico' ? 'ICO' : format.toUpperCase()}.`
                : 'Ready to convert.'}
      </p>

      {error && (
        <div className="note note--danger">
          <h2>What happened</h2>
          <p>{error}</p>
        </div>
      )}

      {output && phase === 'done' && file && (
        <section className="card stack" aria-labelledby="convert-heading">
          <h2 id="convert-heading">Result</h2>
          <div className="compressed-preview">
            <img src={output.url} alt="Converted preview" />
          </div>
          <dl className="stat-grid">
            <div><dt>From</dt><dd>{output.sourceLabel}</dd></div>
            <div><dt>To</dt><dd>{format.toUpperCase()}</dd></div>
            <div><dt>Dimensions</dt><dd>{output.width} × {output.height}</dd></div>
            <div><dt>Size</dt><dd>{formatBytes(file.size)} → {formatBytes(output.blob.size)}</dd></div>
          </dl>
          {larger && (
            <div className="note">
              <h2>This output is larger</h2>
              <p>The new encoding needs more bytes. Try WebP at a lower quality, or keep the original.</p>
            </div>
          )}
          <p>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => downloadBlob(output.blob, convertFileName(file.name, format))}
            >
              Download the converted image
            </button>
          </p>
          <p className="field__hint">Re-encoding removes EXIF metadata, including camera details and GPS location.</p>
        </section>
      )}
    </div>
  );
}
