// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for watermark-pdf: text, angle, opacity and size, then download.
import { useEffect, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import { countPdfPages } from '../../lib/pdf';
import { MAX_TEXT_LENGTH, watermarkPdf } from './engine';

const OPACITIES = [0.15, 0.25, 0.35, 0.5];
const SIZES = [24, 36, 48, 64];
type Phase = 'idle' | 'working' | 'done' | 'error';

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [diagonal, setDiagonal] = useState(true);
  const [opacity, setOpacity] = useState(0.25);
  const [size, setSize] = useState(48);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [out, setOut] = useState<{ bytes: Uint8Array; watermarked: number } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  const busy = phase === 'working';
  const textReady = text.trim().length > 0;

  async function choose(chosen: File) {
    setFile(chosen);
    setOut(null);
    setPhase('idle');
    setError(null);
    setPageCount(null);
    const count = await countPdfPages(new Uint8Array(await chosen.arrayBuffer()));
    setPageCount(count);
    if (count === null) {
      setError('That file could not be read as a PDF. It may be damaged or password protected.');
      setPhase('error');
    }
  }

  async function apply() {
    if (!file) return;
    setPhase('working');
    setError(null);
    setOut(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = await watermarkPdf({ name: file.name, bytes }, { text, diagonal, opacity, size });
      if (!result.ok) {
        setError(result.message);
        setPhase('error');
        return;
      }
      setOut({ bytes: result.bytes, watermarked: result.watermarked });
      setPhase('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The watermark could not be added.');
      setPhase('error');
    }
  }

  function save() {
    if (!out || !file) return;
    const base = file.name.replace(/\.pdf$/i, '');
    downloadBlob(bytesToBlob(out.bytes, 'application/pdf'), `${base}-watermarked.pdf`);
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <FileDrop
        id="watermark-input"
        accept="application/pdf,.pdf"
        label="Choose the PDF to watermark"
        hint="It stays on this device. The text is added on top of every page."
        buttonLabel="Choose a PDF"
        disabled={!ready}
        selectedFile={
          file
            ? {
                name: file.name,
                size: file.size,
                detail: pageCount === null ? undefined : `${pageCount} pages`,
              }
            : null
        }
        onClear={() => {
          setFile(null);
          setPageCount(null);
          setOut(null);
          setPhase('idle');
          setError(null);
        }}
        onFiles={(chosen) => {
          const first = chosen[0];
          if (first) void choose(first);
        }}
      />

      {file && pageCount !== null && (
        <div className="card">
          <fieldset className="fieldset" disabled={!ready || busy}>
            <legend>Watermark</legend>

            <div className="field">
              <label className="field__label" htmlFor="watermark-text">
                Text
              </label>
              <input
                id="watermark-text"
                className="input"
                type="text"
                maxLength={MAX_TEXT_LENGTH}
                placeholder="for example CONFIDENTIAL"
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  setOut(null);
                  setPhase('idle');
                }}
              />
              <p className="field__hint">
                Up to {MAX_TEXT_LENGTH} characters. It is drawn on every page at the centre.
              </p>
            </div>

            <div className="form__row">
              <div className="field">
                <label className="field__label" htmlFor="watermark-position">
                  Angle
                </label>
                <select
                  id="watermark-position"
                  className="select"
                  value={diagonal ? 'diagonal' : 'horizontal'}
                  onChange={(event) => {
                    setDiagonal(event.target.value === 'diagonal');
                    setOut(null);
                    setPhase('idle');
                  }}
                >
                  <option value="diagonal">Diagonal, 45°</option>
                  <option value="horizontal">Horizontal</option>
                </select>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="watermark-opacity">
                  Opacity
                </label>
                <select
                  id="watermark-opacity"
                  className="select"
                  value={String(opacity)}
                  onChange={(event) => {
                    setOpacity(Number(event.target.value));
                    setOut(null);
                    setPhase('idle');
                  }}
                >
                  {OPACITIES.map((value) => (
                    <option key={value} value={value}>
                      {Math.round(value * 100)}%
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="watermark-size">
                  Size
                </label>
                <select
                  id="watermark-size"
                  className="select"
                  value={String(size)}
                  onChange={(event) => {
                    setSize(Number(event.target.value));
                    setOut(null);
                    setPhase('idle');
                  }}
                >
                  {SIZES.map((value) => (
                    <option key={value} value={value}>
                      {value} pt
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          <p>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!ready || busy || !textReady}
              onClick={() => void apply()}
            >
              {busy ? 'Adding the watermark…' : 'Add the watermark'}
            </button>
          </p>
        </div>
      )}

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' && !file && 'No file yet. Choose a PDF to begin.'}
        {phase === 'idle' && file && pageCount !== null && `${pageCount} pages ready.`}
        {phase === 'working' && 'Adding the watermark…'}
        {phase === 'done' && out && `Watermarked ${out.watermarked} page${out.watermarked === 1 ? '' : 's'}.`}
        {phase === 'error' && 'The watermark was not added. The reason is below.'}
      </p>

      {error && (
        <div className="note note--danger">
          <h2>What happened</h2>
          <p>{error}</p>
        </div>
      )}

      {out && (
        <section className="card" aria-labelledby="watermark-result-heading">
          <h2 id="watermark-result-heading">Your watermarked PDF</h2>
          <p className="result-summary">
            <span>
              {out.watermarked} page{out.watermarked === 1 ? '' : 's'}
            </span>
            <span>{formatBytes(out.bytes.length)}</span>
          </p>
          <p>
            <button type="button" className="btn btn--primary" onClick={save}>
              Download the PDF
            </button>
          </p>
          <p className="muted">Written in this tab. Nothing is stored after you close it.</p>
        </section>
      )}
    </div>
  );
}
