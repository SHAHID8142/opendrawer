// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for redact-pdf: draw boxes on a rendered page, then replace those pages with a raster
// where the content is gone. It never just paints over the original text layer.
import { useEffect, useRef, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import { countPdfPages } from '../../lib/pdf';
import { applyRedactions } from './apply';
import {
  normalizeRect,
  redactedName,
  rectToPixels,
  totalAreas,
  type NormalizedRect,
  type Point,
} from './engine';

type Phase = 'idle' | 'working' | 'done' | 'error';

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [rects, setRects] = useState<Record<number, NormalizedRect[]>>({});
  const [drag, setDrag] = useState<{ start: Point; end: Point; width: number; height: number } | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [out, setOut] = useState<{ bytes: Uint8Array; pages: number; redactedPages: number; areas: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [rendering, setRendering] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setReady(true), []);
  const busy = phase === 'working';
  const areas = totalAreas(rects);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    let loading: { destroy: () => Promise<void> } | null = null;
    async function draw() {
      setRendering(true);
      const pdfjs = await import('pdfjs-dist');
      const workerModule = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
      pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
      const task = pdfjs.getDocument({ data: new Uint8Array(await file!.arrayBuffer()), useSystemFonts: false });
      loading = task;
      const doc = await task.promise;
      const page = await doc.getPage(pageNumber);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(1.6, 900 / base.width);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d');
      if (!context) return;
      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      page.cleanup();
      setRendering(false);
    }
    void draw().catch(() => {
      if (!cancelled) {
        setRendering(false);
        setError('This page could not be rendered for redaction.');
        setPhase('error');
      }
    });
    return () => {
      cancelled = true;
      void loading?.destroy();
    };
  }, [file, pageNumber]);

  function canvasPoint(event: React.PointerEvent<HTMLDivElement>): Point {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const box = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * canvas.width,
      y: ((event.clientY - box.top) / box.height) * canvas.height,
    };
  }

  function reset() {
    setOut(null);
    setPhase('idle');
    setError(null);
  }

  async function choose(chosen: File) {
    setFile(chosen);
    setPageCount(null);
    setPageNumber(1);
    setRects({});
    reset();
    const count = await countPdfPages(new Uint8Array(await chosen.arrayBuffer()));
    setPageCount(count);
    if (count === null) {
      setError('That file could not be read as a PDF. It may be damaged; try Repair first.');
      setPhase('error');
    }
  }

  async function run() {
    if (!file || areas === 0) return;
    setPhase('working');
    setError(null);
    setOut(null);
    try {
      const result = await applyRedactions(
        file.name,
        new Uint8Array(await file.arrayBuffer()),
        rects,
        () => undefined,
      );
      if (!result.ok) {
        setError(result.message);
        setPhase('error');
        return;
      }
      setOut(result);
      setPhase('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The redacted file could not be written.');
      setPhase('error');
    }
  }

  function save() {
    if (!out || !file) return;
    downloadBlob(bytesToBlob(out.bytes, 'application/pdf'), redactedName(file.name));
  }

  const pageRects = rects[pageNumber] ?? [];
  const stageRect = drag && canvasRef.current
    ? {
        left: `${(Math.min(drag.start.x, drag.end.x) / drag.width) * 100}%`,
        top: `${(Math.min(drag.start.y, drag.end.y) / drag.height) * 100}%`,
        width: `${(Math.abs(drag.end.x - drag.start.x) / drag.width) * 100}%`,
        height: `${(Math.abs(drag.end.y - drag.start.y) / drag.height) * 100}%`,
      }
    : null;

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <FileDrop
        id="redact-input"
        accept="application/pdf,.pdf"
        label="Choose the PDF to redact"
        hint="It stays on this device. Pages with boxes are rebuilt as images, so their text is destroyed."
        buttonLabel="Choose a PDF"
        disabled={!ready}
        selectedFile={file ? { name: file.name, size: file.size, detail: pageCount === null ? undefined : `${pageCount} pages` } : null}
        onClear={() => {
          setFile(null);
          setPageCount(null);
          setRects({});
          setPageNumber(1);
          reset();
        }}
        onFiles={(chosen) => {
          const first = chosen[0];
          if (first) void choose(first);
        }}
      />

      {file && pageCount !== null && (
        <div className="card">
          <div className="form__row">
            <div className="field">
              <span className="field__label">Page {pageNumber} of {pageCount}</span>
              <div className="drop-bar__actions">
                <button type="button" className="btn btn--secondary" disabled={pageNumber <= 1} onClick={() => setPageNumber(pageNumber - 1)}>Previous</button>
                <button type="button" className="btn btn--secondary" disabled={pageNumber >= pageCount} onClick={() => setPageNumber(pageNumber + 1)}>Next</button>
              </div>
            </div>
            <div className="field">
              <span className="field__label">{pageRects.length} box{pageRects.length === 1 ? '' : 'es'} on this page</span>
              <div className="drop-bar__actions">
                <button type="button" className="btn btn--secondary" disabled={pageRects.length === 0} onClick={() => setRects({ ...rects, [pageNumber]: pageRects.slice(0, -1) })}>Undo last</button>
                <button type="button" className="btn btn--secondary" disabled={pageRects.length === 0} onClick={() => setRects({ ...rects, [pageNumber]: [] })}>Clear this page</button>
              </div>
            </div>
          </div>

          <div
            className="redact-stage"
            ref={stageRef}
            onPointerDown={(event) => {
              if (rendering || busy) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              const point = canvasPoint(event);
              const canvas = canvasRef.current!;
              setDrag({ start: point, end: point, width: canvas.width, height: canvas.height });
            }}
            onPointerMove={(event) => {
              if (!drag) return;
              setDrag({ ...drag, end: canvasPoint(event) });
            }}
            onPointerUp={(event) => {
              if (!drag) return;
              const end = canvasPoint(event);
              const rect = normalizeRect(drag.start, end, drag.width, drag.height);
              if (rect) setRects((current) => ({ ...current, [pageNumber]: [...(current[pageNumber] ?? []), rect] }));
              setDrag(null);
            }}
          >
            <canvas ref={canvasRef} aria-label={`Page ${pageNumber} preview`} />
            <div className="redact-overlay">
              {pageRects.map((rect, index) => {
                const canvas = canvasRef.current;
                const pixels = canvas ? rectToPixels(rect, canvas.width, canvas.height) : null;
                return (
                  <span
                    key={`${index}-${rect.x}`}
                    className="redact-box"
                    style={pixels && canvas ? {
                      left: `${(pixels.x / canvas.width) * 100}%`,
                      top: `${(pixels.y / canvas.height) * 100}%`,
                      width: `${(pixels.width / canvas.width) * 100}%`,
                      height: `${(pixels.height / canvas.height) * 100}%`,
                    } : undefined}
                  />
                );
              })}
              {stageRect && <span className="redact-box" style={stageRect} />}
            </div>
          </div>
          <p className="field__hint">
            Drag across the page to draw a black box. Pages with boxes lose <strong>all</strong> of their selectable text.
          </p>

          <div className="note note--warning">
            <p><strong>This is real redaction, not a black rectangle over live text.</strong> Those pages are replaced by images with the boxes burned in. Check the download before sharing it.</p>
          </div>

          <p>
            <button type="button" className="btn btn--primary" disabled={!ready || busy || areas === 0} onClick={() => void run()}>
              {busy ? 'Rasterising the pages…' : `Redact ${areas} area${areas === 1 ? '' : 's'}`}
            </button>
          </p>
        </div>
      )}

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' && !file && 'No file yet. Choose a PDF to begin.'}
        {phase === 'idle' && file && (rendering ? 'Drawing the page…' : 'Drag a box over anything that must disappear.')}
        {phase === 'working' && 'Rebuilding the redacted pages…'}
        {phase === 'done' && out && `Redacted ${out.redactedPages} page${out.redactedPages === 1 ? '' : 's'}. Their text is gone.`}
        {phase === 'error' && 'The file was not redacted. The reason is below.'}
      </p>

      {error && <div className="note note--danger"><h2>What happened</h2><p>{error}</p></div>}

      {out && (
        <section className="card" aria-labelledby="redact-result-heading">
          <h2 id="redact-result-heading">Your redacted PDF</h2>
          <p className="result-summary">
            <span>{out.redactedPages} of {out.pages} pages redacted</span>
            <span>{out.areas} areas</span>
            <span>{formatBytes(out.bytes.length)}</span>
          </p>
          <p><button type="button" className="btn btn--primary" onClick={save}>Download the PDF</button></p>
          <p className="muted">The boxes are permanent; the original on your device is untouched.</p>
        </section>
      )}
    </div>
  );
}
