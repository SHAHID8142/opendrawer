// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for extract-images: size filter, progress, cancellation and a PNG/ZIP download.
import { useEffect, useRef, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { countPdfPages } from '../../lib/pdf';
import { zipStore } from '../../lib/zip';
import { extractImages, type ExtractedImage, type ImageProgress } from './engine';
import { ImageResults } from './ImageResults';

type Phase = 'idle' | 'working' | 'done' | 'error';
const SIZES = [32, 64, 128];
const MINIMUM = 64;

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [minimum, setMinimum] = useState(MINIMUM);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<ImageProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [out, setOut] = useState<{ files: ExtractedImage[]; skipped: number; truncated: boolean } | null>(null);
  const [ready, setReady] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => setReady(true), []);
  const busy = phase === 'working';

  function reset() {
    setOut(null);
    setPhase('idle');
    setError(null);
    setProgress(null);
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
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase('working');
    setError(null);
    setOut(null);
    setProgress(null);
    try {
      const result = await extractImages(
        file.name,
        new Uint8Array(await file.arrayBuffer()),
        minimum,
        setProgress,
        controller.signal,
      );
      if (!result.ok) {
        setError(result.message);
        setPhase('error');
        return;
      }
      setOut({ files: result.files, skipped: result.skipped, truncated: result.truncated });
      setPhase('done');
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') {
        reset();
        return;
      }
      setError(cause instanceof Error ? cause.message : 'The images could not be extracted.');
      setPhase('error');
    } finally {
      abortRef.current = null;
    }
  }

  function save() {
    if (!out) return;
    if (out.files.length === 1 && out.files[0]) {
      const only = out.files[0];
      downloadBlob(bytesToBlob(only.bytes, 'image/png'), only.name);
      return;
    }
    const base = file?.name.replace(/\.pdf$/i, '') ?? 'document';
    downloadBlob(zipStore(out.files), `${base}-images.zip`);
  }

  const totalBytes = out?.files.reduce((sum, entry) => sum + entry.bytes.length, 0) ?? 0;

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <FileDrop
        id="extract-images-input"
        accept="application/pdf,.pdf"
        label="Choose the PDF with images"
        hint="It stays on this device. Pictures are rebuilt as PNG at their drawn size."
        buttonLabel="Choose a PDF"
        disabled={!ready}
        selectedFile={file ? { name: file.name, size: file.size, detail: pageCount === null ? undefined : `${pageCount} pages` } : null}
        onClear={() => {
          abortRef.current?.abort();
          setFile(null);
          setPageCount(null);
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
            <label className="field__label" htmlFor="images-minimum">
              Ignore images smaller than
            </label>
            <select
              id="images-minimum"
              className="select"
              value={minimum}
              disabled={!ready || busy}
              onChange={(event) => {
                setMinimum(Number(event.target.value));
                reset();
              }}
            >
              {SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} px
                </option>
              ))}
            </select>
            <p className="field__hint">Filters out icons, bullets and logos used as decoration.</p>
          </div>
          <p>
            <button type="button" className="btn btn--primary" disabled={!ready || busy} onClick={() => void run()}>
              {busy ? 'Extracting…' : 'Extract the images'}
            </button>
            {busy && (
              <button type="button" className="btn" onClick={() => abortRef.current?.abort()}>
                Stop
              </button>
            )}
          </p>
        </div>
      )}

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' && !file && 'No file yet. Choose a PDF to begin.'}
        {phase === 'idle' && file && `${pageCount ?? 0} pages ready.`}
        {phase === 'working' && (progress ? `Page ${progress.page} of ${progress.total} · ${progress.found} found` : 'Opening the PDF…')}
        {phase === 'done' && out && `Found ${out.files.length} image${out.files.length === 1 ? '' : 's'}.`}
        {phase === 'error' && 'No images were extracted. The reason is below.'}
      </p>

      {error && <div className="note note--danger"><h2>What happened</h2><p>{error}</p></div>}

      {out?.truncated && (
        <div className="note note--warning"><p>Stopped at 100 images. Split the document to get the rest.</p></div>
      )}
      {out && (
        <ImageResults files={out.files} totalBytes={totalBytes} single={out.files.length === 1} onDownload={save} />
      )}
    </div>
  );
}
