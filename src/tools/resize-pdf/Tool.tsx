// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for resize-pdf: choose a paper size, scale every page to fit, download.
import { useEffect, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import { countPdfPages } from '../../lib/pdf';
import { PAPERS, resizePdf, type PaperSize } from './engine';

type Phase = 'idle' | 'working' | 'done' | 'error';

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [target, setTarget] = useState<PaperSize>('a4');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [out, setOut] = useState<{ bytes: Uint8Array; pages: number } | null>(null);
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
      setError('That file could not be read as a PDF. It may be damaged or password protected.');
      setPhase('error');
    }
  }

  async function run() {
    if (!file) return;
    setPhase('working');
    setError(null);
    setOut(null);
    try {
      const result = await resizePdf(
        { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) },
        target,
      );
      if (!result.ok) {
        setError(result.message);
        setPhase('error');
        return;
      }
      setOut({ bytes: result.bytes, pages: result.pages });
      setPhase('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The pages could not be resized.');
      setPhase('error');
    }
  }

  function save() {
    if (!out || !file) return;
    const base = file.name.replace(/\.pdf$/i, '');
    downloadBlob(bytesToBlob(out.bytes, 'application/pdf'), `${base}-${target}.pdf`);
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <FileDrop
        id="resize-input"
        accept="application/pdf,.pdf"
        label="Choose the PDF to resize"
        hint="It stays on this device. Pages are scaled to fit the new paper."
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
            <label className="field__label" htmlFor="resize-paper">
              New paper size
            </label>
            <select
              id="resize-paper"
              className="select"
              value={target}
              disabled={!ready || busy}
              onChange={(event) => {
                setTarget(event.target.value as PaperSize);
                reset();
              }}
            >
              {(Object.keys(PAPERS) as PaperSize[]).map((value) => (
                <option key={value} value={value}>
                  {PAPERS[value].label}
                </option>
              ))}
            </select>
            <p className="field__hint">
              Each page keeps its shape, is centred, and gains margins where the proportions differ.
            </p>
          </div>

          <div className="note note--warning">
            <p>
              This rebuilds the document. Links, form fields, comments and bookmarks are not
              carried over, and a page that was rotated may come out upright.
            </p>
          </div>

          <p>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!ready || busy}
              onClick={() => void run()}
            >
              {busy ? 'Resizing…' : 'Resize the pages'}
            </button>
          </p>
        </div>
      )}

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' && !file && 'No file yet. Choose a PDF to begin.'}
        {phase === 'idle' && file && pageCount !== null && `${pageCount} pages ready.`}
        {phase === 'working' && 'Resizing the pages…'}
        {phase === 'done' && out && `Resized ${out.pages} page${out.pages === 1 ? '' : 's'}.`}
        {phase === 'error' && 'The pages were not resized. The reason is below.'}
      </p>

      {error && (
        <div className="note note--danger">
          <h2>What happened</h2>
          <p>{error}</p>
        </div>
      )}

      {out && (
        <section className="card" aria-labelledby="resize-result-heading">
          <h2 id="resize-result-heading">Your resized PDF</h2>
          <p className="result-summary">
            <span>
              {out.pages} page{out.pages === 1 ? '' : 's'} on {PAPERS[target].label.split(' (')[0]}
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
