// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for extract-text: choose a PDF, read the text in place, download it as a .txt file.
import { useEffect, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { countPdfPages } from '../../lib/pdf';
import { ResultNotes } from './ResultNotes';
import { extractText } from './extract';
import { textFileName } from './engine';

type Phase = 'idle' | 'working' | 'done' | 'error';
const PREVIEW_LIMIT = 8000;

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [markers, setMarkers] = useState(true);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [out, setOut] = useState<{
    text: string;
    pageCount: number;
    emptyPages: number[];
    unreadablePages: number[];
    partialPages: number[];
  } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  const busy = phase === 'working';

  async function choose(chosen: File) {
    setFile(chosen);
    setOut(null);
    setPhase('idle');
    setError(null);
    setProgress(null);
    setPageCount(null);
    const count = await countPdfPages(new Uint8Array(await chosen.arrayBuffer()));
    setPageCount(count);
  }

  async function run() {
    if (!file) return;
    setPhase('working');
    setError(null);
    setOut(null);
    setProgress(null);
    try {
      const result = await extractText(
        file.name,
        new Uint8Array(await file.arrayBuffer()),
        { markers },
        (done, total) => setProgress({ done, total }),
      );
      if (!result.ok) {
        setError(result.message);
        setPhase('error');
        return;
      }
      setOut({
        text: result.text,
        pageCount: result.pageCount,
        emptyPages: result.emptyPages,
        unreadablePages: result.unreadablePages,
        partialPages: result.partialPages,
      });
      setPhase('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The text could not be extracted.');
      setPhase('error');
    }
  }

  function save() {
    if (!out || !file) return;
    const bytes = new TextEncoder().encode(out.text);
    downloadBlob(bytesToBlob(bytes, 'text/plain;charset=utf-8'), textFileName(file.name));
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <FileDrop
        id="extract-input"
        accept="application/pdf,.pdf"
        label="Choose the PDF to read"
        hint="It stays on this device. Only selectable text can be read; scans have none."
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
          setOut(null);
          setPhase('idle');
          setError(null);
          setProgress(null);
        }}
        onFiles={(chosen) => {
          const first = chosen[0];
          if (first) void choose(first);
        }}
      />

      {file && (
        <div className="card">
          <label className="checkbox" htmlFor="extract-markers">
            <input
              id="extract-markers"
              type="checkbox"
              checked={markers}
              disabled={!ready || busy}
              onChange={(event) => {
                setMarkers(event.target.checked);
                setOut(null);
                setPhase('idle');
              }}
            />
            <span>Label each page with a “--- Page N ---” line</span>
          </label>
          <p className="field__hint">
            Text is copied in reading order. Columns, tables and spacing are not preserved.
          </p>
          <p>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!ready || busy}
              onClick={() => void run()}
            >
              {busy ? 'Reading the pages…' : 'Extract the text'}
            </button>
          </p>
        </div>
      )}

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' && !file && 'No file yet. Choose a PDF to begin.'}
        {phase === 'idle' && file && 'Ready to read.'}
        {phase === 'working' &&
          (progress ? `Reading page ${progress.done} of ${progress.total}…` : 'Opening the PDF…')}
        {phase === 'done' && out && `Read ${out.pageCount} page${out.pageCount === 1 ? '' : 's'}.`}
        {phase === 'error' && 'The text was not extracted. The reason is below.'}
      </p>

      {error && (
        <div className="note note--danger">
          <h2>What happened</h2>
          <p>{error}</p>
        </div>
      )}

      {out && (
        <section className="card" aria-labelledby="extract-result-heading">
          <h2 id="extract-result-heading">The text</h2>
          <p className="result-summary">
            <span>{out.text.length.toLocaleString()} characters</span>
            <span>
              {out.pageCount} page{out.pageCount === 1 ? '' : 's'}
            </span>
          </p>
          <ResultNotes
            emptyPages={out.emptyPages}
            unreadablePages={out.unreadablePages}
            partialPages={out.partialPages}
          />
          <label className="field__label" htmlFor="extracted-text">
            Preview
          </label>
          <textarea
            id="extracted-text"
            className="textarea"
            readOnly
            rows={12}
            value={out.text.slice(0, PREVIEW_LIMIT)}
          />
          <p className="field__hint">
            {out.text.length > PREVIEW_LIMIT
              ? `Showing the first ${PREVIEW_LIMIT.toLocaleString()} of ${out.text.length.toLocaleString()} characters. The download has all of it.`
              : 'The download contains exactly this text as UTF-8.'}
          </p>
          <p>
            <button type="button" className="btn btn--primary" onClick={save}>
              Download the text file
            </button>
          </p>
          <p className="muted">Written in this tab. Nothing is stored after you close it.</p>
        </section>
      )}
    </div>
  );
}
