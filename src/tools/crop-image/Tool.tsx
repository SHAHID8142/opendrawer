// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for crop-image: load, drag a crop box, verify exact pixels, download.
import { useEffect, useRef, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import { byteLimitMessage, sniffImage } from '../../lib/image-format';
import { CropStage } from './CropStage';
import { cropImage } from './crop';
import { clampRect, cropFileName, fullRect, type CropFormat, type CropRect } from './engine';

type Phase = 'idle' | 'working' | 'done' | 'error';

interface Loaded {
  file: File;
  url: string;
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
  const [rect, setRect] = useState<CropRect>({ x: 0, y: 0, width: 1, height: 1 });
  const [format, setFormat] = useState<CropFormat>('png');
  const [phase, setPhase] = useState<Phase>('idle');
  const [output, setOutput] = useState<Output | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const imageUrl = useRef('');
  const outputUrl = useRef('');

  useEffect(() => {
    setReady(true);
    return () => {
      if (imageUrl.current) URL.revokeObjectURL(imageUrl.current);
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
      const width = bitmap.width;
      const height = bitmap.height;
      bitmap.close();
      if (imageUrl.current) URL.revokeObjectURL(imageUrl.current);
      const url = URL.createObjectURL(chosen);
      imageUrl.current = url;
      setImage({ file: chosen, url, width, height });
      setRect(fullRect(width, height));
    } catch {
      setImage(null);
      setError('The image could not be decoded. Re-export it as PNG or JPEG and try again.');
      setPhase('error');
    }
  }

  async function crop() {
    if (!image) return;
    clearOutput();
    setPhase('working');
    const result = await cropImage(image.file, rect, format);
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

  function setField(field: keyof CropRect, value: number) {
    if (!image) return;
    setRect(clampRect({ ...rect, [field]: value }, image.width, image.height));
    clearOutput();
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <div className="card stack">
        <FileDrop
          id="crop-input"
          accept="image/png,image/jpeg,image/webp,image/avif"
          label="Image to crop"
          hint="PNG, JPEG, WebP or AVIF up to 25 MB. Drag the box to move it and the corner to resize."
          buttonLabel="Choose an image"
          working={busy}
          disabled={!ready || busy}
          selectedFile={image ? { name: image.file.name, size: image.file.size } : null}
          previewFiles={[]}
          onFiles={(files) => void choose(files)}
          onClear={() => {
            clearOutput();
            setImage(null);
            if (imageUrl.current) {
              URL.revokeObjectURL(imageUrl.current);
              imageUrl.current = '';
            }
          }}
        />

        {image && (
          <>
            <CropStage
              url={image.url}
              width={image.width}
              height={image.height}
              rect={rect}
              onRect={(next) => {
                setRect(next);
                clearOutput();
              }}
            />
            <p className="field__hint">
              Image {image.width} × {image.height} · selection {rect.width} × {rect.height}
            </p>

            <div className="crop-fields">
              {(['x', 'y', 'width', 'height'] as const).map((field) => (
                <div className="field" key={field}>
                  <label className="field__label" htmlFor={`crop-${field}`}>
                    {field === 'x' ? 'Left (px)' : field === 'y' ? 'Top (px)' : field === 'width' ? 'Width (px)' : 'Height (px)'}
                  </label>
                  <input
                    id={`crop-${field}`}
                    className="input"
                    type="number"
                    min={field === 'width' || field === 'height' ? 1 : 0}
                    max={field === 'width' ? image.width : field === 'height' ? image.height : undefined}
                    value={rect[field]}
                    disabled={busy}
                    onChange={(event) => setField(field, Number(event.target.value))}
                  />
                </div>
              ))}
            </div>

            <div className="form__row">
              <div className="field">
                <label className="field__label" htmlFor="crop-format">
                  Output format
                </label>
                <select
                  id="crop-format"
                  className="select"
                  value={format}
                  disabled={busy}
                  onChange={(event) => {
                    setFormat(event.target.value as CropFormat);
                    clearOutput();
                  }}
                >
                  <option value="png">PNG (lossless)</option>
                  <option value="jpeg">JPEG</option>
                  <option value="webp">WebP</option>
                </select>
              </div>
              <div className="field">
                <span className="field__label">Output</span>
                <p className="field__hint">
                  {rect.width} × {rect.height} pixels
                </p>
              </div>
            </div>

            <p>
              <button type="button" className="btn btn--primary" disabled={!ready || busy} onClick={() => void crop()}>
                {busy ? 'Cropping…' : 'Crop the image'}
              </button>
            </p>
          </>
        )}
      </div>

      <p className="status" role="status" aria-live="polite">
        {phase === 'error'
          ? 'Nothing was produced. The reason is below.'
          : !image
            ? 'No image yet. Choose one, then drag the crop box.'
            : busy
              ? 'Cropping in this tab. Nothing is uploaded.'
              : phase === 'done' && output
                ? `Cropped to ${output.width} × ${output.height}.`
                : 'Ready to crop.'}
      </p>

      {error && (
        <div className="note note--danger">
          <h2>What happened</h2>
          <p>{error}</p>
        </div>
      )}

      {output && phase === 'done' && image && (
        <section className="card stack" aria-labelledby="crop-heading">
          <h2 id="crop-heading">Result</h2>
          <div className="compressed-preview">
            <img src={output.url} alt="Cropped preview" />
          </div>
          <p>
            {output.width} × {output.height} pixels · {formatBytes(output.blob.size)}
          </p>
          <p>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => downloadBlob(output.blob, cropFileName(image.file.name, format))}
            >
              Download the cropped image
            </button>
          </p>
        </section>
      )}
    </div>
  );
}
