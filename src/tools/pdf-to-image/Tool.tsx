// SPDX-License-Identifier: AGPL-3.0-or-later
// Interactive shell for PDF to image: drop/paste, settings, cancellation, progress, and output.
import { useEffect, useRef, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { zipStore } from '../../lib/zip';
import { RenderSettings } from './RenderSettings';
import { ResultView } from './ResultView';
import {
  renderPdfToImages,
  validatePageRangeSyntax,
  type ImageFormat,
  type RenderOptions,
  type RenderSummary,
} from './render';

type Phase = 'idle' | 'working' | 'done' | 'error';

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<ImageFormat>('png');
  const [dpi, setDpi] = useState(150);
  const [range, setRange] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [cancelled, setCancelled] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [liveStatus, setLiveStatus] = useState('');
  const [result, setResult] = useState<RenderSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const lastMilestoneRef = useRef(-1);
  const optionsRef = useRef<RenderOptions>({ format, dpi, range });
  optionsRef.current = { format, dpi, range };

  useEffect(() => {
    setReady(true);
    return () => abortRef.current?.abort();
  }, []);

  const busy = phase === 'working';
  const usable = ready && !busy;
  const rangeError = validatePageRangeSyntax(range);

  async function run(chosen: File, opts: RenderOptions = optionsRef.current) {
    const syntaxError = validatePageRangeSyntax(opts.range);
    setFile(chosen);
    setCancelled(false);
    if (syntaxError) {
      setResult(null);
      setError(syntaxError);
      setPhase('error');
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    lastMilestoneRef.current = -1;

    setPhase('working');
    setError(null);
    setResult(null);
    setProgress({ done: 0, total: 0 });
    setLiveStatus('Opening the document…');

    try {
      const rendered = await renderPdfToImages(
        chosen,
        opts,
        (done, total) => {
          setProgress({ done, total });
          if (total <= 0) return;
          if (done === 0) {
            setLiveStatus(`Rendering ${total} page${total === 1 ? '' : 's'}…`);
            lastMilestoneRef.current = 0;
            return;
          }
          const milestone = Math.floor((done / total) * 4);
          if (milestone > lastMilestoneRef.current && done < total) {
            lastMilestoneRef.current = milestone;
            setLiveStatus(`Rendered ${done} of ${total} pages.`);
          }
        },
        controller.signal,
      );
      setResult(rendered);
      setPhase('done');
    } catch (cause) {
      if (controller.signal.aborted || (cause instanceof DOMException && cause.name === 'AbortError')) {
        setPhase('idle');
        setCancelled(true);
        return;
      }
      setError(cause instanceof Error ? cause.message : 'The pages could not be rendered.');
      setPhase('error');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      if (abortRef.current) return;
      const files = Array.from(event.clipboardData?.files ?? []);
      if (files[0]) void run(files[0]);
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  function clear() {
    abortRef.current?.abort();
    setFile(null);
    setResult(null);
    setError(null);
    setCancelled(false);
    setProgress({ done: 0, total: 0 });
    setLiveStatus('');
    setPhase('idle');
  }

  function save() {
    if (!result) return;
    if (result.files.length === 1 && result.files[0]) {
      const only = result.files[0];
      const mime = result.format === 'png' ? 'image/png' : 'image/jpeg';
      downloadBlob(bytesToBlob(only.bytes, mime), only.name);
      return;
    }
    downloadBlob(zipStore(result.files), `${result.baseName}-images.zip`);
  }

  const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const idleText = ready ? (cancelled ? 'Rendering cancelled.' : 'No file yet. Choose a PDF to begin.') : 'Preparing the tool…';

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <FileDrop
        id="render-file"
        accept="application/pdf,.pdf"
        label="Choose the PDF whose pages you want as images"
        hint="It stays on this device. The pages are drawn here, not on a server."
        buttonLabel="Choose a PDF"
        disabled={!usable}
        working={busy}
        pasteEnabled
        selectedFile={file ? { name: file.name, size: file.size } : null}
        onClear={clear}
        onFiles={(files) => files[0] && void run(files[0])}
      />

      <RenderSettings
        format={format}
        dpi={dpi}
        range={range}
        rangeError={rangeError}
        disabled={!usable}
        hasFile={Boolean(file)}
        busy={busy}
        onFormatChange={setFormat}
        onDpiChange={setDpi}
        onRangeChange={setRange}
        onRerender={() => file && void run(file)}
        onClear={clear}
      />

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' && idleText}
        {phase === 'working' && liveStatus}
        {phase === 'error' && 'The pages could not be rendered. The reason is below.'}
        {phase === 'done' && result && `${result.pageCount} page${result.pageCount === 1 ? '' : 's'} rendered.`}
      </p>

      {busy && (
        <div className="card stack">
          <label className="field__label" htmlFor="render-progress">
            {progress.total > 0 ? `Page ${progress.done} of ${progress.total} · ${percent}%` : 'Opening the document…'}
          </label>
          {progress.total === 0 ? (
            <progress id="render-progress" className="progress" />
          ) : (
            <progress id="render-progress" className="progress" value={progress.done} max={progress.total} />
          )}
          <div>
            <button type="button" className="btn btn--secondary" onClick={() => abortRef.current?.abort()}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {phase === 'error' && error && (
        <div className="note note--danger" role="alert">
          <h2 className="note__title">What happened</h2>
          <p>{error}</p>
        </div>
      )}

      {result && <ResultView result={result} onDownload={save} />}
    </div>
  );
}
