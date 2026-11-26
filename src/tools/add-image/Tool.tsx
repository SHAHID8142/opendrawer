// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for add-image: one PDF, one PNG/JPEG, five positions, then download.
import { useEffect, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import { countPdfPages } from '../../lib/pdf';
import { addImageToPdf } from './engine';
import { PlacementFields } from './PlacementFields';
import { DEFAULT_SETTINGS, evaluateSettings, type ImageSettings } from './options';

type Phase = 'idle' | 'working' | 'done' | 'error';

export default function Tool() {
  const [pdf, setPdf] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [settings, setSettings] = useState<ImageSettings>(DEFAULT_SETTINGS);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [out, setOut] = useState<{ bytes: Uint8Array; placed: number; scaled: boolean } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  const busy = phase === 'working';
  const evaluated = evaluateSettings(settings, pageCount);
  const valid =
    evaluated.widthValid &&
    evaluated.marginValid &&
    evaluated.syntaxError === null &&
    evaluated.boundsError === null &&
    evaluated.selection !== null;
  const canRun = ready && !busy && image !== null && valid;

  function resetResult() {
    setOut(null);
    setPhase('idle');
  }

  function edit(next: ImageSettings) {
    setSettings(next);
    resetResult();
  }

  async function choosePdf(chosen: File) {
    setPdf(chosen);
    setPageCount(null);
    setError(null);
    resetResult();
    const count = await countPdfPages(new Uint8Array(await chosen.arrayBuffer()));
    setPageCount(count);
    if (count === null) {
      setError('That file could not be read as a PDF. It may be damaged or password protected.');
      setPhase('error');
    }
  }

  async function run() {
    if (!pdf || !image || evaluated.selection === null) return;
    setPhase('working');
    setError(null);
    setOut(null);
    try {
      const result = await addImageToPdf(
        { name: pdf.name, bytes: new Uint8Array(await pdf.arrayBuffer()) },
        { name: image.name, bytes: new Uint8Array(await image.arrayBuffer()) },
        {
          placement: settings.placement,
          widthMm: settings.widthMm,
          marginMm: settings.marginMm,
          opacity: settings.opacity,
          pages: evaluated.selection,
        },
      );
      if (!result.ok) {
        setError(result.message);
        setPhase('error');
        return;
      }
      setOut({ bytes: result.bytes, placed: result.placed, scaled: result.scaled });
      setPhase('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The image could not be added.');
      setPhase('error');
    }
  }

  function save() {
    if (!out || !pdf) return;
    const base = pdf.name.replace(/\.pdf$/i, '');
    downloadBlob(bytesToBlob(out.bytes, 'application/pdf'), `${base}-with-image.pdf`);
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <FileDrop
        id="image-pdf-input"
        accept="application/pdf,.pdf"
        label="1. Choose the PDF"
        hint="It stays on this device."
        buttonLabel="Choose a PDF"
        disabled={!ready}
        selectedFile={
          pdf
            ? {
                name: pdf.name,
                size: pdf.size,
                detail: pageCount === null ? undefined : `${pageCount} pages`,
              }
            : null
        }
        onClear={() => {
          setPdf(null);
          setPageCount(null);
          setError(null);
          resetResult();
        }}
        onFiles={(chosen) => {
          const first = chosen[0];
          if (first) void choosePdf(first);
        }}
      />

      <FileDrop
        id="image-file-input"
        accept="image/png,image/jpeg,.png,.jpg,.jpeg"
        label="2. Choose the image"
        hint="PNG or JPEG only. Transparency is kept."
        buttonLabel="Choose an image"
        disabled={!ready}
        selectedFile={image ? { name: image.name, size: image.size, detail: 'PNG or JPEG' } : null}
        onClear={() => {
          setImage(null);
          setError(null);
          resetResult();
        }}
        onFiles={(chosen) => {
          const first = chosen[0];
          if (first) {
            setImage(first);
            setError(null);
            resetResult();
          }
        }}
      />

      {pdf && pageCount !== null && image && (
        <div className="card">
          <PlacementFields
            settings={settings}
            evaluated={evaluated}
            pageCount={pageCount}
            disabled={!ready || busy}
            onChange={edit}
          />
          <div className="note note--warning">
            <p>
              The image is added on top of the page. It covers what lies under it but does not
              remove it, so it is not redaction.
            </p>
          </div>
          <p>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!canRun}
              onClick={() => void run()}
            >
              {busy ? 'Adding the image…' : 'Add the image'}
            </button>
          </p>
        </div>
      )}

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' && !pdf && 'No file yet. Choose a PDF to begin.'}
        {phase === 'idle' && pdf && !image && 'Now choose a PNG or JPEG image.'}
        {phase === 'idle' && pdf && image && 'Ready to place the image.'}
        {phase === 'working' && 'Adding the image…'}
        {phase === 'done' &&
          out &&
          `Added the image to ${out.placed} page${out.placed === 1 ? '' : 's'}.`}
        {phase === 'error' && 'The image was not added. The reason is below.'}
      </p>

      {error && (
        <div className="note note--danger">
          <h2>What happened</h2>
          <p>{error}</p>
        </div>
      )}

      {out && (
        <section className="card" aria-labelledby="image-result-heading">
          <h2 id="image-result-heading">Your PDF with the image</h2>
          <p className="result-summary">
            <span>
              {out.placed} page{out.placed === 1 ? '' : 's'}
            </span>
            <span>{formatBytes(out.bytes.length)}</span>
          </p>
          {out.scaled && (
            <p className="field__hint">
              The image was shrunk to fit the page while keeping its shape.
            </p>
          )}
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
