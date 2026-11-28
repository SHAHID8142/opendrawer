// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for rotate-image: one orientation applied to one image or a whole batch.
import { useEffect, useRef, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { decodeImageFile } from '../../lib/decode-image';
import { byteLimitMessage } from '../../lib/image-format';
import { zipStore } from '../../lib/zip';
import {
  describeTransform,
  nextRotation,
  rotateFileName,
  uniqueRotateName,
  type RotateFormat,
  type TransformState,
} from './engine';
import { ResultList } from './ResultList';
import { rotateImage } from './transform';
import type { Failure, RotatedFile } from './types';

type Phase = 'idle' | 'working' | 'done' | 'error';

export default function Tool() {
  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<TransformState>({
    rotation: 0,
    flipHorizontal: false,
    flipVertical: false,
  });
  const [format, setFormat] = useState<RotateFormat>('png');
  const [phase, setPhase] = useState<Phase>('idle');
  const [results, setResults] = useState<RotatedFile[]>([]);
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

  function update(next: Partial<TransformState>) {
    setState({ ...state, ...next });
    clearResults();
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

  async function rotateAll() {
    if (files.length === 0) return;
    clearResults();
    setPhase('working');
    setProgress({ done: 0, total: files.length });
    const used = new Set<string>();
    const rotated: RotatedFile[] = [];
    const failed: Failure[] = [];

    for (const [index, file] of files.entries()) {
      const outcome = await rotateImage(file, state, format);
      if (outcome.ok) {
        rotated.push({
          name: uniqueRotateName(rotateFileName(file.name, format), used),
          sourceName: file.name,
          blob: outcome.outcome.blob,
          width: outcome.outcome.width,
          height: outcome.outcome.height,
        });
      } else {
        failed.push({ name: file.name, message: outcome.message });
      }
      setProgress({ done: index + 1, total: files.length });
    }

    setResults(rotated);
    setFailures(failed);
    if (rotated.length === 0) {
      setError(failed[0]?.message ?? 'No image could be transformed.');
      setPhase('error');
      return;
    }

    const first = rotated[0];
    if (first) {
      const url = URL.createObjectURL(first.blob);
      previewRef.current = url;
      setPreviewUrl(url);
    }
    const bytes = await Promise.all(
      rotated.map(async (entry) => ({ name: entry.name, bytes: new Uint8Array(await entry.blob.arrayBuffer()) })),
    );
    setZip(zipStore(bytes));
    setPhase('done');
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <div className="card stack">
        <FileDrop
          id="rotate-input"
          accept="image/*"
          multiple
          label="Images to rotate or flip"
          hint="Select one or several images up to 25 MB each. The same orientation is applied to every file."
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
          <p className="muted">{files.length} image{files.length === 1 ? '' : 's'} selected</p>
        )}

        <p className="cluster">
          <button
            type="button"
            className="btn btn--secondary"
            disabled={busy}
            onClick={() => update({ rotation: nextRotation(state.rotation, 'left') })}
          >
            Rotate left
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            disabled={busy}
            onClick={() => update({ rotation: nextRotation(state.rotation, 'right') })}
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
        <p className="muted">{describeTransform(state)}. Applied to every selected image.</p>

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
              clearResults();
            }}
          >
            <option value="png">PNG (lossless)</option>
            <option value="jpeg">JPEG</option>
            <option value="webp">WebP</option>
          </select>
        </div>

        <p>
          <button type="button" className="btn btn--primary" disabled={!ready || busy || files.length === 0} onClick={() => void rotateAll()}>
            {busy ? `Rotating ${progress.done + 1} of ${progress.total}…` : 'Rotate the images'}
          </button>
        </p>
      </div>

      <p className="status" role="status" aria-live="polite">
        {phase === 'error'
          ? 'Nothing was produced. The reason is below.'
          : files.length === 0
            ? 'No images yet. Choose one or several.'
            : busy
              ? `Rotating ${progress.done} of ${progress.total}. Nothing is uploaded.`
              : phase === 'done'
                ? `${results.length} of ${files.length} transformed.`
                : 'Ready to apply.'}
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
