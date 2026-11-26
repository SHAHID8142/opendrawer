// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for booklet-pdf: one action, with the print instructions next to the result.
import { useEffect, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import { countPdfPages } from '../../lib/pdf';
import { bookletName, bookletPdf, paddedCount, sheetCount } from './engine';

type Phase = 'idle' | 'working' | 'done' | 'error';

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [out, setOut] = useState<{ bytes: Uint8Array; sheets: number; padded: number; pages: number } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);
  const busy = phase === 'working';

  function reset() {
    setOut(null);
    setPhase('idle');
    setError(null);
  }

  async function choose(chosen: File) {
    setFile(chosen);
    setPageCount(null);
    reset();
    const count = await countPdfPages(new Uint8Array(await chosen.arrayBuffer()));
    setPageCount(count);
    if (count === null) {
      setError('That file could not be read as a PDF. It may be damaged; try Repair first.');
      setPhase('error');
    }
  }

  async function run() {
    if (!file) return;
    setPhase('working');
    setError(null);
    setOut(null);
    try {
      const result = await bookletPdf({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
      if (!result.ok) {
        setError(result.message);
        setPhase('error');
        return;
      }
      setOut({ bytes: result.bytes, sheets: result.sheets, padded: result.padded, pages: result.pages });
      setPhase('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The booklet could not be made.');
      setPhase('error');
    }
  }

  function save() {
    if (!out || !file) return;
    downloadBlob(bytesToBlob(out.bytes, 'application/pdf'), bookletName(file.name));
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <FileDrop
        id="booklet-input"
        accept="application/pdf,.pdf"
        label="Choose the PDF to turn into a booklet"
        hint="It stays on this device. Pages are reordered for folding, with blanks added if needed."
        buttonLabel="Choose a PDF"
        disabled={!ready}
        selectedFile={file ? { name: file.name, size: file.size, detail: pageCount === null ? undefined : `${pageCount} pages` } : null}
        onClear={() => {
          setFile(null);
          setPageCount(null);
          reset();
        }}
        onFiles={(chosen) => {
          const first = chosen[0];
          if (first) void choose(first);
        }}
      />

      {file && pageCount !== null && (
        <div className="card">
          <p className="field__hint">
            {pageCount} pages → {paddedCount(pageCount)} with blanks →{' '}
            {sheetCount(pageCount)} sheet{sheetCount(pageCount) === 1 ? '' : 's'} of paper, printed
            on both sides.
          </p>
          <div className="note note--warning">
            <p>
              Print <strong>double-sided, flip on the long edge</strong>, then fold the stack in
              half. Pages that are already landscape can end up mixed with upright ones.
            </p>
          </div>
          <p>
            <button type="button" className="btn btn--primary" disabled={!ready || busy} onClick={() => void run()}>
              {busy ? 'Imposing the pages…' : 'Make the booklet'}
            </button>
          </p>
        </div>
      )}

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' && !file && 'No file yet. Choose a PDF to begin.'}
        {phase === 'idle' && file && `${pageCount ?? 0} pages ready.`}
        {phase === 'working' && 'Placing the pairs…'}
        {phase === 'done' && out && `Made ${out.sheets} sheet${out.sheets === 1 ? '' : 's'} from ${out.pages} pages${out.padded > 0 ? `, with ${out.padded} blank${out.padded === 1 ? '' : 's'} added` : ''}.`}
        {phase === 'error' && 'The booklet was not made. The reason is below.'}
      </p>

      {error && <div className="note note--danger"><h2>What happened</h2><p>{error}</p></div>}

      {out && (
        <section className="card" aria-labelledby="booklet-result-heading">
          <h2 id="booklet-result-heading">Your booklet</h2>
          <p className="result-summary">
            <span>{out.sheets} pages to print</span>
            <span>A4 landscape</span>
            <span>{formatBytes(out.bytes.length)}</span>
          </p>
          <p><button type="button" className="btn btn--primary" onClick={save}>Download the PDF</button></p>
          <p className="muted">Print double-sided (long edge), fold, and check the first sheet before printing the rest.</p>
        </section>
      )}
    </div>
  );
}
