// SPDX-License-Identifier: AGPL-3.0-or-later
// Readability score and the numeric breakdown, kept presentational.
import type { TextAnalysis } from './stats';

interface Props {
  analysis: TextAnalysis;
}

function time(minutes: number): string {
  if (minutes === 0) return '0 min';
  if (minutes < 1) return 'under 1 min';
  return `${Math.round(minutes)} min`;
}

function ratio(value: number): string {
  return value === 0 ? '—' : value.toFixed(1);
}

export function Results({ analysis }: Props) {
  const score = analysis.fleschReadingEase === null ? '—' : String(Math.round(analysis.fleschReadingEase));
  const grade = analysis.fleschKincaidGrade === null ? '—' : analysis.fleschKincaidGrade.toFixed(1);
  return (
    <section className="card stack" aria-labelledby="readability-heading">
      <h2 id="readability-heading">Readability</h2>
      <div className="readability-hero">
        <p className="readability-score" id="readability-score">
          {score}
          <span className="readability-scale">/100</span>
        </p>
        <div>
          <p className="readability-level" id="readability-level">{analysis.level}</p>
          <p className="muted">
            Flesch Reading Ease · Flesch–Kincaid grade {grade}. Both are English estimates.
          </p>
        </div>
      </div>

      <dl className="stat-grid">
        <div><dt>Words</dt><dd id="stat-words">{analysis.words}</dd></div>
        <div><dt>Unique words</dt><dd>{analysis.uniqueWords}</dd></div>
        <div><dt>Sentences</dt><dd id="stat-sentences">{analysis.sentences}</dd></div>
        <div><dt>Paragraphs</dt><dd>{analysis.paragraphs}</dd></div>
        <div><dt>Characters</dt><dd>{analysis.characters}</dd></div>
        <div><dt>Without spaces</dt><dd>{analysis.charactersNoSpaces}</dd></div>
        <div><dt>Syllables</dt><dd>{analysis.syllables}</dd></div>
        <div><dt>Words per sentence</dt><dd>{ratio(analysis.wordsPerSentence)}</dd></div>
        <div><dt>Syllables per word</dt><dd>{ratio(analysis.syllablesPerWord)}</dd></div>
        <div><dt>Reading time</dt><dd>{time(analysis.readingMinutes)}</dd></div>
        <div><dt>Speaking time</dt><dd>{time(analysis.speakingMinutes)}</dd></div>
      </dl>

      {analysis.topWords.length > 0 && (
        <div>
          <h3>Most used words</h3>
          <p className="allow-list">
            {analysis.topWords.map((entry) => (
              <span key={entry.word} className="allow-chip">
                {entry.word} · {entry.count}
              </span>
            ))}
          </p>
        </div>
      )}
    </section>
  );
}
