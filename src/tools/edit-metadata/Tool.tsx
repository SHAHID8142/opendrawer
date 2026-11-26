// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for edit-metadata: read the information fields, edit them, download the updated PDF.
import { useEffect, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import { countPdfPages } from '../../lib/pdf';
import {
  LIMITS,
  metadataFileName,
  metadataProblem,
  readMetadata,
  writeMetadata,
  type MetadataFields,
} from './engine';

type Phase = 'idle' | 'working' | 'done' | 'error';
const EMPTY: MetadataFields = { title: '', author: '', subject: '', keywords: '' };

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [fields, setFields] = useState<MetadataFields>(EMPTY);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [out, setOut] = useState<{ bytes: Uint8Array; pages: number } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);
  const busy = phase === 'working';
  const problem = metadataProblem(fields);

  function reset() {
    setOut(null);
    setPhase('idle');
    setError(null);
  }

  function edit(key: keyof MetadataFields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
    reset();
  }

  async function choose(chosen: File) {
    setFile(chosen);
    setPageCount(null);
    setFields(EMPTY);
    reset();
    const bytes = new Uint8Array(await chosen.arrayBuffer());
    setPageCount(await countPdfPages(bytes));
    const read = await readMetadata({ name: chosen.name, bytes });
    if (!read.ok) {
      setError(read.message);
      setPhase('error');
      return;
    }
    setFields(read.metadata);
  }

  async function run() {
    if (!file || problem) return;
    setPhase('working');
    setError(null);
    setOut(null);
    try {
      const result = await writeMetadata(
        { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) },
        fields,
      );
      if (!result.ok) {
        setError(result.message);
        setPhase('error');
        return;
      }
      setOut({ bytes: result.bytes, pages: result.pages });
      setPhase('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The details could not be written.');
      setPhase('error');
    }
  }

  function save() {
    if (!out || !file) return;
    downloadBlob(bytesToBlob(out.bytes, 'application/pdf'), metadataFileName(file.name));
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <FileDrop
        id="metadata-input"
        accept="application/pdf,.pdf"
        label="Choose the PDF whose details you want to change"
        hint="It stays on this device. These fields are what a viewer shows in Document properties."
        buttonLabel="Choose a PDF"
        disabled={!ready}
        selectedFile={file ? { name: file.name, size: file.size, detail: pageCount === null ? undefined : `${pageCount} pages` } : null}
        onClear={() => {
          setFile(null);
          setPageCount(null);
          setFields(EMPTY);
          reset();
        }}
        onFiles={(chosen) => {
          const first = chosen[0];
          if (first) void choose(first);
        }}
      />

      {file && pageCount !== null && (
        <div className="card">
          <fieldset className="fieldset" disabled={!ready || busy}>
            <legend>Document details</legend>
            <div className="field">
              <label className="field__label" htmlFor="metadata-title">Title</label>
              <input id="metadata-title" className="input" type="text" maxLength={LIMITS.title} value={fields.title} onChange={(event) => edit('title', event.target.value)} />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="metadata-author">Author</label>
              <input id="metadata-author" className="input" type="text" maxLength={LIMITS.author} value={fields.author} onChange={(event) => edit('author', event.target.value)} />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="metadata-subject">Subject</label>
              <input id="metadata-subject" className="input" type="text" maxLength={LIMITS.subject} value={fields.subject} onChange={(event) => edit('subject', event.target.value)} />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="metadata-keywords">Keywords, separated by commas</label>
              <input id="metadata-keywords" className="input" type="text" maxLength={LIMITS.keywords} value={fields.keywords} onChange={(event) => edit('keywords', event.target.value)} />
            </div>
          </fieldset>
          {problem && <p className="field__error" role="alert">{problem}</p>}
          <div className="note note--warning">
            <p>Clearing a field removes it from the document information. Some producers also embed XMP metadata, which this tool does not rewrite.</p>
          </div>
          <p>
            <button type="button" className="btn btn--primary" disabled={!ready || busy || problem !== null} onClick={() => void run()}>
              {busy ? 'Saving…' : 'Save the details'}
            </button>
          </p>
        </div>
      )}

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' && !file && 'No file yet. Choose a PDF to begin.'}
        {phase === 'idle' && file && `${pageCount ?? 0} pages ready.`}
        {phase === 'working' && 'Writing the details…'}
        {phase === 'done' && out && `Updated the details of ${out.pages} page${out.pages === 1 ? '' : 's'}.`}
        {phase === 'error' && 'The details were not changed. The reason is below.'}
      </p>

      {error && <div className="note note--danger"><h2>What happened</h2><p>{error}</p></div>}

      {out && (
        <section className="card" aria-labelledby="metadata-result-heading">
          <h2 id="metadata-result-heading">Your updated PDF</h2>
          <p className="result-summary">
            <span>{out.pages} pages</span>
            <span>{formatBytes(out.bytes.length)}</span>
          </p>
          <p><button type="button" className="btn btn--primary" onClick={save}>Download the PDF</button></p>
          <p className="muted">Check the title in your viewer’s Document properties.</p>
        </section>
      )}
    </div>
  );
}
