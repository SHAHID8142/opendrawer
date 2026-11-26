// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for flatten-pdf: one action, honest notes about what flattening does not cover.
import { useEffect, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { ResultPreviewButton } from '../../components/ResultPreviewButton';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import { countPdfPages } from '../../lib/pdf';
import { flattenPdf } from './engine';

type Phase = 'idle' | 'working' | 'done' | 'error';

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [out, setOut] = useState<{ bytes: Uint8Array; flattened: number } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  const busy = phase === 'working';

  async function choose(chosen: File) {
    setFile(chosen);
    setOut(null);
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

  async function flatten() {
    if (!file) return;
    setPhase('working');
    setError(null);
    setOut(null);
    try {
      const result = await flattenPdf({
        name: file.name,
        bytes: new Uint8Array(await file.arrayBuffer()),
      });
      if (!result.ok) {
        setError(result.message);
        setPhase('error');
        return;
      }
      setOut({ bytes: result.bytes, flattened: result.flattened });
      setPhase('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The form could not be flattened.');
      setPhase('error');
    }
  }

  function save() {
    if (!out || !file) return;
    const base = file.name.replace(/\.pdf$/i, '');
    downloadBlob(bytesToBlob(out.bytes, 'application/pdf'), `${base}-flattened.pdf`);
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <FileDrop
        id="flatten-input"
        accept="application/pdf,.pdf"
        label="Choose the PDF with form fields"
        hint="It stays on this device. Field values become part of the page."
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
        }}
        onFiles={(chosen) => {
          const first = chosen[0];
          if (first) void choose(first);
        }}
      />

      {file && pageCount !== null && (
        <div className="card">
          <p>
            Flattening turns each input, checkbox and signature field into ordinary page content.
            The document can still be read and printed, but nobody can type into it again.
          </p>
          <div className="note note--warning">
            <p>
              This works on standard AcroForm fields only. Comments, highlighted text and layers
              are not flattened, and an XFA form is refused with a suggestion instead.
            </p>
          </div>
          <p>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!ready || busy}
              onClick={() => void flatten()}
            >
              {busy ? 'Flattening…' : 'Flatten the form'}
            </button>
          </p>
        </div>
      )}

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' && !file && 'No file yet. Choose a PDF to begin.'}
        {phase === 'idle' && file && pageCount !== null && `${pageCount} pages ready.`}
        {phase === 'working' && 'Flattening the form fields…'}
        {phase === 'done' &&
          out &&
          `Flattened ${out.flattened} form field${out.flattened === 1 ? '' : 's'}.`}
        {phase === 'error' && 'The form was not flattened. The reason is below.'}
      </p>

      {error && (
        <div className="note note--danger">
          <h2>What happened</h2>
          <p>{error}</p>
        </div>
      )}

      {out && (
        <section className="card" aria-labelledby="flatten-result-heading">
          <h2 id="flatten-result-heading">Your flattened PDF</h2>
          <p className="result-summary">
            <span>
              {out.flattened} field{out.flattened === 1 ? '' : 's'} flattened
            </span>
            <span>{formatBytes(out.bytes.length)}</span>
          </p>
          <p>
            <button type="button" className="btn btn--primary" onClick={save}>
              Download the PDF
            </button>
          </p>
          <ResultPreviewButton bytes={out.bytes} filename={`${file?.name.replace(/\.pdf$/i, '') ?? 'document'}-flattened.pdf`} />
          <p className="muted">Written in this tab. Nothing is stored after you close it.</p>
        </section>
      )}
    </div>
  );
}
