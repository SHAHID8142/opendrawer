// SPDX-License-Identifier: AGPL-3.0-or-later
// Text statistics and English readability scores. Pure functions, no DOM and no network.

export interface TextAnalysis {
  words: number;
  uniqueWords: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  syllables: number;
  wordsPerSentence: number;
  syllablesPerWord: number;
  readingMinutes: number;
  speakingMinutes: number;
  fleschReadingEase: number | null;
  fleschKincaidGrade: number | null;
  level: string;
  topWords: { word: string; count: number }[];
}

const STOP_WORDS = new Set([
  'a', 'about', 'after', 'again', 'all', 'also', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'but', 'by', 'can', 'could', 'did', 'do', 'does',
  'doing', 'for', 'from', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'him', 'his',
  'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'just', 'me', 'more', 'most', 'my', 'no',
  'not', 'of', 'on', 'or', 'our', 'out', 'she', 'should', 'so', 'some', 'than', 'that', 'the',
  'their', 'them', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too',
  'under', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who',
  'why', 'will', 'with', 'would', 'you', 'your',
]);

/**
 * A rough English syllable count. It is a heuristic, not a pronunciation dictionary: silent
 * letters and words like "simple" are sometimes one off, which is why the UI calls the scores
 * estimates.
 */
export function countSyllables(word: string): number {
  const clean = word.toLocaleLowerCase().replace(/[^a-z]/g, '');
  if (clean.length === 0) return 0;
  if (clean.length <= 3) return 1;
  const adjusted = clean.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  const groups = adjusted.match(/[aeiouy]+/g);
  return Math.max(1, groups === null ? 0 : groups.length);
}

function wordsOf(text: string): string[] {
  return text.match(/[\p{L}]+(?:['’][\p{L}]+)*/gu) ?? [];
}

function sentenceCount(text: string): number {
  return text.split(/[.!?]+/).filter((part) => part.trim() !== '').length;
}

function levelFor(score: number): string {
  if (score >= 90) return 'Very easy';
  if (score >= 80) return 'Easy';
  if (score >= 70) return 'Fairly easy';
  if (score >= 60) return 'Plain English';
  if (score >= 50) return 'Fairly hard';
  if (score >= 30) return 'Hard';
  return 'Very hard';
}

function topWords(words: string[]): { word: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const raw of words) {
    const word = raw.toLocaleLowerCase();
    if (word.length < 3 || STOP_WORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, 5);
}

export function analyseText(text: string): TextAnalysis {
  const words = wordsOf(text);
  const wordCount = words.length;
  const sentences = sentenceCount(text);
  const paragraphs = text.split(/\n\s*\n/).filter((part) => part.trim() !== '').length;
  const syllables = words.reduce((total, word) => total + countSyllables(word), 0);
  const wordsPerSentence = sentences === 0 ? 0 : wordCount / sentences;
  const syllablesPerWord = wordCount === 0 ? 0 : syllables / wordCount;
  const fleschReadingEase =
    wordCount === 0 || sentences === 0
      ? null
      : Math.max(0, Math.min(100, 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord));
  const fleschKincaidGrade =
    wordCount === 0 || sentences === 0
      ? null
      : Math.max(0, 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59);

  return {
    words: wordCount,
    uniqueWords: new Set(words.map((word) => word.toLocaleLowerCase())).size,
    characters: text.length,
    charactersNoSpaces: text.replace(/\s/g, '').length,
    sentences,
    paragraphs,
    syllables,
    wordsPerSentence,
    syllablesPerWord,
    readingMinutes: wordCount / 200,
    speakingMinutes: wordCount / 130,
    fleschReadingEase,
    fleschKincaidGrade,
    level: fleschReadingEase === null ? 'No text yet' : levelFor(fleschReadingEase),
    topWords: topWords(words),
  };
}
