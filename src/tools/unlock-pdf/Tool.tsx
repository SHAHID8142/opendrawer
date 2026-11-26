// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for unlock-pdf: the user supplies the existing password; there is no cracking.
import { useEffect, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import { countPdfPages } from '../../lib/pdf';
import { unlockPdf, unlockedName } from './engine';

type Phase = 'idle' | 'working' | 'done' | 'error';

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [password, setPassword] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [out, setOut] = useState<{ bytes: Uint8Array; pages: number } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);
  const busy = phase === 'working';

  async function choose(chosen: File) {
    setFile(chosen);
    setPageCount(null);
    setOut(null);
    setPhase('idle');
    setError(null);
    setPageCount(await countPdfPages(new Uint8Array(await chosen.arrayBuffer())));
  }

  async function run() {
    if (!file) return;
    setPhase('working');
    setError(null);
    setOut(null);
    try {
      const result = await unlockPdf({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) }, password);
      if (!result.ok) {
        setError(result.message);
        setPhase('error');
        return;
      }
      setOut({ bytes: result.bytes, pages: result.pages });
      setPhase('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The password could not be removed.');
      setPhase('error');
    }
  }

  function save() {
    if (!out || !file) return;
    downloadBlob(bytesToBlob(out.bytes, 'application/pdf'), unlockedName(file.name));
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <FileDrop
        id="unlock-input"
        accept="application/pdf,.pdf"
        label="Choose the locked PDF"
        hint="It stays on this device. Only a password you already know is used."
        buttonLabel="Choose a PDF"
        disabled={!ready}
        selectedFile={file ? { name: file.name, size: file.size, detail: pageCount === null ? 'Password protected' : `${pageCount} pages` } : null}
        onClear={() => {
          setFile(null);
          setPageCount(null);
          setPassword('');
          setOut(null);
          setPhase('idle');
          setError(null);
        }}
        onFiles={(chosen) => {
          const first = chosen[0];
          if (first) void choose(first);
        }}
      />

      {file && (
        <div className="card">
          <div className="field">
            <label className="field__label" htmlFor="unlock-password">The PDF's password</label>
            <input id="unlock-password" className="input" type="password" autoComplete="current-password" value={password} disabled={!ready || busy} onChange={(event) => { setPassword(event.target.value); setOut(null); setPhase('idle'); }} />
          </div>
          <div className="note note--warning">
            <p>This removes the password from the copy you download. Anyone who gets that copy can open it.</p>
          </div>
          <p>
            <button type="button" className="btn btn--primary" disabled={!ready || busy || password === ''} onClick={() => void run()}>
              {busy ? 'Removing the password…' : 'Remove the password'}
            </button>
          </p>
        </div>
      )}

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' && !file && 'No file yet. Choose a locked PDF to begin.'}
        {phase === 'idle' && file && 'Type the password this file already uses.'}
        {phase === 'working' && 'Checking the password with qpdf…'}
        {phase === 'done' && out && `Unlocked ${out.pages} page${out.pages === 1 ? '' : 's'}.`}
        {phase === 'error' && 'The file was not unlocked. The reason is below.'}
      </p>

      {error && <div className="note note--danger"><h2>What happened</h2><p>{error}</p></div>}

      {out && (
        <section className="card" aria-labelledby="unlock-result-heading">
          <h2 id="unlock-result-heading">Your unlocked PDF</h2>
          <p className="result-summary"><span>{out.pages} pages</span><span>{formatBytes(out.bytes.length)}</span></p>
          <p><button type="button" className="btn btn--primary" onClick={save}>Download the PDF</button></p>
          <p className="muted">Only the downloaded copy changes; your original file is untouched.</p>
        </section>
      )}
    </div>
  );
}
