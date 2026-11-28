// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for rotate-image: quarter turns and flips, then a local canvas render.
import { useEffect, useRef, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import { byteLimitMessage, sniffImage } from '../../lib/image-format';
import {
  describeTransform,
  nextRotation,
  rotateFileName,
  transformSize,
  type RotateFormat,
  type Rotation,
  type TransformState,
} from './engine';
import { rotateImage } from './transform';

type Phase = 'idle' | 'working' | 'done' | 'error';

interface Loaded {
  file: File;
  width: number;
  height: number;
}

interface Output {
  blob: Blob;
  url: string;
  width: number;
  height: number;
}

export default function Tool() {
  const [image, setImage] = useState<Loaded | null>(null);
  const [state, setState] = useState<TransformState>({
    rotation: 0,
    flipHorizontal: false,
    flipVertical: false,
  });
  const [format, setFormat] = useState<RotateFormat>('png');
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

  function update(next: Partial<TransformState>) {
    setState({ ...state, ...next });
    clearOutput();
  }

  async function choose(files: File[]) {
    const chosen = files[0];
    if (!chosen) return;
    clearOutput();
    setState({ rotation: 0, flipHorizontal: false, flipVertical: false });
    const tooBig = byteLimitMessage(chosen.size);
    if (tooBig !== null) {
      setImage(null);
      setError(tooBig);
      setPhase('error');
      return;
    }
    const sniffed = sniffImage(new Uint8Array(await chosen.arrayBuffer()));
    if (!sniffed.ok) {
      setImage(null);
      setError(sniffed.message);
      setPhase('error');
      return;
    }
    try {
      const bitmap = await createImageBitmap(chosen);
      setImage({ file: chosen, width: bitmap.width, height: bitmap.height });
      bitmap.close();
    } catch {
      setImage(null);
      setError('The image could not be decoded. Re-export it as PNG or JPEG and try again.');
      setPhase('error');
    }
  }

  async function apply() {
    if (!image) return;
    clearOutput();
    setPhase('working');
    const result = await rotateImage(image.file, state, format);
    if (!result.ok) {
      setError(result.message);
      setPhase('error');
      return;
    }
    const url = URL.createObjectURL(result.outcome.blob);
    outputUrl.current = url;
    setOutput({ blob: result.outcome.blob, url, width: result.outcome.width, height: result.outcome.height });
    setPhase('done');
  }

  const size = image ? transformSize(image.width, image.height, state.rotation) : null;

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <div className="card stack">
        <FileDrop
          id="rotate-input"
          accept="image/png,image/jpeg,image/webp,image/avif"
          label="Image to rotate or flip"
          hint="PNG, JPEG, WebP or AVIF up to 25 MB. Rotate in 90° steps and flip either way."
          buttonLabel="Choose an image"
          working={busy}
          disabled={!ready || busy}
          selectedFile={image ? { name: image.file.name, size: image.file.size } : null}
          previewFiles={image ? [image.file] : []}
          onFiles={(files) => void choose(files)}
          onClear={() => {
            setImage(null);
            clearOutput();
          }}
        />

        {image && (
          <>
            <p className="cluster">
              <button
                type="button"
                className="btn btn--secondary"
                disabled={busy}
                onClick={() => update({ rotation: nextRotation(state.rotation, 'left') as Rotation })}
              >
                Rotate left
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                disabled={busy}
                onClick={() => update({ rotation: nextRotation(state.rotation, 'right') as Rotation })}
              >
                Rotate right
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                disabled={busy}
                onClick={() => update({ flipHorizontal: !state.flipHorizontal })}
              >
                Flip horizontal
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                disabled={busy}
                onClick={() => update({ flipVertical: !state.flipVertical })}
              >
                Flip vertical
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                disabled={busy}
                onClick={() => update({ rotation: 0, flipHorizontal: false, flipVertical: false })}
              >
                Reset
              </button>
            </p>

            <p className="muted">
              {describeTransform(state)}. Output will be {size?.width} × {size?.height} pixels.
            </p>

            <div className="field">
              <label className="field__label" htmlFor="rotate-format">
                Output format
              </label>
              <select
                id="rotate-format"
                className="select"
                value={format}
                disabled={busy}
                onChange={(event) => {
                  setFormat(event.target.value as RotateFormat);
                  clearOutput();
                }}
              >
                <option value="png">PNG (lossless)</option>
                <option value="jpeg">JPEG</option>
                <option value="webp">WebP</option>
              </select>
            </div>

            <p>
              <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void apply()}>
                {busy ? 'Rotating…' : 'Apply and preview'}
              </button>
            </p>
          </>
        )}
      </div>

      <p className="status" role="status" aria-live="polite">
        {phase === 'error'
          ? 'Nothing was produced. The reason is below.'
          : !image
            ? 'No image yet. Choose one to rotate or flip.'
            : busy
              ? 'Rendering in this tab. Nothing is uploaded.'
              : phase === 'done' && output
                ? `Rendered ${output.width} × ${output.height} pixels.`
                : 'Ready to apply.'}
      </p>

      {error && (
        <div className="note note--danger">
          <h2>What happened</h2>
          <p>{error}</p>
        </div>
      )}

      {output && phase === 'done' && image && (
        <section className="card stack" aria-labelledby="rotate-heading">
          <h2 id="rotate-heading">Result</h2>
          <div className="compressed-preview">
            <img src={output.url} alt="Rotated preview" />
          </div>
          <p>
            {output.width} × {output.height} pixels · {formatBytes(output.blob.size)}
          </p>
          <p>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => downloadBlob(output.blob, rotateFileName(image.file.name, format))}
            >
              Download the image
            </button>
          </p>
          <p className="field__hint">Re-encoding removes EXIF metadata, including any orientation tag.</p>
        </section>
      )}
    </div>
  );
}
