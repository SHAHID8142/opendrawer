// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for n-up-pdf: choose pages per sheet, then download the imposed A4 document.
import { useEffect, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import { countPdfPages } from '../../lib/pdf';
import { GRIDS, nUpPdf, sheetCount, type PerSheet } from './engine';

type Phase = 'idle' | 'working' | 'done' | 'error';
const OPTIONS: PerSheet[] = [2, 4, 6, 9];

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [perSheet, setPerSheet] = useState<PerSheet>(4);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [out, setOut] = useState<{ bytes: Uint8Array; sheets: number; placed: number } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);
  const busy = phase === 'working';
  const sheets = pageCount === null ? null : sheetCount(pageCount, perSheet);

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
      const result = await nUpPdf(
        { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) },
        perSheet,
      );
      if (!result.ok) {
        setError(result.message);
        setPhase('error');
        return;
      }
      setOut({ bytes: result.bytes, sheets: result.sheets, placed: result.placed });
      setPhase('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The pages could not be laid out.');
      setPhase('error');
    }
  }

  function save() {
    if (!out || !file) return;
    const base = file.name.replace(/\.pdf$/i, '');
    downloadBlob(bytesToBlob(out.bytes, 'application/pdf'), `${base}-${perSheet}up.pdf`);
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <FileDrop
        id="nup-input"
        accept="application/pdf,.pdf"
        label="Choose the PDF to lay out"
        hint="It stays on this device. The result is A4 portrait, pages scaled to fit."
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
          <div className="field">
            <label className="field__label" htmlFor="nup-count">Pages per sheet</label>
            <select
              id="nup-count"
              className="select"
              value={perSheet}
              disabled={!ready || busy}
              onChange={(event) => {
                setPerSheet(Number(event.target.value) as PerSheet);
                reset();
              }}
            >
              {OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value} pages ({GRIDS[value].cols} × {GRIDS[value].rows})
                </option>
              ))}
            </select>
            <p className="field__hint">
              {sheets} sheet{sheets === 1 ? '' : 's'} at this setting. Smaller grids leave larger pages.
            </p>
          </div>
          <div className="note note--warning">
            <p>Pages are embedded fresh, so links, forms and comments are lost. Rotated pages may come out upright.</p>
          </div>
          <p>
            <button type="button" className="btn btn--primary" disabled={!ready || busy} onClick={() => void run()}>
              {busy ? 'Laying out…' : 'Make the sheets'}
            </button>
          </p>
        </div>
      )}

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' && !file && 'No file yet. Choose a PDF to begin.'}
        {phase === 'idle' && file && `${pageCount ?? 0} pages ready.`}
        {phase === 'working' && 'Placing the pages…'}
        {phase === 'done' && out && `Made ${out.sheets} sheet${out.sheets === 1 ? '' : 's'} from ${out.placed} pages.`}
        {phase === 'error' && 'The sheets were not made. The reason is below.'}
      </p>

      {error && <div className="note note--danger"><h2>What happened</h2><p>{error}</p></div>}

      {out && (
        <section className="card" aria-labelledby="nup-result-heading">
          <h2 id="nup-result-heading">Your sheets</h2>
          <p className="result-summary">
            <span>{out.sheets} sheet{out.sheets === 1 ? '' : 's'}</span>
            <span>A4 portrait</span>
            <span>{formatBytes(out.bytes.length)}</span>
          </p>
          <p><button type="button" className="btn btn--primary" onClick={save}>Download the PDF</button></p>
          <p className="muted">Print at 100% (no scaling) to keep the layout.</p>
        </section>
      )}
    </div>
  );
}
