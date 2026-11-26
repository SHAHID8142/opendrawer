// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for split-pdf: one file in, a range plan out. One PDF per range or per page.
import { useEffect, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import { parseExplicitPages, parsePageGroups, togglePageInRange, validatePageRangeSyntax } from '../../lib/page-range';
import { zipStore } from '../../lib/zip';
import { countPdfPages, splitPdf, type SplitFile } from './engine';

type Mode = 'ranges' | 'each';
type Phase = 'idle' | 'working' | 'done' | 'error';

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>('ranges');
  const [range, setRange] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<SplitFile[] | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  const busy = phase === 'working';
  const usable = ready && !busy;
  const syntaxError = mode === 'ranges' ? validatePageRangeSyntax(range) : null;
  const boundsError =
    mode === 'ranges' && pageCount !== null && syntaxError === null
      ? (() => {
          try {
            parsePageGroups(range, pageCount);
            return null;
          } catch (cause) {
            return cause instanceof Error ? cause.message : 'That range is outside the document.';
          }
        })()
      : null;

  async function choose(chosen: File) {
    setFile(chosen);
    setFiles(null);
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

  async function split() {
    if (!file) return;
    setPhase('working');
    setError(null);
    setFiles(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const count = pageCount ?? (await countPdfPages(bytes));
      if (count === null) throw new Error('The PDF could not be read.');
      const groups =
        mode === 'each'
          ? Array.from({ length: count }, (_, index) => ({
              pages: [index + 1],
              label: String(index + 1),
            }))
          : parsePageGroups(range, count);
      const result = await splitPdf({ name: file.name, bytes }, groups);
      if (!result.ok) {
        setError(result.message);
        setPhase('error');
        return;
      }
      setFiles(result.files);
      setPhase('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The PDF could not be split.');
      setPhase('error');
    }
  }

  function save() {
    if (!files || files.length === 0) return;
    const base = (file?.name ?? 'document').replace(/\.pdf$/i, '');
    if (files.length === 1 && files[0]) {
      downloadBlob(bytesToBlob(files[0].bytes, 'application/pdf'), files[0].name);
      return;
    }
    downloadBlob(zipStore(files), `${base}-split.zip`);
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <FileDrop
        id="split-input"
        accept="application/pdf,.pdf"
        label="Choose the PDF to split"
        hint="It stays on this device. Pages are copied here, not re-rendered."
        buttonLabel="Choose a PDF"
        disabled={!usable}
        selectedFile={file ? { name: file.name, size: file.size, detail: pageCount === null ? undefined : `${pageCount} pages` } : null}
        selectedPages={pageCount && mode === 'ranges' ? parseExplicitPages(range, pageCount) : []}
        onTogglePage={
          pageCount && mode === 'ranges'
            ? (pageNo) => {
                setRange((curr) => togglePageInRange(curr, pageNo, pageCount));
                setFiles(null);
                setPhase('idle');
              }
            : undefined
        }
        onClear={() => {
          setFile(null);
          setPageCount(null);
          setFiles(null);
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
          <fieldset className="fieldset" disabled={!usable}>
            <legend>How to split</legend>

            <div className="field">
              <label className="field__label" htmlFor="split-mode">
                Output
              </label>
              <select
                id="split-mode"
                className="select"
                value={mode}
                onChange={(event) => {
                  setMode(event.target.value === 'each' ? 'each' : 'ranges');
                  setFiles(null);
                  setPhase('idle');
                }}
              >
                <option value="ranges">One PDF per range, from the box below</option>
                <option value="each">One PDF per page</option>
              </select>
            </div>

            {mode === 'ranges' && (
              <div className="field">
                <label className="field__label" htmlFor="split-range">
                  Pages and ranges
                </label>
                <input
                  id="split-range"
                  className="input"
                  type="text"
                  inputMode="numeric"
                  placeholder="for example 1-3, 7, 10-12"
                  value={range}
                  aria-invalid={syntaxError || boundsError ? 'true' : undefined}
                  aria-describedby="split-range-help"
                  onChange={(event) => {
                    setRange(event.target.value);
                    setFiles(null);
                    setPhase('idle');
                  }}
                />
                <p id="split-range-help" className="field__hint">
                  Each comma-separated piece becomes its own PDF. Leave empty for the whole
                  document.
                </p>
                {(syntaxError || boundsError) && (
                  <p className="field__error" role="alert">
                    {syntaxError ?? boundsError}
                  </p>
                )}
              </div>
            )}
          </fieldset>

          <p>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!usable || syntaxError !== null || boundsError !== null}
              onClick={() => void split()}
            >
              {busy ? 'Splitting…' : 'Split the PDF'}
            </button>
          </p>
        </div>
      )}

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' && !file && 'No file yet. Choose a PDF to begin.'}
        {phase === 'idle' && file && pageCount !== null && `${pageCount} pages ready.`}
        {phase === 'working' && 'Copying the pages…'}
        {phase === 'error' && 'The PDF was not split. The reason is below.'}
        {phase === 'done' && files && `Split into ${files.length} file${files.length === 1 ? '' : 's'}.`}
      </p>

      {error && (
        <div className="note note--danger">
          <h2>What happened</h2>
          <p>{error}</p>
        </div>
      )}

      {files && files.length > 0 && (
        <section className="card" aria-labelledby="split-result-heading">
          <h2 id="split-result-heading">Your files</h2>
          <ul className="file-list">
            {files.slice(0, 8).map((part) => (
              <li key={part.name}>
                <span>{part.name}</span>
                <span className="muted">{formatBytes(part.bytes.length)}</span>
              </li>
            ))}
          </ul>
          {files.length > 8 && <p className="muted">and {files.length - 8} more in the ZIP.</p>}
          <p>
            <button type="button" className="btn btn--primary" onClick={save}>
              {files.length === 1 ? 'Download the PDF' : 'Download the ZIP'}
            </button>
          </p>
          <p className="muted">Built in this tab. Nothing is stored after you close it.</p>
        </section>
      )}
    </div>
  );
}
