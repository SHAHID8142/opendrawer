// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for crop-pdf: one margin, optional page selection, explicit "this hides, not deletes".
import { useEffect, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { ResultPreviewButton } from '../../components/ResultPreviewButton';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import { parseExplicitPages, parsePageSelection, togglePageInRange, validatePageRangeSyntax } from '../../lib/page-range';
import { countPdfPages } from '../../lib/pdf';
import { MAX_MARGIN_MM, MIN_MARGIN_MM, cropPdf } from './engine';

type Phase = 'idle' | 'working' | 'done' | 'error';

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [margin, setMargin] = useState(10);
  const [range, setRange] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [out, setOut] = useState<{ bytes: Uint8Array; cropped: number } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  const busy = phase === 'working';
  const marginValid = Number.isFinite(margin) && margin >= MIN_MARGIN_MM && margin <= MAX_MARGIN_MM;
  const syntaxError = validatePageRangeSyntax(range);
  const selection =
    pageCount !== null && syntaxError === null
      ? range.trim() === ''
        ? Array.from({ length: pageCount }, (_, index) => index + 1)
        : (() => {
            try {
              return parsePageSelection(range, pageCount);
            } catch {
              return null;
            }
          })()
      : null;
  const boundsError =
    pageCount !== null && syntaxError === null && selection === null
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

  async function crop() {
    if (!file || pageCount === null) return;
    setPhase('working');
    setError(null);
    setOut(null);
    try {
      const pages = parsePageSelection(range, pageCount);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = await cropPdf({ name: file.name, bytes }, margin, pages);
      if (!result.ok) {
        setError(result.message);
        setPhase('error');
        return;
      }
      setOut({ bytes: result.bytes, cropped: result.cropped });
      setPhase('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The pages could not be cropped.');
      setPhase('error');
    }
  }

  function save() {
    if (!out || !file) return;
    const base = file.name.replace(/\.pdf$/i, '');
    downloadBlob(bytesToBlob(out.bytes, 'application/pdf'), `${base}-cropped.pdf`);
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <FileDrop
        id="crop-input"
        accept="application/pdf,.pdf"
        label="Choose the PDF to crop"
        hint="It stays on this device. Cropping changes the visible page box only."
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
        selectedPages={pageCount ? parseExplicitPages(range, pageCount) : []}
        onTogglePage={
          pageCount
            ? (pageNo) => {
                setRange((curr) => togglePageInRange(curr, pageNo, pageCount));
                setOut(null);
                setPhase('idle');
              }
            : undefined
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
            <legend>Crop margins</legend>

            <div className="form__row">
              <div className="field">
                <label className="field__label" htmlFor="crop-margin">
                  Margin from every edge (mm)
                </label>
                <input
                  id="crop-margin"
                  className="input"
                  type="number"
                  min={MIN_MARGIN_MM}
                  max={MAX_MARGIN_MM}
                  step={1}
                  value={margin}
                  aria-invalid={marginValid ? undefined : 'true'}
                  onChange={(event) => {
                    setMargin(Number(event.target.value));
                    setOut(null);
                    setPhase('idle');
                  }}
                />
                {!marginValid && (
                  <p className="field__error" role="alert">
                    Choose a margin between {MIN_MARGIN_MM} and {MAX_MARGIN_MM} mm.
                  </p>
                )}
              </div>

              <div className="field field--grow">
                <label className="field__label" htmlFor="crop-range">
                  Pages (leave empty for all)
                </label>
                <input
                  id="crop-range"
                  className="input"
                  type="text"
                  inputMode="numeric"
                  placeholder="for example 1-3, 7"
                  value={range}
                  aria-invalid={syntaxError || boundsError ? 'true' : undefined}
                  aria-describedby="crop-range-help"
                  onChange={(event) => {
                    setRange(event.target.value);
                    setOut(null);
                    setPhase('idle');
                  }}
                />
                <p id="crop-range-help" className="field__hint">
                  {selection && pageCount !== null
                    ? `Cropping ${marginValid ? `${margin} mm from` : 'a margin from'} ${selection.length === pageCount ? `all ${pageCount}` : `${selection.length} of ${pageCount}`} pages.`
                    : `This document has ${pageCount} page${pageCount === 1 ? '' : 's'}.`}
                </p>
                {(syntaxError || boundsError) && (
                  <p className="field__error" role="alert">
                    {syntaxError ?? boundsError}
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          <div className="note note--warning">
            <p>
              <strong>Cropping hides, it does not delete.</strong> Content outside the new page
              box stays inside the file and can be recovered with an editor. Use redaction when
              information must actually be removed.
            </p>
          </div>

          <p>
            <button
              type="button"
              className="btn btn--primary"
              disabled={
                !ready ||
                busy ||
                !marginValid ||
                syntaxError !== null ||
                boundsError !== null ||
                selection === null
              }
              onClick={() => void crop()}
            >
              {busy ? 'Cropping…' : 'Crop the pages'}
            </button>
          </p>
        </div>
      )}

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' && !file && 'No file yet. Choose a PDF to begin.'}
        {phase === 'idle' && file && pageCount !== null && `${pageCount} pages ready.`}
        {phase === 'working' && 'Cropping the pages…'}
        {phase === 'done' && out && `Cropped ${out.cropped} page${out.cropped === 1 ? '' : 's'}.`}
        {phase === 'error' && 'The pages were not cropped. The reason is below.'}
      </p>

      {error && (
        <div className="note note--danger">
          <h2>What happened</h2>
          <p>{error}</p>
        </div>
      )}

      {out && (
        <section className="card" aria-labelledby="crop-result-heading">
          <h2 id="crop-result-heading">Your cropped PDF</h2>
          <p className="result-summary">
            <span>
              {out.cropped} page{out.cropped === 1 ? '' : 's'} cropped
            </span>
            <span>{formatBytes(out.bytes.length)}</span>
          </p>
          <p>
            <button type="button" className="btn btn--primary" onClick={save}>
              Download the PDF
            </button>
          </p>
          <ResultPreviewButton bytes={out.bytes} filename={`${file?.name.replace(/\.pdf$/i, '') ?? 'document'}-cropped.pdf`} />
          <p className="muted">Written in this tab. Nothing is stored after you close it.</p>
        </section>
      )}
    </div>
  );
}
