// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Language packs: the metadata, the on-demand loader and the engine pool.
 *
 * Dictionaries are never bundled into the JavaScript. They are static files served from this
 * origin and fetched only when a language is first used, so the tool page stays small on a
 * metered connection and the CSP still guarantees that nothing leaves the device.
 */

import type { LanguagePack } from '../types.ts';
import { parseAffix } from '../hunspell/aff.ts';
import { parseDictionary } from '../hunspell/dic.ts';
import { HunspellEngine } from '../hunspell/engine.ts';

export const LANGUAGE_PACKS: LanguagePack[] = [
  {
    id: 'en-US',
    label: 'English (United States)',
    nativeLabel: 'English (United States)',
    script: 'latin',
    variant: 'US',
    basePath: '/dictionaries/en-US',
    bytes: 554_848,
    licence: {
      id: 'SCOWL/Ispell (permissive)',
      attribution: 'SCOWL word list, Copyright 2000-2018 Kevin Atkinson; affix file derived from Ispell.',
    },
    rulePacks: ['en-dialect', 'en-confusables'],
  },
  {
    id: 'en-GB',
    label: 'English (United Kingdom)',
    nativeLabel: 'English (United Kingdom)',
    script: 'latin',
    variant: 'UK',
    basePath: '/dictionaries/en-GB',
    bytes: 555_192,
    licence: {
      id: 'SCOWL/Ispell (permissive)',
      attribution: 'SCOWL word list, Copyright 2000-2018 Kevin Atkinson; affix file derived from Ispell.',
    },
    rulePacks: ['en-dialect', 'en-confusables'],
  },
  {
    id: 'en-CA',
    label: 'English (Canada)',
    nativeLabel: 'English (Canada)',
    script: 'latin',
    variant: 'CA',
    basePath: '/dictionaries/en-CA',
    bytes: 554_669,
    licence: {
      id: 'SCOWL/Ispell (permissive)',
      attribution: 'SCOWL word list, Copyright 2000-2018 Kevin Atkinson; affix file derived from Ispell.',
    },
    rulePacks: ['en-dialect', 'en-confusables'],
  },
  {
    id: 'en-AU',
    label: 'English (Australia)',
    nativeLabel: 'English (Australia)',
    script: 'latin',
    variant: 'AU',
    basePath: '/dictionaries/en-AU',
    bytes: 557_422,
    licence: {
      id: 'SCOWL/Ispell (permissive)',
      attribution: 'SCOWL word list, Copyright 2000-2018 Kevin Atkinson; affix file derived from Ispell.',
    },
    rulePacks: ['en-dialect', 'en-confusables'],
  },
  {
    id: 'bn-BD',
    label: 'Bengali (Bangladesh)',
    nativeLabel: 'বাংলা (বাংলাদেশ)',
    script: 'bengali',
    variant: 'BD',
    basePath: '/dictionaries/bn-BD',
    bytes: 2_363_106,
    licence: {
      id: 'GPL-2.0-or-later',
      attribution: 'bn_BD Hunspell dictionary, Copyright 2018 Jacob Thomas, Bengal Creative Media LTD.'
    },
    rulePacks: ['bn-promito', 'bn-mechanical'],
  },
];

export const DEFAULT_LANGUAGE = 'en-US';

export function packById(id: string): LanguagePack | undefined {
  return LANGUAGE_PACKS.find((pack) => pack.id === id);
}

/** Loads text from a same-origin path; injected so tests can read from disk. */
export type TextFetcher = (url: string) => Promise<string>;

export interface EngineStatus {
  id: string;
  state: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
  wordCount?: number;
  /** Milliseconds spent fetching and parsing. */
  loadMs?: number;
}

export async function loadEngine(pack: LanguagePack, fetcher: TextFetcher): Promise<HunspellEngine> {
  const [affSource, dicSource] = await Promise.all([
    fetcher(`${pack.basePath}/index.aff`),
    fetcher(`${pack.basePath}/index.dic`),
  ]);
  const affix = parseAffix(affSource);
  const dictionary = parseDictionary(dicSource, affix.codec, affix.file.flagType, affix.flagAliases);
  if (dictionary.words.size === 0) {
    throw new Error(`The ${pack.label} dictionary loaded but contained no words.`);
  }
  return new HunspellEngine({
    id: pack.id,
    affix: affix.file,
    codec: affix.codec,
    words: dictionary.words,
  });
}

/**
 * Holds loaded engines and their status, so the UI can show "preparing the dictionary" instead
 * of appearing frozen while a 2 MB Bengali pack downloads.
 */
export class EnginePool {
  private readonly fetcher: TextFetcher;
  private readonly engines = new Map<string, HunspellEngine>();
  private readonly pending = new Map<string, Promise<HunspellEngine>>();
  private readonly statuses = new Map<string, EngineStatus>();

  constructor(fetcher: TextFetcher) {
    this.fetcher = fetcher;
    for (const pack of LANGUAGE_PACKS) {
      this.statuses.set(pack.id, { id: pack.id, state: 'idle' });
    }
  }

  status(): EngineStatus[] {
    return LANGUAGE_PACKS.map(
      (pack) => this.statuses.get(pack.id) ?? { id: pack.id, state: 'idle' },
    );
  }

  get(id: string): HunspellEngine | undefined {
    return this.engines.get(id);
  }

  has(id: string): boolean {
    return this.engines.has(id);
  }

  async load(id: string): Promise<HunspellEngine> {
    const existing = this.engines.get(id);
    if (existing !== undefined) return existing;
    const inFlight = this.pending.get(id);
    if (inFlight !== undefined) return inFlight;

    const pack = packById(id);
    if (pack === undefined) throw new Error(`Unknown language pack: ${id}`);
    this.statuses.set(id, { id, state: 'loading' });
    const started = Date.now();
    const promise = loadEngine(pack, this.fetcher)
      .then((engine) => {
        this.engines.set(id, engine);
        this.statuses.set(id, {
          id,
          state: 'ready',
          wordCount: engine.wordCount,
          loadMs: Date.now() - started,
        });
        return engine;
      })
      .catch((cause: unknown) => {
        const message = cause instanceof Error ? cause.message : String(cause);
        this.statuses.set(id, { id, state: 'error', error: message });
        throw cause;
      })
      .finally(() => {
        this.pending.delete(id);
      });
    this.pending.set(id, promise);
    return promise;
  }

  /** Load every id, reporting the ones that failed instead of rejecting the whole batch. */
  async loadAll(ids: string[]): Promise<{ loaded: string[]; failed: Array<{ id: string; reason: string }> }> {
    const loaded: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];
    await Promise.all(
      [...new Set(ids)].map(async (id) => {
        try {
          await this.load(id);
          loaded.push(id);
        } catch (cause) {
          failed.push({ id, reason: cause instanceof Error ? cause.message : String(cause) });
        }
      }),
    );
    return { loaded, failed };
  }

  unload(id: string): void {
    this.engines.delete(id);
    this.statuses.set(id, { id, state: 'idle' });
  }
}

export function totalPackBytes(): number {
  return LANGUAGE_PACKS.reduce((total, pack) => total + pack.bytes, 0);
}
