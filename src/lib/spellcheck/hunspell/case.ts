// SPDX-License-Identifier: AGPL-3.0-or-later
// Case handling shared by acceptance and suggestion: dictionaries are case-sensitive in places,
// so a rejected word is retried in its lower, capitalised and upper forms.

export function capitalise(word: string): string {
  if (word === '') return word;
  return word.charAt(0).toLocaleUpperCase() + word.slice(1);
}

export function caseVariants(word: string): string[] {
  const variants = [word];
  const lower = word.toLocaleLowerCase();
  if (lower !== word) variants.push(lower);
  const capitalised = capitalise(lower);
  if (capitalised !== word && capitalised !== lower) variants.push(capitalised);
  const upper = word.toLocaleUpperCase();
  if (upper !== word && upper !== lower && upper !== capitalised) variants.push(upper);
  return variants;
}

export function applyCase(original: string, candidate: string): string {
  const upper = original.toLocaleUpperCase();
  if (original === upper && original !== original.toLocaleLowerCase()) {
    return candidate.toLocaleUpperCase();
  }
  if (original.charAt(0) === original.charAt(0).toLocaleUpperCase()) {
    return capitalise(candidate);
  }
  return candidate;
}
