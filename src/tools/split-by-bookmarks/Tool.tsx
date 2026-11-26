// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for split-by-bookmarks: list the outline, then split at each top-level section.
import { useEffect, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import { countPdfPages } from '../../lib/pdf';
import { zipStore } from '../../lib/zip';
import {
  readBookmarks,
  splitByBookmarks,
  type Bookmark,
  type SectionFile,
} from './engine';

type Phase = 'idle' | 'working' | 'done' | 'error';

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [out, setOut] = useState<SectionFile[] | null>(null);
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
    setBookmarks([]);
    setSkipped(0);
    reset();
    const bytes = new Uint8Array(await chosen.arrayBuffer());
    setPageCount(await countPdfPages(bytes));
    const read = await readBookmarks({ name: chosen.name, bytes });
    if (!read.ok) {
      setError(read.message);
      setPhase('error');
      return;
    }
    setBookmarks(read.bookmarks);
    setSkipped(read.skipped);
  }

  async function run() {
    if (!file) return;
    setPhase('working');
    setError(null);
    setOut(null);
    try {
      const result = await splitByBookmarks({
        name: file.name,
        bytes: new Uint8Array(await file.arrayBuffer()),
      });
      if (!result.ok) {
        setError(result.message);
        setPhase('error');
        return;
      }
      setOut(result.files);
      setPhase('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The sections could not be made.');
      setPhase('error');
    }
  }

  function save() {
    if (!out) return;
    const base = file?.name.replace(/\.pdf$/i, '') ?? 'document';
    if (out.length === 1 && out[0]) {
      downloadBlob(new Blob([out[0].bytes], { type: 'application/pdf' }), out[0].name);
      return;
    }
    downloadBlob(zipStore(out), `${base}-bookmarks.zip`);
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <FileDrop
        id="bookmarks-input"
        accept="application/pdf,.pdf"
        label="Choose the PDF with bookmarks"
        hint="It stays on this device. Only top-level outline entries are used."
        buttonLabel="Choose a PDF"
        disabled={!ready}
        selectedFile={file ? { name: file.name, size: file.size, detail: pageCount === null ? undefined : `${pageCount} pages` } : null}
        onClear={() => {
          setFile(null);
          setPageCount(null);
          setBookmarks([]);
          setSkipped(0);
          reset();
        }}
        onFiles={(chosen) => {
          const first = chosen[0];
          if (first) void choose(first);
        }}
      />

      {file && bookmarks.length > 0 && (
        <div className="card">
          <h2 className="field__label">Sections found</h2>
          <ol className="bookmark-list">
            {bookmarks.slice(0, 20).map((bookmark) => (
              <li key={`${bookmark.page}-${bookmark.title}`}>
                <span>{bookmark.title}</span>
                <span className="muted">page {bookmark.page}</span>
              </li>
            ))}
          </ol>
          {bookmarks.length > 20 && (
            <p className="field__hint">Showing the first 20 of {bookmarks.length} sections.</p>
          )}
          {skipped > 0 && (
            <p className="field__hint">
              {skipped} outline entr{skipped === 1 ? 'y was' : 'ies were'} skipped because they do
              not point straight at a page.
            </p>
          )}
          <div className="note note--warning">
            <p>Each section is rebuilt, so links, forms and the old bookmarks are lost.</p>
          </div>
          <p>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!ready || busy || bookmarks.length < 2}
              onClick={() => void run()}
            >
              {busy ? 'Splitting…' : 'Split at the bookmarks'}
            </button>
            {bookmarks.length < 2 && (
              <span className="field__hint">At least two bookmarks are needed.</span>
            )}
          </p>
        </div>
      )}

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' && !file && 'No file yet. Choose a PDF to begin.'}
        {phase === 'idle' && file && bookmarks.length > 0 && `Found ${bookmarks.length} bookmarks.`}
        {phase === 'working' && 'Copying the sections…'}
        {phase === 'done' && out && `Made ${out.length} sections.`}
        {phase === 'error' && 'The PDF was not split. The reason is below.'}
      </p>

      {error && <div className="note note--danger"><h2>What happened</h2><p>{error}</p></div>}

      {out && (
        <section className="card" aria-labelledby="bookmarks-result-heading">
          <h2 id="bookmarks-result-heading">Your sections</h2>
          <p className="result-summary">
            <span>{out.length} files</span>
            <span>{formatBytes(out.reduce((sum, entry) => sum + entry.bytes.length, 0))}</span>
          </p>
          <ul className="bookmark-list">
            {out.map((entry) => (
              <li key={entry.name}>
                <span>{entry.name}</span>
                <span className="muted">{formatBytes(entry.bytes.length)}</span>
              </li>
            ))}
          </ul>
          <p>
            <button type="button" className="btn btn--primary" onClick={save}>
              {out.length === 1 ? 'Download the PDF' : 'Download the ZIP'}
            </button>
          </p>
          <p className="muted">Your original file is untouched.</p>
        </section>
      )}
    </div>
  );
}
