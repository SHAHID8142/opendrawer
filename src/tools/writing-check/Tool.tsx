// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for writing-check: local dictionary + rule checks, with one-click fixes.
import { useEffect, useRef, useState } from 'react';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { LANGUAGE_PACKS } from '../../lib/spellcheck/packs/registry';
import { analyzeWriting, type Analysis, type TextFetcher } from './analysis';
import { IssuesList } from './IssuesList';
import { writingStats, type RuleIssue } from './rules';

type Phase = 'idle' | 'working' | 'done' | 'error';

const fetcher: TextFetcher = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('dictionary fetch failed');
  return response.text();
};

export default function Tool() {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('en-US');
  const [phase, setPhase] = useState<Phase>('idle');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => setReady(true), []);
  const busy = phase === 'working';
  const score = analysis ? Math.max(0, 100 - analysis.issues.filter((i) => i.severity !== 'info').length * 4) : null;

  async function check(value = text) {
    setPhase('working');
    setError(null);
    setNotice('');
    try {
      const result = await analyzeWriting(value, language, fetcher);
      if (!result.ok) {
        setError(result.message);
        setPhase('error');
        return;
      }
      setAnalysis(result.analysis);
      setPhase('done');
    } catch {
      setError('The text could not be checked.');
      setPhase('error');
    }
  }

  async function apply(issue: RuleIssue, replacement: string) {
    const next = text.slice(0, issue.from) + replacement + text.slice(issue.to);
    setText(next);
    await check(next);
  }

  async function fixSpelling() {
    if (!analysis) return;
    const spelling = analysis.issues.filter((issue) => issue.category === 'spelling');
    let next = text;
    for (const issue of spelling.slice().sort((a, b) => b.from - a.from)) {
      const replacement = issue.replacements[0];
      if (replacement === undefined) continue;
      next = next.slice(0, issue.from) + replacement + next.slice(issue.to);
    }
    setText(next);
    setNotice(`Applied ${spelling.length} spelling fix${spelling.length === 1 ? '' : 'es'}.`);
    await check(next);
  }

  async function loadFile(file: File) {
    const content = await file.text();
    setText(content);
    setAnalysis(null);
    setPhase('idle');
    setError(null);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setNotice('Copied to the clipboard.');
    } catch {
      setNotice('Your browser blocked the clipboard; select the text and copy it.');
    }
  }

  const live = writingStats(text);

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <div className="card">
        <div className="field">
          <label className="field__label" htmlFor="writing-text">
            Your text
          </label>
          <textarea
            id="writing-text"
            className="textarea"
            rows={10}
            value={text}
            disabled={!ready || busy}
            placeholder="Paste or type text here. Nothing is uploaded and no model is involved."
            onChange={(event) => {
              setText(event.target.value);
              setAnalysis(null);
              setPhase('idle');
              setNotice('');
            }}
          />
          <p className="field__hint">
            {live.words} words · {live.characters} characters · about {live.readingMinutes} min to read
          </p>
        </div>

        <div className="form__row">
          <div className="field">
            <label className="field__label" htmlFor="writing-language">
              Language
            </label>
            <select
              id="writing-language"
              className="select"
              value={language}
              disabled={!ready || busy}
              onChange={(event) => {
                setLanguage(event.target.value);
                setAnalysis(null);
                setPhase('idle');
              }}
            >
              {LANGUAGE_PACKS.map((pack) => (
                <option key={pack.id} value={pack.id}>
                  {pack.label}
                </option>
              ))}
            </select>
            <p className="field__hint">The dictionary loads from this site when you first check.</p>
          </div>
          <div className="field">
            <span className="field__label">Text file</span>
            <div className="drop-bar__actions">
              <button type="button" className="btn btn--secondary" disabled={!ready || busy} onClick={() => fileRef.current?.click()}>
                Open a .txt or .md
              </button>
              <button type="button" className="btn btn--secondary" disabled={!ready || busy || text === ''} onClick={() => { setText(''); setAnalysis(null); setPhase('idle'); }}>
                Clear
              </button>
            </div>
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
          </div>
        </div>

        <p>
          <button type="button" className="btn btn--primary" disabled={!ready || busy || text.trim() === ''} onClick={() => void check()}>
            {busy ? 'Checking…' : 'Check the text'}
          </button>
          {analysis && analysis.issues.some((issue) => issue.category === 'spelling') && (
            <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => void fixSpelling()}>
              Fix all spelling
            </button>
          )}
        </p>
      </div>

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' && !text && 'No text yet. Paste something to check.'}
        {phase === 'idle' && text && 'Ready to check.'}
        {phase === 'working' && 'Loading the dictionary and reading the text…'}
        {phase === 'done' && analysis && `Found ${analysis.issues.length} issue${analysis.issues.length === 1 ? '' : 's'}.`}
        {phase === 'error' && 'The text was not checked. The reason is below.'}
      </p>

      {notice && <p className="field__hint">{notice}</p>}
      {error && <div className="note note--danger"><h2>What happened</h2><p>{error}</p></div>}

      {analysis && (
        <section className="card stack" aria-labelledby="writing-result-heading">
          <h2 id="writing-result-heading">Review</h2>
          <p className="result-summary">
            <span>{analysis.issues.length} issues</span>
            <span>{score}/100 rough score</span>
            <span>{analysis.stats.words} words</span>
          </p>
          <p className="muted">
            A rule-based check, not a language model. A rough score is issue count, not a grade.
          </p>
          {analysis.issues.length === 0 ? (
            <p>No issues found by these rules. That is not a guarantee of perfect writing.</p>
          ) : (
            <IssuesList issues={analysis.issues} onApply={(issue, replacement) => void apply(issue, replacement)} />
          )}
          <p>
            <button type="button" className="btn btn--secondary" onClick={() => void copy()}>Copy the text</button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => downloadBlob(bytesToBlob(new TextEncoder().encode(text), 'text/plain;charset=utf-8'), 'checked-text.txt')}
            >
              Download as .txt
            </button>
          </p>
        </section>
      )}
    </div>
  );
}
