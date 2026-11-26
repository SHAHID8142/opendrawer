// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for compress-pdf: lossless qpdf optimisation with an honest savings result.
import { useEffect, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import { countPdfPages } from '../../lib/pdf';
import { compressPdf, compressedName, savings } from './engine';

type Phase = 'idle' | 'working' | 'done' | 'error';

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [out, setOut] = useState<{ bytes: Uint8Array; before: number; after: number; kept: boolean } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);
  const busy = phase === 'working';

  async function choose(chosen: File) {
    setFile(chosen);
    setPageCount(null);
    setOut(null);
    setPhase('idle');
    setError(null);
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
      const result = await compressPdf({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
      if (!result.ok) {
        setError(result.message);
        setPhase('error');
        return;
      }
      setOut({ bytes: result.bytes, before: result.before, after: result.after, kept: result.keptOriginal });
      setPhase('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The file could not be optimised.');
      setPhase('error');
    }
  }

  function save() {
    if (!out || !file) return;
    downloadBlob(bytesToBlob(out.bytes, 'application/pdf'), compressedName(file.name));
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <FileDrop
        id="compress-input"
        accept="application/pdf,.pdf"
        label="Choose the PDF to optimise"
        hint="It stays on this device. Lossless only: images are not resampled."
        buttonLabel="Choose a PDF"
        disabled={!ready}
        selectedFile={file ? { name: file.name, size: file.size, detail: pageCount === null ? undefined : `${pageCount} pages` } : null}
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
          <p>
            qpdf rebuilds the file with object streams and maximum lossless compression. Text,
            images and layout stay exactly as they were.
          </p>
          <p>
            <button type="button" className="btn btn--primary" disabled={!ready || busy} onClick={() => void run()}>
              {busy ? 'Optimising…' : 'Optimise the PDF'}
            </button>
          </p>
        </div>
      )}

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' && !file && 'No file yet. Choose a PDF to begin.'}
        {phase === 'idle' && file && `${pageCount ?? 0} pages ready.`}
        {phase === 'working' && 'Running qpdf…'}
        {phase === 'done' && out && (out.kept ? 'This file is already as small as lossless optimisation can make it.' : `Saved ${savings(out.before, out.after)}%.`)}
        {phase === 'error' && 'The file was not optimised. The reason is below.'}
      </p>

      {error && (
        <div className="note note--danger">
          <h2>What happened</h2>
          <p>{error}</p>
        </div>
      )}

      {out && (
        <section className="card" aria-labelledby="compress-result-heading">
          <h2 id="compress-result-heading">Your optimised PDF</h2>
          <p className="result-summary">
            <span>{formatBytes(out.before)} → {formatBytes(out.after)}</span>
            <span>{savings(out.before, out.after)}% smaller</span>
          </p>
          {!out.kept && (
            <p>
              <button type="button" className="btn btn--primary" onClick={save}>
                Download the PDF
              </button>
            </p>
          )}
          <p className="muted">The original file on your device is untouched.</p>
        </section>
      )}
    </div>
  );
}
