// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for reorder-pages: a page list with move controls, reverse and reset.
import { useEffect, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { ResultPreviewButton } from '../../components/ResultPreviewButton';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { countPdfPages } from '../../lib/pdf';
import { reorderPdf } from './engine';

const MAX_EDITOR_PAGES = 100;
type Phase = 'idle' | 'working' | 'done' | 'error';

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [order, setOrder] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [out, setOut] = useState<Uint8Array | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  const busy = phase === 'working';
  const reorderable = pageCount !== null && pageCount <= MAX_EDITOR_PAGES;
  const changed = order.some((pageNumber, index) => pageNumber !== index + 1);

  async function choose(chosen: File) {
    setFile(chosen);
    setOut(null);
    setPhase('idle');
    setError(null);
    setPageCount(null);
    const count = await countPdfPages(new Uint8Array(await chosen.arrayBuffer()));
    setPageCount(count);
    setOrder(count === null ? [] : Array.from({ length: count }, (_, index) => index + 1));
    if (count === null) {
      setError('That file could not be read as a PDF. It may be damaged or password protected.');
      setPhase('error');
    }
  }

  function move(index: number, direction: -1 | 1) {
    setOrder((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const page = next[index];
      const swap = next[target];
      if (page === undefined || swap === undefined) return current;
      next[index] = swap;
      next[target] = page;
      return next;
    });
    setOut(null);
    setPhase('idle');
  }

  function reverse() {
    setOrder((current) => [...current].reverse());
    setOut(null);
    setPhase('idle');
  }

  function reset() {
    setOrder((current) => current.map((_, index) => index + 1));
    setOut(null);
    setPhase('idle');
  }

  async function saveOrder() {
    if (!file || pageCount === null) return;
    setPhase('working');
    setError(null);
    setOut(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = await reorderPdf({ name: file.name, bytes }, order);
      if (!result.ok) {
        setError(result.message);
        setPhase('error');
        return;
      }
      setOut(result.bytes);
      setPhase('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The pages could not be reordered.');
      setPhase('error');
    }
  }

  function download() {
    if (!out || !file) return;
    const base = file.name.replace(/\.pdf$/i, '');
    downloadBlob(bytesToBlob(out, 'application/pdf'), `${base}-reordered.pdf`);
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <FileDrop
        id="reorder-input"
        accept="application/pdf,.pdf"
        label="Choose the PDF to reorder"
        hint="It stays on this device. Pages are copied in the order you set."
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
          setOrder([]);
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
          <h2>Page order</h2>

          {reorderable ? (
            <ul className="file-list" aria-label="Pages in the new order">
              {order.map((pageNumber, index) => (
                <li key={pageNumber}>
                  <span>
                    {index + 1}. Page {pageNumber}
                  </span>
                  <span className="cluster">
                    <button
                      type="button"
                      className="btn btn--ghost"
                      aria-label={`Move page ${pageNumber} up`}
                      disabled={busy || index === 0}
                      onClick={() => move(index, -1)}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      aria-label={`Move page ${pageNumber} down`}
                      disabled={busy || index === order.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      Down
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="note">
              This document has {pageCount} pages. The visual list stops at {MAX_EDITOR_PAGES}
              to keep the tab responsive; you can still reverse the whole document.
            </p>
          )}

          <p className="cluster">
            <button type="button" className="btn btn--secondary" disabled={!ready || busy} onClick={reverse}>
              Reverse order
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              disabled={!ready || busy || !changed}
              onClick={reset}
            >
              Reset to original
            </button>
          </p>

          <p>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!ready || busy || !changed}
              onClick={() => void saveOrder()}
            >
              {busy ? 'Saving…' : 'Save the new order'}
            </button>
          </p>
        </div>
      )}

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' && !file && 'No file yet. Choose a PDF to begin.'}
        {phase === 'idle' && file && pageCount !== null && `${pageCount} pages ready.`}
        {phase === 'working' && 'Writing the new order…'}
        {phase === 'done' && pageCount !== null && `${pageCount} pages reordered.`}
        {phase === 'error' && 'The pages were not reordered. The reason is below.'}
      </p>

      {error && (
        <div className="note note--danger">
          <h2>What happened</h2>
          <p>{error}</p>
        </div>
      )}

      {out && (
        <section className="card" aria-labelledby="reorder-result-heading">
          <h2 id="reorder-result-heading">Your reordered PDF</h2>
          <p>
            <button type="button" className="btn btn--primary" onClick={download}>
              Download the PDF
            </button>
          </p>
          <ResultPreviewButton bytes={out} filename={`${file?.name.replace(/\.pdf$/i, '') ?? 'document'}-reordered.pdf`} />
          <p className="muted">Written in this tab. Nothing is stored after you close it.</p>
        </section>
      )}
    </div>
  );
}
