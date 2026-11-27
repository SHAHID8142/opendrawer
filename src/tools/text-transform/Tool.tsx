// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for text-transform: local case, line and find/replace edits with one-step undo.
import { useEffect, useRef, useState } from 'react';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { ActionGrid } from './Actions';
import {
  replaceLiteral,
  textStats,
  transformText,
  type TransformAction,
} from './transform';

export default function Tool() {
  const [text, setText] = useState('');
  const [previous, setPrevious] = useState<string | null>(null);
  const [find, setFind] = useState('');
  const [replacement, setReplacement] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => setReady(true), []);
  const stats = textStats(text);

  function applyAction(action: TransformAction) {
    setPrevious(text);
    setText(transformText(text, action));
    setNotice('');
  }

  function undo() {
    if (previous === null) return;
    setText(previous);
    setPrevious(null);
  }

  function replaceAll() {
    const result = replaceLiteral(text, find, replacement, matchCase);
    if (result.count === 0) {
      setNotice('No matches found.');
      return;
    }
    setPrevious(text);
    setText(result.text);
    setNotice(`Replaced ${result.count} occurrence${result.count === 1 ? '' : 's'}.`);
  }

  async function loadFile(file: File) {
    setPrevious(text);
    setText(await file.text());
    setNotice('');
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setNotice('Copied to the clipboard.');
    } catch {
      setNotice('Your browser blocked the clipboard; select the text and copy it.');
    }
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <div className="card stack">
        <div className="field">
          <label className="field__label" htmlFor="transform-text">
            Your text
          </label>
          <textarea
            id="transform-text"
            className="textarea"
            rows={12}
            value={text}
            disabled={!ready}
            placeholder="Paste text, or open a .txt/.md file. Nothing leaves this tab."
            onChange={(event) => {
              setPrevious(null);
              setText(event.target.value);
              setNotice('');
            }}
          />
          <p className="field__hint">
            {stats.words} words · {stats.characters} characters · {stats.lines} lines
          </p>
        </div>

        <ActionGrid disabled={!ready || text === ''} onAction={applyAction} />

        <div className="form__row">
          <div className="field">
            <label className="field__label" htmlFor="transform-find">
              Find
            </label>
            <input
              id="transform-find"
              className="input"
              value={find}
              disabled={!ready}
              onChange={(event) => setFind(event.target.value)}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="transform-replace">
              Replace with
            </label>
            <input
              id="transform-replace"
              className="input"
              value={replacement}
              disabled={!ready}
              onChange={(event) => setReplacement(event.target.value)}
            />
          </div>
        </div>
        <p className="cluster">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={matchCase}
              disabled={!ready}
              onChange={(event) => setMatchCase(event.target.checked)}
            />
            Match case
          </label>
          <button
            type="button"
            className="btn btn--secondary"
            disabled={!ready || find === ''}
            onClick={replaceAll}
          >
            Replace all
          </button>
        </p>

        <p className="cluster">
          <button type="button" className="btn btn--secondary" disabled={!ready} onClick={() => fileRef.current?.click()}>
            Open .txt or .md
          </button>
          <button type="button" className="btn btn--secondary" disabled={!ready || text === ''} onClick={undo}>
            Undo last change
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            disabled={!ready || text === ''}
            onClick={() => {
              setPrevious(text);
              setText('');
              setNotice('');
            }}
          >
            Clear
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            hidden
            onChange={(event) => {
              const chosen = event.target.files?.[0];
              if (chosen) void loadFile(chosen);
            }}
          />
        </p>
      </div>

      <p className="status" role="status" aria-live="polite">
        {text === '' ? 'No text yet. Paste something or open a file.' : notice || 'Edits apply only to the text above.'}
      </p>

      {text !== '' && (
        <p className="cluster">
          <button type="button" className="btn btn--secondary" onClick={() => void copy()}>
            Copy the text
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() =>
              downloadBlob(bytesToBlob(new TextEncoder().encode(text), 'text/plain;charset=utf-8'), 'transformed.txt')
            }
          >
            Download as .txt
          </button>
        </p>
      )}
    </div>
  );
}
