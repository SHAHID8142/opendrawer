// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for merge-pdf: ordered file list, page copy in that order, one download.
import { useEffect, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import { MAX_FILES, mergePdfs } from './engine';

interface Selected {
  id: string;
  file: File;
}

type Phase = 'idle' | 'working' | 'done' | 'error';

export default function Tool() {
  const [files, setFiles] = useState<Selected[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ bytes: Uint8Array; pageCount: number } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  const busy = phase === 'working';
  const usable = ready && !busy;

  function addFiles(incoming: File[]) {
    const refused: string[] = [];
    const accepted: Selected[] = [];
    for (const file of incoming) {
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      if (!isPdf) {
        refused.push(`"${file.name}" is not a PDF file.`);
      } else {
        accepted.push({ id: `${file.name}-${file.lastModified}-${Math.random()}`, file });
      }
    }
    setFiles((current) => {
      const room = Math.max(MAX_FILES - current.length, 0);
      if (accepted.length > room) {
        refused.push(`Only ${MAX_FILES} files fit in one merge; the rest were not added.`);
      }
      return [...current, ...accepted.slice(0, room)];
    });
    setError(refused.length > 0 ? refused.join(' ') : null);
    setResult(null);
    setPhase('idle');
  }

  function move(index: number, direction: -1 | 1) {
    setFiles((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const item = next[index];
      const swap = next[target];
      if (!item || !swap) return current;
      next[index] = swap;
      next[target] = item;
      return next;
    });
    setResult(null);
    setPhase('idle');
  }

  function removeFile(id: string) {
    setFiles((current) => current.filter((item) => item.id !== id));
    setResult(null);
    setPhase('idle');
  }

  async function merge() {
    setPhase('working');
    setError(null);
    setResult(null);
    try {
      const inputs = [];
      for (const item of files) {
        inputs.push({ name: item.file.name, bytes: new Uint8Array(await item.file.arrayBuffer()) });
      }
      const merged = await mergePdfs(inputs);
      if (!merged.ok) {
        setError(merged.message);
        setPhase('error');
        return;
      }
      setResult({ bytes: merged.bytes, pageCount: merged.pageCount });
      setPhase('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The files could not be merged.');
      setPhase('error');
    }
  }

  function save() {
    if (!result) return;
    const base = files[0]?.file.name.replace(/\.pdf$/i, '') ?? 'document';
    downloadBlob(bytesToBlob(result.bytes, 'application/pdf'), `${base}-merged.pdf`);
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <FileDrop
        id="merge-input"
        accept="application/pdf,.pdf"
        label={files.length === 0 ? 'Choose the PDFs to merge' : 'Add more PDFs'}
        hint="Two or more files. They stay on this device and are joined here."
        buttonLabel={files.length === 0 ? 'Choose PDFs' : 'Add PDFs'}
        multiple
        disabled={!usable}
        onFiles={addFiles}
      />

      {files.length > 0 && (
        <section className="card" aria-labelledby="merge-list-heading">
          <h2 id="merge-list-heading">Merge order</h2>
          <ul className="file-list">
            {files.map((item, index) => (
              <li key={item.id}>
                <span>
                  {index + 1}. {item.file.name}
                </span>
                <span className="muted">{formatBytes(item.file.size)}</span>
                <span className="cluster">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    aria-label={`Move ${item.file.name} up`}
                    disabled={busy || index === 0}
                    onClick={() => move(index, -1)}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    aria-label={`Move ${item.file.name} down`}
                    disabled={busy || index === files.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    aria-label={`Remove ${item.file.name}`}
                    disabled={busy}
                    onClick={() => removeFile(item.id)}
                  >
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <p className="muted">
            Pages are copied in this order. {files.length} of {MAX_FILES} files.
          </p>
        </section>
      )}

      <p>
        <button
          type="button"
          className="btn btn--primary"
          disabled={!usable || files.length < 2}
          onClick={() => void merge()}
        >
          {busy ? 'Merging…' : 'Merge the PDFs'}
        </button>
      </p>

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' && files.length < 2 && 'Choose at least two PDFs.'}
        {phase === 'idle' && files.length >= 2 && `${files.length} PDFs ready in this order.`}
        {phase === 'working' && 'Merging the pages…'}
        {phase === 'error' && 'The PDFs were not merged. The reason is below.'}
        {phase === 'done' && result && `Merged ${files.length} PDFs into ${result.pageCount} pages.`}
      </p>

      {error && (
        <div className="note note--danger">
          <h2>What happened</h2>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <section className="card" aria-labelledby="merge-result-heading">
          <h2 id="merge-result-heading">Your merged PDF</h2>
          <p className="result-summary">
            <span>
              {result.pageCount} page{result.pageCount === 1 ? '' : 's'}
            </span>
            <span>{formatBytes(result.bytes.length)}</span>
          </p>
          <p>
            <button type="button" className="btn btn--primary" onClick={save}>
              Download the merged PDF
            </button>
          </p>
          <p className="muted">Built in this tab. Nothing is stored after you close it.</p>
        </section>
      )}
    </div>
  );
}
