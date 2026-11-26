// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for repair-pdf: rebuild a damaged file and say plainly that missing content cannot return.
import { useEffect, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import { repairPdf, repairedName } from './engine';

type Phase = 'idle' | 'working' | 'done' | 'error';

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [out, setOut] = useState<{ bytes: Uint8Array; pages: number; before: number; after: number } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);
  const busy = phase === 'working';

  async function run() {
    if (!file) return;
    setPhase('working');
    setError(null);
    setOut(null);
    try {
      const result = await repairPdf({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
      if (!result.ok) {
        setError(result.message);
        setPhase('error');
        return;
      }
      setOut({ bytes: result.bytes, pages: result.pages, before: result.before, after: result.after });
      setPhase('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The file could not be rebuilt.');
      setPhase('error');
    }
  }

  function save() {
    if (!out || !file) return;
    downloadBlob(bytesToBlob(out.bytes, 'application/pdf'), repairedName(file.name));
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <FileDrop
        id="repair-input"
        accept="application/pdf,.pdf"
        label="Choose the damaged PDF"
        hint="It stays on this device. Nothing is sent to a recovery service."
        buttonLabel="Choose a PDF"
        disabled={!ready}
        selectedFile={file ? { name: file.name, size: file.size } : null}
        onClear={() => {
          setFile(null);
          setOut(null);
          setPhase('idle');
          setError(null);
        }}
        onFiles={(chosen) => {
          const first = chosen[0];
          if (first) {
            setFile(first);
            setOut(null);
            setPhase('idle');
            setError(null);
          }
        }}
      />

      {file && (
        <div className="card">
          <p>qpdf rebuilds the file's structure and damaged streams. Pages whose content is missing cannot be conjured back.</p>
          <p>
            <button type="button" className="btn btn--primary" disabled={!ready || busy} onClick={() => void run()}>
              {busy ? 'Rebuilding…' : 'Repair the PDF'}
            </button>
          </p>
        </div>
      )}

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' && !file && 'No file yet. Choose a damaged PDF to begin.'}
        {phase === 'idle' && file && 'Ready to rebuild.'}
        {phase === 'working' && 'Rebuilding the file with qpdf…'}
        {phase === 'done' && out && `Rebuilt ${out.pages} page${out.pages === 1 ? '' : 's'}.`}
        {phase === 'error' && 'The file was not repaired. The reason is below.'}
      </p>

      {error && <div className="note note--danger"><h2>What happened</h2><p>{error}</p></div>}

      {out && (
        <section className="card" aria-labelledby="repair-result-heading">
          <h2 id="repair-result-heading">Your repaired PDF</h2>
          <p className="result-summary"><span>{out.pages} pages</span><span>{formatBytes(out.before)} → {formatBytes(out.after)}</span></p>
          <p><button type="button" className="btn btn--primary" onClick={save}>Download the PDF</button></p>
          <p className="muted">Check the pages you care about before deleting the original.</p>
        </section>
      )}
    </div>
  );
}
