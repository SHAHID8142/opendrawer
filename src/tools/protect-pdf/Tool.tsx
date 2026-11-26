// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for protect-pdf: one password, AES-256, with a blunt "there is no recovery" warning.
import { useEffect, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import { countPdfPages } from '../../lib/pdf';
import { passwordProblem, protectPdf, protectedName } from './engine';

type Phase = 'idle' | 'working' | 'done' | 'error';

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [out, setOut] = useState<{ bytes: Uint8Array; pages: number } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);
  const busy = phase === 'working';
  const problem = passwordProblem(password, confirmation);
  const canRun = ready && !busy && problem === null && pageCount !== null;

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
      const result = await protectPdf(
        { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) },
        password,
        confirmation,
      );
      if (!result.ok) {
        setError(result.message);
        setPhase('error');
        return;
      }
      setOut({ bytes: result.bytes, pages: result.pages });
      setPhase('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The password could not be added.');
      setPhase('error');
    }
  }

  function save() {
    if (!out || !file) return;
    downloadBlob(bytesToBlob(out.bytes, 'application/pdf'), protectedName(file.name));
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <FileDrop
        id="protect-input"
        accept="application/pdf,.pdf"
        label="Choose the PDF to protect"
        hint="It stays on this device. The password never leaves the tab."
        buttonLabel="Choose a PDF"
        disabled={!ready}
        selectedFile={file ? { name: file.name, size: file.size, detail: pageCount === null ? undefined : `${pageCount} pages` } : null}
        onClear={() => {
          setFile(null);
          setPageCount(null);
          setPassword('');
          setConfirmation('');
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
            <label className="field__label" htmlFor="protect-password">Password</label>
            <input id="protect-password" className="input" type="password" autoComplete="new-password" value={password} disabled={!ready || busy} onChange={(event) => { setPassword(event.target.value); reset(); }} />
            <p className="field__hint">At least 4 characters. A long phrase beats a short word.</p>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="protect-confirm">Repeat the password</label>
            <input id="protect-confirm" className="input" type="password" autoComplete="new-password" value={confirmation} disabled={!ready || busy} onChange={(event) => { setConfirmation(event.target.value); reset(); }} />
            {problem && password !== '' && <p className="field__error" role="alert">{problem}</p>}
          </div>
          <div className="note note--warning">
            <p><strong>There is no recovery.</strong> If you lose this password, nobody — including this site — can open the file again.</p>
          </div>
          <p>
            <button type="button" className="btn btn--primary" disabled={!canRun} onClick={() => void run()}>
              {busy ? 'Encrypting…' : 'Add the password'}
            </button>
          </p>
        </div>
      )}

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' && !file && 'No file yet. Choose a PDF to begin.'}
        {phase === 'idle' && file && `${pageCount ?? 0} pages ready.`}
        {phase === 'working' && 'Encrypting with qpdf…'}
        {phase === 'done' && out && `Protected ${out.pages} page${out.pages === 1 ? '' : 's'}.`}
        {phase === 'error' && 'The password was not added. The reason is below.'}
      </p>

      {error && <div className="note note--danger"><h2>What happened</h2><p>{error}</p></div>}

      {out && (
        <section className="card" aria-labelledby="protect-result-heading">
          <h2 id="protect-result-heading">Your protected PDF</h2>
          <p className="result-summary"><span>AES-256</span><span>{formatBytes(out.bytes.length)}</span></p>
          <p><button type="button" className="btn btn--primary" onClick={save}>Download the PDF</button></p>
          <p className="muted">Store the password first. It cannot be reset.</p>
        </section>
      )}
    </div>
  );
}
