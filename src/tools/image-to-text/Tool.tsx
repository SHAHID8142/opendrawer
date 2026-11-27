// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for image-to-text: local OCR with the self-hosted Tesseract worker.
import { useEffect, useRef, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { byteLimitMessage, sniffImage, textFileName } from './engine';
import { readImage } from './ocr';
import type { PreprocessOptions } from './preprocess';

type Phase = 'idle' | 'working' | 'done' | 'error';

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [percent, setPercent] = useState(0);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [options, setOptions] = useState<PreprocessOptions>({ grayscale: false, contrast: false });
  const [ready, setReady] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => setReady(true), []);
  const busy = phase === 'working';

  async function read() {
    if (!file) return;
    setPhase('working');
    setPercent(0);
    setError(null);
    setNotice('');
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await readImage(file, options, setPercent, controller.signal);
      if (result.ok) {
        setText(result.text);
        setPhase('done');
      } else {
        setError(result.message);
        setPhase('error');
      }
    } catch {
      setNotice('Reading was stopped. The image is still here.');
      setPhase('idle');
    } finally {
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setNotice('Copied to the clipboard.');
    } catch {
      setNotice('Your browser blocked the clipboard; select the text and copy it.');
    }
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <div className="card stack">
        <FileDrop
          id="image-input"
          accept="image/png,image/jpeg,image/webp,image/avif"
          label="Image to read"
          hint="PNG, JPEG, WebP or AVIF up to 25 MB. A screenshot, receipt or photographed page works best when the text is sharp."
          buttonLabel="Choose an image"
          pasteEnabled
          working={busy}
          disabled={!ready || busy}
          selectedFile={file ? { name: file.name, size: file.size } : null}
          previewFiles={file ? [file] : []}
          onFiles={(files) => {
            const chosen = files[0];
            if (!chosen) return;
            void (async () => {
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
              setText('');
              setError(null);
              setNotice('');
              setPhase('idle');
            })();
          }}
          onClear={() => {
            setFile(null);
            setText('');
            setError(null);
            setNotice('');
            setPhase('idle');
          }}
        />

        <fieldset className="field">
          <legend className="field__label">Photo clean-up</legend>
          <div className="cluster">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={options.grayscale}
                disabled={!ready || busy}
                onChange={(event) => setOptions({ ...options, grayscale: event.target.checked })}
              />
              Grayscale
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={options.contrast}
                disabled={!ready || busy}
                onChange={(event) => setOptions({ ...options, contrast: event.target.checked })}
              />
              Boost contrast
            </label>
          </div>
          <p className="field__hint">
            Worth trying on dim or coloured photos of printed text. It does not fix blur or handwriting.
          </p>
        </fieldset>

        <p className="cluster">
          <button
            type="button"
            className="btn btn--primary"
            disabled={!ready || busy || file === null}
            onClick={() => void read()}
          >
            {busy ? 'Reading the image…' : 'Read the image'}
          </button>
          {busy && (
            <button type="button" className="btn btn--secondary" onClick={stop}>
              Stop
            </button>
          )}
        </p>

        {busy && (
          <div className="field">
            <label className="field__label" htmlFor="image-progress">
              Recognising text
            </label>
            <progress id="image-progress" className="progress" max={100} value={percent}>
              {percent}%
            </progress>
            <p className="field__hint">{percent}%. The first run also loads the engine, about 18 MB from this site.</p>
          </div>
        )}
      </div>

      <p className="status" role="status" aria-live="polite">
        {!file && 'No image yet. Choose or paste one.'}
        {file && phase === 'idle' && 'Ready to read.'}
        {busy && 'Working in this tab. Nothing is uploaded.'}
        {phase === 'done' && 'Finished. Check the text for OCR mistakes before using it.'}
        {phase === 'error' && 'No text was produced. The reason is below.'}
        {notice && ` ${notice}`}
      </p>

      {error && (
        <div className="note note--danger">
          <h2>What happened</h2>
          <p>{error}</p>
        </div>
      )}

      {phase === 'done' && (
        <section className="card stack" aria-labelledby="image-text-heading">
          <h2 id="image-text-heading">Recognised text</h2>
          <p className="muted">
            OCR is never exact. Fix names, numbers and punctuation by hand; the text below is editable.
          </p>
          <div className="field">
            <label className="field__label" htmlFor="ocr-text">
              Text
            </label>
            <textarea
              id="ocr-text"
              className="textarea"
              rows={12}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </div>
          <p className="cluster">
            <button type="button" className="btn btn--secondary" onClick={() => void copy()}>
              Copy the text
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() =>
                downloadBlob(
                  bytesToBlob(new TextEncoder().encode(text), 'text/plain;charset=utf-8'),
                  textFileName(file?.name ?? 'image'),
                )
              }
            >
              Download as .txt
            </button>
          </p>
        </section>
      )}
    </div>
  );
}
