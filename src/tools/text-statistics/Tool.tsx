// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for text-statistics: local counts and English readability estimates, updated as you type.
import { useEffect, useRef, useState } from 'react';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { Results } from './Results';
import { analyseText } from './stats';

export default function Tool() {
  const [text, setText] = useState('');
  const [ready, setReady] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => setReady(true), []);
  const analysis = analyseText(text);
  const hasResult = analysis.words > 0;

  async function loadFile(file: File) {
    setText(await file.text());
  }

  function downloadSummary() {
    const lines = [
      'Text statistics',
      '',
      `Words: ${analysis.words}`,
      `Unique words: ${analysis.uniqueWords}`,
      `Sentences: ${analysis.sentences}`,
      `Paragraphs: ${analysis.paragraphs}`,
      `Characters: ${analysis.characters}`,
      `Characters without spaces: ${analysis.charactersNoSpaces}`,
      `Syllables (estimate): ${analysis.syllables}`,
      `Words per sentence: ${analysis.wordsPerSentence.toFixed(1)}`,
      `Syllables per word: ${analysis.syllablesPerWord.toFixed(1)}`,
      `Flesch Reading Ease: ${analysis.fleschReadingEase === null ? '—' : analysis.fleschReadingEase.toFixed(1)}`,
      `Flesch–Kincaid grade: ${analysis.fleschKincaidGrade === null ? '—' : analysis.fleschKincaidGrade.toFixed(1)}`,
      '',
      'Scores are English estimates based on a syllable heuristic, not a grade of the writing.',
    ];
    downloadBlob(bytesToBlob(new TextEncoder().encode(lines.join('\n')), 'text/plain;charset=utf-8'), 'text-statistics.txt');
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <div className="card stack">
        <div className="field">
          <label className="field__label" htmlFor="statistics-text">
            Your text
          </label>
          <textarea
            id="statistics-text"
            className="textarea"
            rows={10}
            value={text}
            disabled={!ready}
            placeholder="Paste or type text. Counts update as you type and nothing leaves this tab."
            onChange={(event) => setText(event.target.value)}
          />
        </div>
        <p className="cluster">
          <button type="button" className="btn btn--secondary" disabled={!ready} onClick={() => fileRef.current?.click()}>
            Open .txt or .md
          </button>
          <button type="button" className="btn btn--secondary" disabled={!ready || text === ''} onClick={() => setText('')}>
            Clear
          </button>
          <button type="button" className="btn btn--secondary" disabled={!hasResult} onClick={downloadSummary}>
            Download summary
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
        {hasResult
          ? `${analysis.words} words, ${analysis.sentences} sentences.`
          : 'No text yet. Paste something to see the counts.'}
      </p>

      {hasResult ? (
        <Results analysis={analysis} />
      ) : (
        <div className="note">
          <h2>What you get</h2>
          <p>
            Word and sentence counts, syllables, reading and speaking time, Flesch Reading Ease and a
            Flesch–Kincaid grade. Scores are estimates for English and never leave this tab.
          </p>
        </div>
      )}
    </div>
  );
}
