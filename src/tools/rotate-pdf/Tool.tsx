// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for rotate-pdf: pick an angle and a page selection, rotate, download.
import { useEffect, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { parsePageSelection, validatePageRangeSyntax } from '../../lib/page-range';
import { countPdfPages } from '../../lib/pdf';
import { rotatePdf, type RotationAngle } from './engine';

const ANGLE_OPTIONS: { value: RotationAngle; label: string }[] = [
  { value: 90, label: '90° clockwise' },
  { value: 180, label: '180° (upside down, then back)' },
  { value: 270, label: '270° clockwise (90° anticlockwise)' },
];

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [angle, setAngle] = useState<RotationAngle>(90);
  const [range, setRange] = useState('');
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [rotatedCount, setRotatedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  const busy = phase === 'working';
  const syntaxError = validatePageRangeSyntax(range);
  const boundsError =
    pageCount !== null && syntaxError === null
      ? (() => {
          try {
            parsePageSelection(range, pageCount);
            return null;
          } catch (cause) {
            return cause instanceof Error ? cause.message : 'That range is outside the document.';
          }
        })()
      : null;

  async function choose(chosen: File) {
    setFile(chosen);
    setBytes(null);
    setRotatedCount(null);
    setError(null);
    setPhase('idle');
    setPageCount(null);
    const data = new Uint8Array(await chosen.arrayBuffer());
    setBytes(data);
    const count = await countPdfPages(data);
    setPageCount(count);
    if (count === null) {
      setError('That file could not be read as a PDF. It may be damaged or password protected.');
      setPhase('error');
    }
  }

  async function rotate() {
    if (!file || !bytes || pageCount === null) return;
    setRotatedCount(null);
    setError(null);
    setPhase('working');
    try {
      const pages = parsePageSelection(range, pageCount);
      const result = await rotatePdf({ name: file.name, bytes }, angle, pages);
      if (!result.ok) {
        setError(result.message);
        setPhase('error');
        return;
      }
      setBytes(result.bytes);
      setRotatedCount(result.pageCount);
      setPhase('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The pages could not be rotated.');
      setPhase('error');
    }
  }

  function save() {
    if (!bytes || !file) return;
    const base = file.name.replace(/\.pdf$/i, '');
    downloadBlob(bytesToBlob(bytes, 'application/pdf'), `${base}-rotated.pdf`);
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <FileDrop
        id="rotate-input"
        accept="application/pdf,.pdf"
        label="Choose the PDF to rotate"
        hint="It stays on this device. Rotation is a page setting, so text stays selectable."
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
          setBytes(null);
          setPageCount(null);
          setRotatedCount(null);
          setError(null);
          setPhase('idle');
        }}
        onFiles={(chosen) => {
          const first = chosen[0];
          if (first) void choose(first);
        }}
      />

      {file && pageCount !== null && (
        <div className="card">
          <fieldset className="fieldset" disabled={!ready || busy}>
            <legend>Rotation</legend>

            <div className="field">
              <label className="field__label" htmlFor="rotate-angle">
                Turn the pages
              </label>
              <select
                id="rotate-angle"
                className="select"
                value={angle}
                onChange={(event) => {
                  setAngle(Number(event.target.value) as RotationAngle);
                  setRotatedCount(null);
                  setPhase('idle');
                }}
              >
                {ANGLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="rotate-range">
                Pages (leave empty for all)
              </label>
              <input
                id="rotate-range"
                className="input"
                type="text"
                inputMode="numeric"
                placeholder="for example 1-3, 7"
                value={range}
                aria-invalid={syntaxError || boundsError ? 'true' : undefined}
                aria-describedby="rotate-range-help"
                onChange={(event) => {
                  setRange(event.target.value);
                  setRotatedCount(null);
                  setPhase('idle');
                }}
              />
              <p id="rotate-range-help" className="field__hint">
                This document has {pageCount} page{pageCount === 1 ? '' : 's'}. Rotation is added to
                any rotation already in the file.
              </p>
              {(syntaxError || boundsError) && (
                <p className="field__error" role="alert">
                  {syntaxError ?? boundsError}
                </p>
              )}
            </div>
          </fieldset>

          <p>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!ready || busy || syntaxError !== null || boundsError !== null}
              onClick={() => void rotate()}
            >
              {busy ? 'Rotating…' : 'Rotate the pages'}
            </button>
          </p>
        </div>
      )}

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' && !file && 'No file yet. Choose a PDF to begin.'}
        {phase === 'idle' && file && pageCount !== null && `${pageCount} pages ready.`}
        {phase === 'working' && 'Rotating…'}
        {phase === 'done' && rotatedCount !== null && `Rotated ${rotatedCount} page${rotatedCount === 1 ? '' : 's'}.`}
        {phase === 'error' && 'The pages were not rotated. The reason is below.'}
      </p>

      {error && (
        <div className="note note--danger">
          <h2>What happened</h2>
          <p>{error}</p>
        </div>
      )}

      {rotatedCount !== null && bytes && (
        <section className="card" aria-labelledby="rotate-result-heading">
          <h2 id="rotate-result-heading">Your rotated PDF</h2>
          <p className="result-summary">
            <span>
              {pageCount} page{pageCount === 1 ? '' : 's'}
            </span>
            <span>{rotatedCount} rotated</span>
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
