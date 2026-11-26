// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for extract-pages: select the pages to keep, copy them into a new PDF.
import { useEffect, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import { parsePageSelection, validatePageRangeSyntax } from '../../lib/page-range';
import { countPdfPages } from '../../lib/pdf';
import { extractPdfPages } from './engine';

type Phase = 'idle' | 'working' | 'done' | 'error';

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [range, setRange] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [out, setOut] = useState<{ bytes: Uint8Array; pageCount: number } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  const busy = phase === 'working';
  const syntaxError = validatePageRangeSyntax(range);
  const selection =
    pageCount !== null && syntaxError === null
      ? range.trim() === ''
        ? []
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

  async function extract() {
    if (!file || pageCount === null) return;
    setPhase('working');
    setError(null);
    setOut(null);
    try {
      const pages = parsePageSelection(range, pageCount);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = await extractPdfPages({ name: file.name, bytes }, pages);
      if (!result.ok) {
        setError(result.message);
        setPhase('error');
        return;
      }
      setOut({ bytes: result.bytes, pageCount: result.pageCount });
      setPhase('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The pages could not be extracted.');
      setPhase('error');
    }
  }

  function save() {
    if (!out || !file) return;
    const base = file.name.replace(/\.pdf$/i, '');
    downloadBlob(bytesToBlob(out.bytes, 'application/pdf'), `${base}-pages.pdf`);
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <FileDrop
        id="extract-input"
        accept="application/pdf,.pdf"
        label="Choose the PDF to extract from"
        hint="It stays on this device. The pages you keep are copied, not re-rendered."
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
            <legend>Pages to keep</legend>
            <div className="field">
              <label className="field__label" htmlFor="extract-range">
                Pages and ranges
              </label>
              <input
                id="extract-range"
                className="input"
                type="text"
                inputMode="numeric"
                placeholder="for example 1-3, 7"
                value={range}
                aria-invalid={syntaxError || boundsError ? 'true' : undefined}
                aria-describedby="extract-range-help"
                onChange={(event) => {
                  setRange(event.target.value);
                  setOut(null);
                  setPhase('idle');
                }}
              />
              <p id="extract-range-help" className="field__hint">
                {selection && selection.length > 0 && pageCount !== null
                  ? `Keeping ${selection.length} of ${pageCount} pages, in the order typed.`
                  : `This document has ${pageCount} page${pageCount === 1 ? '' : 's'}. Type at least one page to keep.`}
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
              disabled={
                !ready ||
                busy ||
                syntaxError !== null ||
                boundsError !== null ||
                selection === null ||
                selection.length === 0
              }
              onClick={() => void extract()}
            >
              {busy ? 'Extracting…' : 'Extract the pages'}
            </button>
          </p>
        </div>
      )}

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' && !file && 'No file yet. Choose a PDF to begin.'}
        {phase === 'idle' && file && pageCount !== null && `${pageCount} pages ready.`}
        {phase === 'working' && 'Copying the pages…'}
        {phase === 'done' && out && `Extracted ${out.pageCount} page${out.pageCount === 1 ? '' : 's'}.`}
        {phase === 'error' && 'The pages were not extracted. The reason is below.'}
      </p>

      {error && (
        <div className="note note--danger">
          <h2>What happened</h2>
          <p>{error}</p>
        </div>
      )}

      {out && (
        <section className="card" aria-labelledby="extract-result-heading">
          <h2 id="extract-result-heading">Your extracted PDF</h2>
          <p className="result-summary">
            <span>
              {out.pageCount} page{out.pageCount === 1 ? '' : 's'}
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
