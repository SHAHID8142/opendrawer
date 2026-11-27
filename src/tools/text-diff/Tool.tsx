// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for text-diff: two local drafts, a bounded line diff and a unified-diff download.
import { useEffect, useRef, useState } from 'react';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { DiffView } from './DiffView';
import { diffLines, toUnified, type DiffSummary } from './diff';

type Result = { ok: true; diff: DiffSummary } | { ok: false; message: string } | null;

export default function Tool() {
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [ignoreTrailingWhitespace, setIgnoreTrailingWhitespace] = useState(true);
  const [result, setResult] = useState<Result>(null);
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState(false);
  const leftFile = useRef<HTMLInputElement | null>(null);
  const rightFile = useRef<HTMLInputElement | null>(null);

  useEffect(() => setReady(true), []);
  const canCompare = left.trim() !== '' || right.trim() !== '';

  function compare() {
    setNotice('');
    setResult(diffLines(left, right, { ignoreCase, ignoreTrailingWhitespace }));
  }

  function swap() {
    setLeft(right);
    setRight(left);
    setResult(null);
    setNotice('Sides swapped.');
  }

  async function loadFile(file: File, side: 'left' | 'right') {
    const content = await file.text();
    if (side === 'left') setLeft(content);
    else setRight(content);
    setResult(null);
    setNotice('');
  }

  function downloadDiff() {
    if (result === null || !result.ok) return;
    downloadBlob(
      bytesToBlob(new TextEncoder().encode(toUnified(result.diff)), 'text/plain;charset=utf-8'),
      'changes.diff',
    );
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <div className="card stack">
        <div className="diff-inputs">
          <div className="field">
            <label className="field__label" htmlFor="diff-left">
              Original
            </label>
            <textarea
              id="diff-left"
              className="textarea textarea--mono"
              rows={10}
              value={left}
              disabled={!ready}
              placeholder="Paste the older version."
              onChange={(event) => {
                setLeft(event.target.value);
                setResult(null);
              }}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="diff-right">
              Changed
            </label>
            <textarea
              id="diff-right"
              className="textarea textarea--mono"
              rows={10}
              value={right}
              disabled={!ready}
              placeholder="Paste the newer version."
              onChange={(event) => {
                setRight(event.target.value);
                setResult(null);
              }}
            />
          </div>
        </div>

        <p className="cluster">
          <button
            type="button"
            className="btn btn--secondary"
            disabled={!ready}
            onClick={() => leftFile.current?.click()}
          >
            Open original file
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            disabled={!ready}
            onClick={() => rightFile.current?.click()}
          >
            Open changed file
          </button>
          <button type="button" className="btn btn--secondary" disabled={!ready || (!left && !right)} onClick={swap}>
            Swap sides
          </button>
          <input
            ref={leftFile}
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            hidden
            onChange={(event) => {
              const chosen = event.target.files?.[0];
              if (chosen) void loadFile(chosen, 'left');
            }}
          />
          <input
            ref={rightFile}
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            hidden
            onChange={(event) => {
              const chosen = event.target.files?.[0];
              if (chosen) void loadFile(chosen, 'right');
            }}
          />
        </p>

        <p className="cluster">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={ignoreCase}
              disabled={!ready}
              onChange={(event) => {
                setIgnoreCase(event.target.checked);
                setResult(null);
              }}
            />
            Ignore case
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={ignoreTrailingWhitespace}
              disabled={!ready}
              onChange={(event) => {
                setIgnoreTrailingWhitespace(event.target.checked);
                setResult(null);
              }}
            />
            Ignore trailing spaces
          </label>
          <button type="button" className="btn btn--primary" disabled={!ready || !canCompare} onClick={compare}>
            Compare texts
          </button>
        </p>
      </div>

      <p className="status" role="status" aria-live="polite">
        {result === null && (canCompare ? 'Ready to compare.' : 'Paste text on one or both sides.')}
        {result !== null && result.ok && `${result.diff.added} added, ${result.diff.removed} removed, ${result.diff.unchanged} unchanged.`}
        {result !== null && !result.ok && 'The texts were not compared. The reason is below.'}
        {notice && ` ${notice}`}
      </p>

      {result !== null && !result.ok && (
        <div className="note note--danger">
          <h2>What happened</h2>
          <p>{result.message}</p>
        </div>
      )}

      {result !== null && result.ok && (
        <section className="card stack" aria-labelledby="diff-heading">
          <h2 id="diff-heading">Difference</h2>
          <p className="muted">Line-level comparison. Changed lines appear as one removed and one added line.</p>
          {result.diff.added === 0 && result.diff.removed === 0 ? (
            <p>No differences with these options.</p>
          ) : (
            <DiffView lines={result.diff.lines} />
          )}
          <p>
            <button type="button" className="btn btn--secondary" disabled={result.diff.added + result.diff.removed === 0} onClick={downloadDiff}>
              Download .diff
            </button>
          </p>
        </section>
      )}
    </div>
  );
}
