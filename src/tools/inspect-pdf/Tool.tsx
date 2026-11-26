// SPDX-License-Identifier: AGPL-3.0-or-later
// Interactive shell for Inspect PDF: file drop, paste handling, status, and report output.
import { useEffect, useRef, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { inspectPdf, type InspectResult } from './inspect';
import { Report } from './Report';

type Phase = 'idle' | 'working' | 'done' | 'error';

export default function Tool() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<InspectResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const workingRef = useRef(false);

  useEffect(() => setReady(true), []);

  async function run(files: File[]) {
    const file = files[0];
    if (!file || workingRef.current) return;
    workingRef.current = true;
    setPhase('working');
    setError(null);
    setResult(null);
    try {
      setResult(await inspectPdf(file));
      setPhase('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The file could not be read.');
      setPhase('error');
    } finally {
      workingRef.current = false;
    }
  }

  function clear() {
    setPhase('idle');
    setResult(null);
    setError(null);
  }

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      if (workingRef.current) return;
      const files = Array.from(event.clipboardData?.files ?? []);
      if (files.length > 0) void run(files);
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  const selectedFile = result
    ? {
        name: result.fileName,
        size: result.fileBytes,
        detail: `${result.pageCount} ${result.pageCount === 1 ? 'page' : 'pages'}`,
      }
    : null;

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <FileDrop
        id="inspect-file"
        accept="application/pdf,.pdf"
        label="Choose the PDF you want to inspect"
        hint="It stays on this device. Nothing is uploaded, and nothing is stored after you close the tab."
        buttonLabel="Choose a PDF"
        disabled={!ready || phase === 'working'}
        working={phase === 'working'}
        pasteEnabled
        selectedFile={selectedFile}
        onClear={clear}
        onFiles={run}
      />

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' &&
          (ready ? 'No file yet. The report appears here.' : 'Preparing the tool…')}
        {phase === 'working' && 'Reading the file structure…'}
        {phase === 'error' && 'The file could not be read. The reason is below.'}
        {phase === 'done' && result && `Report ready for ${result.fileName}.`}
      </p>

      {phase === 'error' && error && (
        <div className="note note--danger" role="alert">
          <h2 className="note__title">What happened</h2>
          <p>{error}</p>
        </div>
      )}

      {result && <Report result={result} />}
    </div>
  );
}
