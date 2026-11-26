// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for OCR: choose pages, run the self-hosted Tesseract worker, preview and download text.
import { useEffect, useRef, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { parsePageSelection, validatePageRangeSyntax } from '../../lib/page-range';
import { countPdfPages } from '../../lib/pdf';
import {
  MAX_PAGES,
  assembleOcrText,
  ocrFileName,
  pageLimitMessage,
} from './engine';
import { OcrResult } from './OcrResult';
import { ocrPdf, type OcrProgress } from './ocr';

type Phase = 'idle' | 'working' | 'done' | 'error';

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [range, setRange] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [out, setOut] = useState<{ text: string; unusablePages: number[] } | null>(null);
  const [ready, setReady] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => setReady(true), []);

  const busy = phase === 'working';
  const syntaxError = validatePageRangeSyntax(range);
  let selection: number[] | null = null;
  let boundsError: string | null = null;
  if (pageCount !== null && syntaxError === null) {
    try {
      selection = parsePageSelection(range, pageCount);
    } catch (cause) {
      boundsError = cause instanceof Error ? cause.message : 'That range is outside the document.';
    }
  }
  const limitError = selection ? pageLimitMessage(selection.length) : null;

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
      setError('That file could not be read as a PDF. It may be damaged or password protected.');
      setPhase('error');
    }
  }

  async function run() {
    if (!file || !selection || limitError) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase('working');
    setError(null);
    setOut(null);
    setProgress(null);
    try {
      const result = await ocrPdf(
        file.name,
        new Uint8Array(await file.arrayBuffer()),
        selection,
        setProgress,
        controller.signal,
      );
      if (!result.ok) {
        setError(result.message);
        setPhase('error');
        return;
      }
      setOut({ text: assembleOcrText(result.pages), unusablePages: result.unusablePages });
      setPhase('done');
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') {
        reset();
        return;
      }
      setError(cause instanceof Error ? cause.message : 'The pages could not be read.');
      setPhase('error');
    } finally {
      abortRef.current = null;
    }
  }

  function save() {
    if (!out || !file) return;
    const bytes = new TextEncoder().encode(out.text);
    downloadBlob(bytesToBlob(bytes, 'text/plain;charset=utf-8'), ocrFileName(file.name));
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <FileDrop
        id="ocr-input"
        accept="application/pdf,.pdf"
        label="Choose the scanned PDF"
        hint="It stays on this device. English text only, and the first run loads about 18 MB once."
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
            <label className="field__label" htmlFor="ocr-range">
              Pages (leave empty for all, up to {MAX_PAGES})
            </label>
            <input
              id="ocr-range"
              className="input"
              type="text"
              inputMode="numeric"
              placeholder="for example 1-5, 8"
              value={range}
              disabled={!ready || busy}
              aria-invalid={syntaxError || boundsError || limitError ? 'true' : undefined}
              onChange={(event) => {
                setRange(event.target.value);
                reset();
              }}
            />
            <p className="field__hint">
              {selection
                ? `Reading ${selection.length} of ${pageCount} page${pageCount === 1 ? '' : 's'}.`
                : `This document has ${pageCount} page${pageCount === 1 ? '' : 's'}.`}
            </p>
            {(syntaxError || boundsError || limitError) && (
              <p className="field__error" role="alert">
                {syntaxError ?? boundsError ?? limitError}
              </p>
            )}
          </div>

          <div className="note note--warning">
            <p>
              OCR guesses characters from pixels. Accuracy depends on the scan; handwriting,
              tables and formulas are usually wrong. It does not make the PDF searchable.
            </p>
          </div>

          <p>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!ready || busy || !selection || limitError !== null}
              onClick={() => void run()}
            >
              {busy ? 'Reading the pages…' : 'Read the text (OCR)'}
            </button>
            {busy && (
              <button
                type="button"
                className="btn"
                onClick={() => abortRef.current?.abort()}
              >
                Stop
              </button>
            )}
          </p>
        </div>
      )}

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' && !file && 'No file yet. Choose a PDF to begin.'}
        {phase === 'idle' && file && 'Ready. OCR runs here, not on a server.'}
        {phase === 'working' &&
          (progress
            ? `Page ${progress.page} of ${progress.total} · ${progress.percent}%`
            : 'Loading the OCR engine…')}
        {phase === 'done' && out && `Read ${out.text.length.toLocaleString()} characters.`}
        {phase === 'error' && 'The text was not read. The reason is below.'}
      </p>

      {error && (
        <div className="note note--danger">
          <h2>What happened</h2>
          <p>{error}</p>
        </div>
      )}

      {out && (
        <OcrResult text={out.text} unusablePages={out.unusablePages} onDownload={save} />
      )}
    </div>
  );
}
