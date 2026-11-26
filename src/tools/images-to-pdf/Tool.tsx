// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for images-to-pdf: pick images, choose a sheet size, build one PDF locally.
import { useEffect, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { ResultPreviewButton } from '../../components/ResultPreviewButton';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import {
  buildPdfFromImages,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
  type ImageType,
  type PageSizeOption,
} from './engine';

interface Selected {
  id: string;
  file: File;
}

type Phase = 'idle' | 'working' | 'done' | 'error';

function typeOf(file: File): ImageType | null {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/jpeg') return 'jpeg';
  return null;
}

export default function Tool() {
  const [files, setFiles] = useState<Selected[]>([]);
  const [pageSize, setPageSize] = useState<PageSizeOption>('a4');
  const [phase, setPhase] = useState<Phase>('idle');
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ bytes: Uint8Array; pageCount: number } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  const busy = phase === 'working';
  const usable = ready && !busy;

  function addFiles(incoming: File[]) {
    const accepted: Selected[] = [];
    const refused: string[] = [];
    for (const file of incoming) {
      if (typeOf(file) === null) {
        refused.push(`"${file.name}" is not a PNG or JPEG image.`);
      } else if (file.size > MAX_IMAGE_BYTES) {
        refused.push(`"${file.name}" is larger than 25 MB.`);
      } else {
        accepted.push({ id: `${file.name}-${file.lastModified}-${Math.random()}`, file });
      }
    }
    setFiles((current) => {
      const room = Math.max(MAX_IMAGES - current.length, 0);
      if (accepted.length > room) {
        refused.push(`Only ${MAX_IMAGES} images fit in one PDF; the rest were not added.`);
      }
      return [...current, ...accepted.slice(0, room)];
    });
    setError(refused.length > 0 ? refused.join(' ') : null);
    setPhase('idle');
    setResult(null);
  }

  function removeFile(id: string) {
    setFiles((current) => current.filter((item) => item.id !== id));
    setResult(null);
    setPhase('idle');
  }

  async function build() {
    setPhase('working');
    setError(null);
    setResult(null);
    setStatus('Reading the images…');
    try {
      const sources = [];
      for (const item of files) {
        const bytes = new Uint8Array(await item.file.arrayBuffer());
        const type = typeOf(item.file);
        if (!type) throw new Error(`"${item.file.name}" is not a PNG or JPEG image.`);
        sources.push({ name: item.file.name, bytes, type });
      }
      const built = await buildPdfFromImages(sources, { pageSize });
      if (!built.ok) {
        setError(built.message);
        setStatus('The PDF was not created.');
        setPhase('error');
        return;
      }
      setResult({ bytes: built.bytes, pageCount: built.pageCount });
      setStatus(`PDF ready with ${built.pageCount} page${built.pageCount === 1 ? '' : 's'}.`);
      setPhase('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The PDF could not be created.');
      setStatus('The PDF was not created.');
      setPhase('error');
    }
  }

  function save() {
    if (!result) return;
    const first = files[0]?.file.name.replace(/\.(png|jpe?g)$/i, '') ?? 'document';
    downloadBlob(bytesToBlob(result.bytes, 'application/pdf'), `${first}-and-more.pdf`);
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <FileDrop
        id="images-input"
        accept="image/png,image/jpeg,.png,.jpg,.jpeg"
        label={files.length === 0 ? 'Choose the images to put in the PDF' : 'Add more images'}
        hint="PNG or JPEG. They stay on this device and are written into the PDF here."
        buttonLabel={files.length === 0 ? 'Choose images' : 'Add images'}
        multiple
        disabled={!usable}
        previewFiles={files.map((item) => item.file)}
        onFiles={addFiles}
      />

      {files.length > 0 && (
        <section className="card" aria-labelledby="selected-heading">
          <h2 id="selected-heading">In this PDF</h2>
          <ul className="file-list">
            {files.map((item, index) => (
              <li key={item.id}>
                <span>
                  {index + 1}. {item.file.name}
                </span>
                <span className="muted">{formatBytes(item.file.size)}</span>
                <button
                  type="button"
                  className="btn btn--ghost"
                  aria-label={`Remove ${item.file.name}`}
                  disabled={busy}
                  onClick={() => removeFile(item.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <p className="muted">
            Pages follow this order. {files.length} of {MAX_IMAGES} allowed.
          </p>
        </section>
      )}

      {files.length > 0 && (
        <div className="card">
          <div className="field">
            <label className="field__label" htmlFor="images-pagesize">
              Page size
            </label>
            <select
              id="images-pagesize"
              className="select"
              value={pageSize}
              disabled={!usable}
              onChange={(event) => {
                setPageSize(event.target.value as PageSizeOption);
                setResult(null);
                setPhase('idle');
              }}
            >
              <option value="a4">A4, portrait or landscape to match each image</option>
              <option value="letter">US Letter, orientation to match</option>
              <option value="image">Match each image at 72 DPI</option>
            </select>
          </div>
          <p className="muted">
            Every image is fitted inside the page without cropping. A landscape photo on A4 gets a
            landscape sheet.
          </p>
          <p>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!usable}
              onClick={() => void build()}
            >
              {busy ? 'Building the PDF…' : 'Create the PDF'}
            </button>
          </p>
        </div>
      )}

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' && files.length === 0 && 'No images yet. Choose at least one.'}
        {phase === 'idle' && files.length > 0 && `${files.length} image${files.length === 1 ? '' : 's'} ready.`}
        {phase === 'working' && 'Building the PDF…'}
        {phase === 'error' && 'The PDF was not created. The reason is below.'}
        {phase === 'done' && status}
      </p>

      {error && (
        <div className="note note--danger">
          <h2>What happened</h2>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <section className="card" aria-labelledby="images-result-heading">
          <h2 id="images-result-heading">Your PDF</h2>
          <p className="result-summary">
            <span>
              {result.pageCount} page{result.pageCount === 1 ? '' : 's'}
            </span>
            <span>{formatBytes(result.bytes.length)}</span>
          </p>
          <p>
            <button type="button" className="btn btn--primary" onClick={save}>
              Download the PDF
            </button>
          </p>
          <ResultPreviewButton bytes={result.bytes} filename={`${files[0]?.file.name.replace(/\.(png|jpe?g)$/i, '') ?? 'document'}-and-more.pdf`} />
          <p className="muted">
            Written in this tab. Nothing is stored after you close it.
          </p>
        </section>
      )}
    </div>
  );
}
