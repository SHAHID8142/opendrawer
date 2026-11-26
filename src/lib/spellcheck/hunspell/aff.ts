// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Hunspell `.aff` parser.
 *
 * Only the directives the checker actually implements are modelled; every other directive is
 * read and ignored rather than rejected, so an unfamiliar but valid affix file still works.
 * Flags are interned into single private-use code units: a dictionary with 50k words and three
 * flags each would otherwise allocate 50k arrays per language, which is the difference between a
 * worker that starts in 200 ms and one that starts in two seconds on a phone.
 */

import type { AffixFile, AffixRule } from '../types.ts';

/** Interns flag strings so each flag costs one UTF-16 code unit in a word entry. */
export class FlagCodec {
  private readonly codes = new Map<string, string>();
  private privateUse = 0xe000;
  private static readonly PRIVATE_USE_LIMIT = 0xf8ff;

  encodeFlag(flag: string): string {
    const existing = this.codes.get(flag);
    if (existing !== undefined) return existing;
    if (this.privateUse > FlagCodec.PRIVATE_USE_LIMIT) {
      // Out of private-use space; a sequence that cannot occur in real text is the fallback.
      return `\u0001${flag}`;
    }
    const code = String.fromCharCode(this.privateUse);
    this.privateUse += 1;
    this.codes.set(flag, code);
    return code;
  }

  has(code: string, flag: string): boolean {
    const encoded = this.codes.get(flag);
    return encoded !== undefined && code.includes(encoded);
  }

  /** Split a raw flag field into individual flag tokens for the given flag type. */
  split(raw: string, type: AffixFile['flagType']): string[] {
    if (raw === '') return [];
    if (type === 'long') {
      const parts: string[] = [];
      for (let index = 0; index + 1 < raw.length; index += 2) parts.push(raw.slice(index, index + 2));
      return parts;
    }
    if (type === 'num') {
      return raw
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part !== '');
    }
    return [...raw];
  }

  encode(raw: string, type: AffixFile['flagType']): string {
    return this.split(raw, type)
      .map((flag) => this.encodeFlag(flag))
      .join('');
  }
}

export interface ParsedAffix {
  file: AffixFile;
  codec: FlagCodec;
  /** `AF` flag-alias table: a dictionary may refer to aliases by number. */
  flagAliases: string[];
}

export function emptyAffixFile(): AffixFile {
  return {
    set: 'UTF-8',
    tryChars: '',
    flagType: 'single',
    prefixes: [],
    suffixes: [],
    replacements: [],
    maps: [],
    iconv: [],
    oconv: [],
    ignore: '',
    wordChars: '',
    compoundMin: 3,
    compoundRules: [],
    onlyInCompound: '',
    needAffix: '',
    forbiddenWord: '',
    noSuggest: '',
    keepCase: '',
    circumfix: '',
  };
}

export function parseAffix(source: string): ParsedAffix {
  const codec = new FlagCodec();
  const file = emptyAffixFile();
  const flagAliases: string[] = [];

  let block: { type: 'prefix' | 'suffix'; flag: string; crossProduct: boolean } | null = null;
  let aliasCount = 0;

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const fields = line.split(/\s+/u);
    const directive = (fields[0] ?? '').toUpperCase();

    switch (directive) {
      case 'SET':
        file.set = fields[1] ?? 'UTF-8';
        continue;
      case 'FLAG': {
        const value = (fields[1] ?? '').toUpperCase();
        file.flagType = value === 'LONG' ? 'long' : value === 'NUM' ? 'num' : 'single';
        continue;
      }
      case 'TRY':
        file.tryChars = fields.slice(1).join('');
        continue;
      case 'IGNORE':
        file.ignore = fields.slice(1).join('');
        continue;
      case 'WORDCHARS':
        file.wordChars = fields.slice(1).join('');
        continue;
      case 'COMPOUNDMIN':
        file.compoundMin = Number(fields[1] ?? 3) || 3;
        continue;
      case 'COMPOUNDRULE': {
        const pattern = fields.slice(1).join(' ');
        if (pattern !== '' && !/^\d+$/.test(pattern)) file.compoundRules.push(pattern);
        continue;
      }
      case 'AF': {
        if (fields.length === 2 && /^\d+$/.test(fields[1] ?? '')) {
          aliasCount = Number(fields[1]);
          continue;
        }
        if (aliasCount > 0) flagAliases.push((fields[1] ?? '').trim());
        continue;
      }
      case 'ONLYINCOMPOUND':
        file.onlyInCompound = codec.encode(fields[1] ?? '', file.flagType);
        continue;
      case 'NEEDAFFIX':
        file.needAffix = codec.encode(fields[1] ?? '', file.flagType);
        continue;
      case 'FORBIDDENWORD':
        file.forbiddenWord = codec.encode(fields[1] ?? '', file.flagType);
        continue;
      case 'NOSUGGEST':
        file.noSuggest = codec.encode(fields[1] ?? '', file.flagType);
        continue;
      case 'KEEPCASE':
        file.keepCase = codec.encode(fields[1] ?? '', file.flagType);
        continue;
      case 'CIRCUMFIX':
        file.circumfix = codec.encode(fields[1] ?? '', file.flagType);
        continue;
      case 'ICONV':
      case 'OCONV': {
        const target = directive === 'ICONV' ? file.iconv : file.oconv;
        if (fields.length < 3) continue;
        const from = fields[1] ?? '';
        const to = fields[2] ?? '';
        if (from !== '') target.push({ from, to });
        continue;
      }
      case 'REP': {
        if (fields.length < 3) continue;
        const from = fields[1] ?? '';
        const to = fields[2] ?? '';
        if (from !== '') file.replacements.push({ from, to });
        continue;
      }
      case 'MAP': {
        if (fields.length < 2) continue;
        if (/^\d+$/.test(fields[1] ?? '')) continue;
        const group = [...(fields[1] ?? '').replace(/[()]/g, '')];
        if (group.length > 1) file.maps.push(group);
        continue;
      }
      case 'PFX':
      case 'SFX': {
        const type = directive === 'PFX' ? 'prefix' : 'suffix';
        const flagField = fields[1] ?? '';
        const looksLikeHeader = fields.length <= 4 && /^\d+$/.test(fields[3] ?? '');
        if (looksLikeHeader) {
          block = { type, flag: flagField, crossProduct: (fields[2] ?? 'N').toUpperCase() === 'Y' };
          continue;
        }
        // Entry: PFX|SFX flag strip affix condition [continuation]
        if (fields.length < 5) continue;
        const strip = normaliseZero(fields[2] ?? '');
        const affix = normaliseZero(fields[3] ?? '');
        const condition = normaliseCondition(fields[4] ?? '.');
        const continuation =
          fields.length > 5 ? codec.encode(fields.slice(5).join(''), file.flagType) : '';
        const flag = codec.encode(flagField, file.flagType);
        if (flag === '') continue;
        const rule: AffixRule = {
          flag,
          // Cross-product lives on the header; entry lines do not repeat it.
          crossProduct: block?.crossProduct ?? false,
          strip,
          affix,
          condition,
          continuation,
        };
        if (type === 'prefix') file.prefixes.push(rule);
        else file.suffixes.push(rule);
        continue;
      }
      default:
        continue;
    }
  }

  return { file, codec, flagAliases };
}

function normaliseZero(value: string): string {
  return value === '0' ? '' : value;
}

/**
 * Turn a Hunspell condition into a regular-expression source.
 *
 * Conditions are per-character patterns: `.` matches any character, `[abc]` and `[^abc]` are
 * sets, and everything else is a literal. The result is anchored by the engine (`^` for a
 * prefix, `$` for a suffix), never used on its own.
 */
function normaliseCondition(condition: string): string {
  if (condition === '' || condition === '0' || condition === '.') return '';
  let result = '';
  let inSet = false;
  for (const char of condition) {
    if (inSet) {
      if (char === ']') {
        result += ']';
        inSet = false;
      } else if (char === '^' && result.endsWith('[')) {
        result += '^';
      } else {
        result += escapeRegex(char);
      }
      continue;
    }
    if (char === '[') {
      result += '[';
      inSet = true;
      continue;
    }
    if (char === '.') {
      result += '[^\\n]';
      continue;
    }
    if (char === ']') continue;
    result += escapeRegex(char);
  }
  if (inSet) result += ']';
  return result;
}

function escapeRegex(char: string): string {
  return /[\\^$.*+?()[\]{}|/]/.test(char) ? `\\${char}` : char;
}

/** Compile a rule's condition once, at load time. */
export function compileCondition(rule: AffixRule, type: 'prefix' | 'suffix'): RegExp | null {
  if (rule.condition === '') return null;
  try {
    return type === 'suffix'
      ? new RegExp(`(?:${rule.condition})$`, 'u')
      : new RegExp(`^(?:${rule.condition})`, 'u');
  } catch {
    return null;
  }
}
