// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for page-numbers: position, format and a start number, then download.
import { useEffect, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import { countPdfPages } from '../../lib/pdf';
import { addPageNumbers, type NumberFormat, type NumberPosition } from './engine';

const POSITIONS: { value: NumberPosition; label: string }[] = [
  { value: 'bottom-center', label: 'Bottom, centred' },
  { value: 'bottom-right', label: 'Bottom, right' },
  { value: 'bottom-left', label: 'Bottom, left' },
  { value: 'top-center', label: 'Top, centred' },
  { value: 'top-right', label: 'Top, right' },
  { value: 'top-left', label: 'Top, left' },
];

const FORMATS: { value: NumberFormat; label: string }[] = [
  { value: 'number', label: '1' },
  { value: 'page', label: 'Page 1' },
  { value: 'page-of-total', label: 'Page 1 of 10' },
];

type Phase = 'idle' | 'working' | 'done' | 'error';

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [position, setPosition] = useState<NumberPosition>('bottom-center');
  const [format, setFormat] = useState<NumberFormat>('page-of-total');
  const [start, setStart] = useState(1);
  const [skipFirst, setSkipFirst] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [out, setOut] = useState<{ bytes: Uint8Array; numbered: number } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  const busy = phase === 'working';
  const startValid = Number.isInteger(start) && start >= 1;
  const skipProblem = skipFirst && pageCount !== null && pageCount < 2;

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

  async function number() {
    if (!file) return;
    setPhase('working');
    setError(null);
    setOut(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = await addPageNumbers(
        { name: file.name, bytes },
        { position, format, start, skipFirst },
      );
      if (!result.ok) {
        setError(result.message);
        setPhase('error');
        return;
      }
      setOut({ bytes: result.bytes, numbered: result.numbered });
      setPhase('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The numbers could not be written.');
      setPhase('error');
    }
  }

  function save() {
    if (!out || !file) return;
    const base = file.name.replace(/\.pdf$/i, '');
    downloadBlob(bytesToBlob(out.bytes, 'application/pdf'), `${base}-numbered.pdf`);
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <FileDrop
        id="numbers-input"
        accept="application/pdf,.pdf"
        label="Choose the PDF to number"
        hint="It stays on this device. Numbers are added as a text layer; pages are not re-rendered."
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
            <legend>Numbering</legend>

            <div className="form__row">
              <div className="field">
                <label className="field__label" htmlFor="numbers-position">
                  Position
                </label>
                <select
                  id="numbers-position"
                  className="select"
                  value={position}
                  onChange={(event) => {
                    setPosition(event.target.value as NumberPosition);
                    setOut(null);
                    setPhase('idle');
                  }}
                >
                  {POSITIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="numbers-format">
                  Format
                </label>
                <select
                  id="numbers-format"
                  className="select"
                  value={format}
                  onChange={(event) => {
                    setFormat(event.target.value as NumberFormat);
                    setOut(null);
                    setPhase('idle');
                  }}
                >
                  {FORMATS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="numbers-start">
                  First number
                </label>
                <input
                  id="numbers-start"
                  className="input"
                  type="number"
                  min={1}
                  step={1}
                  value={start}
                  aria-invalid={startValid ? undefined : 'true'}
                  onChange={(event) => {
                    setStart(Number(event.target.value));
                    setOut(null);
                    setPhase('idle');
                  }}
                />
                {!startValid && (
                  <p className="field__error" role="alert">
                    Start at 1 or more.
                  </p>
                )}
              </div>
            </div>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={skipFirst}
                onChange={(event) => {
                  setSkipFirst(event.target.checked);
                  setOut(null);
                  setPhase('idle');
                }}
              />
              <span>Leave the first page unnumbered (a cover)</span>
            </label>
            {skipProblem && (
              <p className="field__error" role="alert">
                This document has one page, so there would be nothing to number.
              </p>
            )}
          </fieldset>

          <p>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!ready || busy || !startValid || skipProblem}
              onClick={() => void number()}
            >
              {busy ? 'Numbering…' : 'Add page numbers'}
            </button>
          </p>
        </div>
      )}

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' && !file && 'No file yet. Choose a PDF to begin.'}
        {phase === 'idle' && file && pageCount !== null && `${pageCount} pages ready.`}
        {phase === 'working' && 'Writing the numbers…'}
        {phase === 'done' && out && `Numbered ${out.numbered} page${out.numbered === 1 ? '' : 's'}.`}
        {phase === 'error' && 'The numbers were not added. The reason is below.'}
      </p>

      {error && (
        <div className="note note--danger">
          <h2>What happened</h2>
          <p>{error}</p>
        </div>
      )}

      {out && (
        <section className="card" aria-labelledby="numbers-result-heading">
          <h2 id="numbers-result-heading">Your numbered PDF</h2>
          <p className="result-summary">
            <span>
              {out.numbered} page{out.numbered === 1 ? '' : 's'} numbered
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
