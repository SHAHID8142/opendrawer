// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for delete-pages: choose pages to remove, keep the rest, download once.
import { useEffect, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { ResultPreviewButton } from '../../components/ResultPreviewButton';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { parseExplicitPages, parsePageSelection, togglePageInRange, validatePageRangeSyntax } from '../../lib/page-range';
import { countPdfPages } from '../../lib/pdf';
import { deletePdfPages } from './engine';

type Phase = 'idle' | 'working' | 'done' | 'error';

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [range, setRange] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [out, setOut] = useState<{ bytes: Uint8Array; removed: number; remaining: number } | null>(
    null,
  );
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
  const wouldEmpty = selection !== null && pageCount !== null && selection.length >= pageCount;

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

  async function remove() {
    if (!file || pageCount === null) return;
    setPhase('working');
    setError(null);
    setOut(null);
    try {
      const pages = parsePageSelection(range, pageCount);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = await deletePdfPages({ name: file.name, bytes }, pages);
      if (!result.ok) {
        setError(result.message);
        setPhase('error');
        return;
      }
      setOut({ bytes: result.bytes, removed: result.removed, remaining: result.remaining });
      setPhase('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The pages could not be removed.');
      setPhase('error');
    }
  }

  function save() {
    if (!out || !file) return;
    const base = file.name.replace(/\.pdf$/i, '');
    downloadBlob(bytesToBlob(out.bytes, 'application/pdf'), `${base}-pages-removed.pdf`);
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <FileDrop
        id="delete-input"
        accept="application/pdf,.pdf"
        label="Choose the PDF to trim"
        hint="It stays on this device. The kept pages are copied, not re-rendered."
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
            <legend>Remove pages</legend>
            <div className="field">
              <label className="field__label" htmlFor="delete-range">
                Pages to remove
              </label>
              <input
                id="delete-range"
                className="input"
                type="text"
                inputMode="numeric"
                placeholder="for example 2, 5-7"
                value={range}
                aria-invalid={syntaxError || boundsError || wouldEmpty ? 'true' : undefined}
                aria-describedby="delete-range-help"
                onChange={(event) => {
                  setRange(event.target.value);
                  setOut(null);
                  setPhase('idle');
                }}
              />
              <p id="delete-range-help" className="field__hint">
                {selection && selection.length > 0 && pageCount !== null && !wouldEmpty
                  ? `Removing ${selection.length} of ${pageCount} pages leaves ${pageCount - selection.length}.`
                  : `This document has ${pageCount} page${pageCount === 1 ? '' : 's'}. Type the pages to remove; at least one page must remain.`}
              </p>
              {(syntaxError || boundsError) && (
                <p className="field__error" role="alert">
                  {syntaxError ?? boundsError}
                </p>
              )}
              {wouldEmpty && (
                <p className="field__error" role="alert">
                  Every page is selected. Leave at least one page in the document.
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
                wouldEmpty ||
                selection === null ||
                selection.length === 0
              }
              onClick={() => void remove()}
            >
              {busy ? 'Removing…' : 'Remove the pages'}
            </button>
          </p>
        </div>
      )}

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' && !file && 'No file yet. Choose a PDF to begin.'}
        {phase === 'idle' && file && pageCount !== null && `${pageCount} pages ready.`}
        {phase === 'working' && 'Removing the pages…'}
        {phase === 'done' && out && `Removed ${out.removed} page${out.removed === 1 ? '' : 's'}. ${out.remaining} remain.`}
        {phase === 'error' && 'The pages were not removed. The reason is below.'}
      </p>

      {error && (
        <div className="note note--danger">
          <h2>What happened</h2>
          <p>{error}</p>
        </div>
      )}

      {out && (
        <section className="card" aria-labelledby="delete-result-heading">
          <h2 id="delete-result-heading">Your trimmed PDF</h2>
          <p className="result-summary">
            <span>{out.remaining} page{out.remaining === 1 ? '' : 's'} left</span>
            <span>{out.removed} removed</span>
          </p>
          <p>
            <button type="button" className="btn btn--primary" onClick={save}>
              Download the PDF
            </button>
          </p>
          <ResultPreviewButton bytes={out.bytes} filename={`${file?.name.replace(/\.pdf$/i, '') ?? 'document'}-pages-removed.pdf`} />
          <p className="muted">Written in this tab. Nothing is stored after you close it.</p>
        </section>
      )}
    </div>
  );
}
