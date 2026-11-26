// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Regional English variants.
 *
 * A dictionary answers "is this a word?". It cannot answer "is this word right for the standard
 * this article is written in": `colour` is a real word, but wrong in a US-locked article. This
 * table supplies the second answer.
 *
 * Two deliberate decisions keep it honest:
 *
 * - A variant with no entry in `forms` is **not enforced** for that standard. Canadian and
 *   Australian usage genuinely mixes conventions (`program`, `organize`), and flagging them
 *   would be a false positive.
 * - `alsoAccepted` records spellings a standard tolerates. British English accepts Oxford
 *   `-ize` spellings alongside `-ise`, so a UK lock does not flag `organize`.
 */

export type EnglishVariant = 'US' | 'UK' | 'CA' | 'AU';

export interface VariantGroup {
  /** Stable id used in rule messages and tests. */
  id: string;
  /** The form each standard uses. A missing standard means "no opinion". */
  forms: Partial<Record<EnglishVariant, string>>;
  /** Additional spellings the standard tolerates. */
  alsoAccepted?: Partial<Record<EnglishVariant, string[]>>;
  /** Plain-language hint shown in the quick-fix popover. */
  note?: string;
}

export const VARIANT_GROUPS: VariantGroup[] = [
  // -our / -or
  group('colour', { US: 'color', UK: 'colour', CA: 'colour', AU: 'colour' }),
  group('favour', { US: 'favor', UK: 'favour', CA: 'favour', AU: 'favour' }),
  group('favourite', { US: 'favorite', UK: 'favourite', CA: 'favourite', AU: 'favourite' }),
  group('honour', { US: 'honor', UK: 'honour', CA: 'honour', AU: 'honour' }),
  group('labour', { US: 'labor', UK: 'labour', CA: 'labour', AU: 'labour' }),
  group('neighbour', { US: 'neighbor', UK: 'neighbour', CA: 'neighbour', AU: 'neighbour' }),
  group('rumour', { US: 'rumor', UK: 'rumour', CA: 'rumour', AU: 'rumour' }),
  group('humour', { US: 'humor', UK: 'humour', CA: 'humour', AU: 'humour' }),
  group('behaviour', { US: 'behavior', UK: 'behaviour', CA: 'behaviour', AU: 'behaviour' }),
  group('flavour', { US: 'flavor', UK: 'flavour', CA: 'flavour', AU: 'flavour' }),
  group('harbour', { US: 'harbor', UK: 'harbour', CA: 'harbour', AU: 'harbour' }),
  group('endeavour', { US: 'endeavor', UK: 'endeavour', CA: 'endeavour', AU: 'endeavour' }),
  group('savour', { US: 'savor', UK: 'savour', CA: 'savour', AU: 'savour' }),
  group('vapour', { US: 'vapor', UK: 'vapour', CA: 'vapour', AU: 'vapour' }),
  group('vigour', { US: 'vigor', UK: 'vigour', CA: 'vigour', AU: 'vigour' }),
  group('armour', { US: 'armor', UK: 'armour', CA: 'armour', AU: 'armour' }),
  group('valour', { US: 'valor', UK: 'valour', CA: 'valour', AU: 'valour' }),
  group('odour', { US: 'odor', UK: 'odour', CA: 'odour', AU: 'odour' }),
  group('splendour', { US: 'splendor', UK: 'splendour', CA: 'splendour', AU: 'splendour' }),
  group('tumour', { US: 'tumor', UK: 'tumour', CA: 'tumour', AU: 'tumour' }),

  // -re / -er
  group('centre', { US: 'center', UK: 'centre', CA: 'centre', AU: 'centre' }),
  group('theatre', { US: 'theater', UK: 'theatre', CA: 'theatre', AU: 'theatre' }),
  group('metre', { US: 'meter', UK: 'metre', CA: 'metre', AU: 'metre' }),
  group('litre', { US: 'liter', UK: 'litre', CA: 'litre', AU: 'litre' }),
  group('fibre', { US: 'fiber', UK: 'fibre', CA: 'fibre', AU: 'fibre' }),
  group('calibre', { US: 'caliber', UK: 'calibre', CA: 'calibre', AU: 'calibre' }),
  group('sombre', { US: 'somber', UK: 'sombre', CA: 'sombre', AU: 'sombre' }),
  group('spectre', { US: 'specter', UK: 'spectre', CA: 'spectre', AU: 'spectre' }),
  group('manoeuvre', { US: 'maneuver', UK: 'manoeuvre', CA: 'manoeuvre', AU: 'manoeuvre' }),
  group('sabre', { US: 'saber', UK: 'sabre', CA: 'sabre', AU: 'sabre' }),

  // -ise / -ize
  group('organise', { US: 'organize', UK: 'organise', CA: 'organize', AU: 'organise' }, {
    UK: ['organize'],
  }),
  group('realise', { US: 'realize', UK: 'realise', CA: 'realize', AU: 'realise' }, {
    UK: ['realize'],
  }),
  group('recognise', { US: 'recognize', UK: 'recognise', CA: 'recognize', AU: 'recognise' }, {
    UK: ['recognize'],
  }),
  group('apologise', { US: 'apologize', UK: 'apologise', CA: 'apologize', AU: 'apologise' }, {
    UK: ['apologize'],
  }),
  group('criticise', { US: 'criticize', UK: 'criticise', CA: 'criticize', AU: 'criticise' }, {
    UK: ['criticize'],
  }),
  group('emphasise', { US: 'emphasize', UK: 'emphasise', CA: 'emphasize', AU: 'emphasise' }, {
    UK: ['emphasize'],
  }),
  group('finalise', { US: 'finalize', UK: 'finalise', CA: 'finalize', AU: 'finalise' }, {
    UK: ['finalize'],
  }),
  group('prioritise', { US: 'prioritize', UK: 'prioritise', CA: 'prioritize', AU: 'prioritise' }, {
    UK: ['prioritize'],
  }),
  group('summarise', { US: 'summarize', UK: 'summarise', CA: 'summarize', AU: 'summarise' }, {
    UK: ['summarize'],
  }),
  group('minimise', { US: 'minimize', UK: 'minimise', CA: 'minimize', AU: 'minimise' }, {
    UK: ['minimize'],
  }),
  group('maximise', { US: 'maximize', UK: 'maximise', CA: 'maximize', AU: 'maximise' }, {
    UK: ['maximize'],
  }),
  group('optimise', { US: 'optimize', UK: 'optimise', CA: 'optimize', AU: 'optimise' }, {
    UK: ['optimize'],
  }),
  group('standardise', { US: 'standardize', UK: 'standardise', CA: 'standardize', AU: 'standardise' }, {
    UK: ['standardize'],
  }),
  group('specialise', { US: 'specialize', UK: 'specialise', CA: 'specialize', AU: 'specialise' }, {
    UK: ['specialize'],
  }),
  group('visualise', { US: 'visualize', UK: 'visualise', CA: 'visualize', AU: 'visualise' }, {
    UK: ['visualize'],
  }),
  group('computerise', { US: 'computerize', UK: 'computerise', CA: 'computerize', AU: 'computerise' }, {
    UK: ['computerize'],
  }),
  group('modernise', { US: 'modernize', UK: 'modernise', CA: 'modernize', AU: 'modernise' }, {
    UK: ['modernize'],
  }),

  // -yse / -yze
  group('analyse', { US: 'analyze', UK: 'analyse', CA: 'analyze', AU: 'analyse' }),
  group('paralyse', { US: 'paralyze', UK: 'paralyse', CA: 'paralyze', AU: 'paralyse' }),
  group('catalyse', { US: 'catalyze', UK: 'catalyse', CA: 'catalyze', AU: 'catalyse' }),

  // -ce / -se
  group('defence', { US: 'defense', UK: 'defence', CA: 'defence', AU: 'defence' }),
  group('offence', { US: 'offense', UK: 'offence', CA: 'offence', AU: 'offence' }),
  group('pretence', { US: 'pretense', UK: 'pretence', CA: 'pretence', AU: 'pretence' }),
  group('licence', { US: 'license', UK: 'licence', CA: 'licence', AU: 'licence' }),

  // doubled / single consonants
  group('travelled', { US: 'traveled', UK: 'travelled', CA: 'travelled', AU: 'travelled' }),
  group('travelling', { US: 'traveling', UK: 'travelling', CA: 'travelling', AU: 'travelling' }),
  group('traveller', { US: 'traveler', UK: 'traveller', CA: 'traveller', AU: 'traveller' }),
  group('cancelled', { US: 'canceled', UK: 'cancelled', CA: 'cancelled', AU: 'cancelled' }),
  group('cancelling', { US: 'canceling', UK: 'cancelling', CA: 'cancelling', AU: 'cancelling' }),
  group('labelled', { US: 'labeled', UK: 'labelled', CA: 'labelled', AU: 'labelled' }),
  group('labelling', { US: 'labeling', UK: 'labelling', CA: 'labelling', AU: 'labelling' }),
  group('modelled', { US: 'modeled', UK: 'modelled', CA: 'modelled', AU: 'modelled' }),
  group('modelling', { US: 'modeling', UK: 'modelling', CA: 'modelling', AU: 'modelling' }),
  group('fuelled', { US: 'fueled', UK: 'fuelled', CA: 'fuelled', AU: 'fuelled' }),
  group('dialled', { US: 'dialed', UK: 'dialled', CA: 'dialled', AU: 'dialled' }),
  group('signalling', { US: 'signaling', UK: 'signalling', CA: 'signalling', AU: 'signalling' }),
  group('levelled', { US: 'leveled', UK: 'levelled', CA: 'levelled', AU: 'levelled' }),
  group('marvellous', { US: 'marvelous', UK: 'marvellous', CA: 'marvellous', AU: 'marvellous' }),
  group('woollen', { US: 'woolen', UK: 'woollen', CA: 'woollen', AU: 'woollen' }),
  group('enrolment', { US: 'enrollment', UK: 'enrolment', CA: 'enrollment', AU: 'enrolment' }),
  group('instalment', { US: 'installment', UK: 'instalment', CA: 'installment', AU: 'instalment' }),
  group('fulfilment', { US: 'fulfillment', UK: 'fulfilment', CA: 'fulfilment', AU: 'fulfilment' }),
  group('skilful', { US: 'skillful', UK: 'skilful', CA: 'skilful', AU: 'skilful' }),
  group('wilful', { US: 'willful', UK: 'wilful', CA: 'wilful', AU: 'wilful' }),
  group('fulfil', { US: 'fulfill', UK: 'fulfil', CA: 'fulfil', AU: 'fulfil' }),
  group('enrol', { US: 'enroll', UK: 'enrol', CA: 'enrol', AU: 'enrol' }),
  group('instil', { US: 'instill', UK: 'instil', CA: 'instil', AU: 'instil' }),
  group('ageing', { US: 'aging', UK: 'ageing', CA: 'ageing', AU: 'ageing' }),
  group('judgement', { US: 'judgment', UK: 'judgement', CA: 'judgement', AU: 'judgement' }),
  group('acknowledgement', {
    US: 'acknowledgment',
    UK: 'acknowledgement',
    CA: 'acknowledgement',
    AU: 'acknowledgement',
  }),

  // -ogue / -og
  group('catalogue', { US: 'catalog', UK: 'catalogue', CA: 'catalogue', AU: 'catalogue' }),
  group('dialogue', { US: 'dialog', UK: 'dialogue', CA: 'dialogue', AU: 'dialogue' }),
  group('analogue', { US: 'analog', UK: 'analogue', CA: 'analogue', AU: 'analogue' }),
  group('monologue', { US: 'monolog', UK: 'monologue', CA: 'monologue', AU: 'monologue' }),

  // -ae / -e, -oe / -e
  group('anaemia', { US: 'anemia', UK: 'anaemia', CA: 'anemia', AU: 'anaemia' }),
  group('anaesthesia', { US: 'anesthesia', UK: 'anaesthesia', CA: 'anesthesia', AU: 'anaesthesia' }),
  group('archaeology', { US: 'archeology', UK: 'archaeology', CA: 'archaeology', AU: 'archaeology' }),
  group('gynaecology', { US: 'gynecology', UK: 'gynaecology', CA: 'gynaecology', AU: 'gynaecology' }),
  group('leukaemia', { US: 'leukemia', UK: 'leukaemia', CA: 'leukemia', AU: 'leukaemia' }),
  group('orthopaedic', { US: 'orthopedic', UK: 'orthopaedic', CA: 'orthopedic', AU: 'orthopaedic' }),
  group('paediatric', { US: 'pediatric', UK: 'paediatric', CA: 'pediatric', AU: 'paediatric' }),
  group('palaeontology', {
    US: 'paleontology',
    UK: 'palaeontology',
    CA: 'paleontology',
    AU: 'palaeontology',
  }),
  group('diarrhoea', { US: 'diarrhea', UK: 'diarrhoea', CA: 'diarrhea', AU: 'diarrhoea' }),
  group('oesophagus', { US: 'esophagus', UK: 'oesophagus', CA: 'esophagus', AU: 'oesophagus' }),
  group('oestrogen', { US: 'estrogen', UK: 'oestrogen', CA: 'estrogen', AU: 'oestrogen' }),
  group('foetus', { US: 'fetus', UK: 'foetus', CA: 'fetus', AU: 'foetus' }),
  group('haemorrhage', { US: 'hemorrhage', UK: 'haemorrhage', CA: 'hemorrhage', AU: 'haemorrhage' }),

  // everyday vocabulary
  group('grey', { US: 'gray', UK: 'grey', CA: 'grey', AU: 'grey' }),
  group('cheque', { US: 'check', UK: 'cheque', CA: 'cheque', AU: 'cheque' }),
  group('jewellery', { US: 'jewelry', UK: 'jewellery', CA: 'jewellery', AU: 'jewellery' }),
  group('pyjamas', { US: 'pajamas', UK: 'pyjamas', CA: 'pyjamas', AU: 'pyjamas' }),
  group('tyre', { US: 'tire', UK: 'tyre', CA: 'tire', AU: 'tyre' }),
  group('kerb', { US: 'curb', UK: 'kerb', CA: 'curb', AU: 'kerb' }),
  group('aluminium', { US: 'aluminum', UK: 'aluminium', CA: 'aluminium', AU: 'aluminium' }),
  group('moustache', { US: 'mustache', UK: 'moustache', CA: 'moustache', AU: 'moustache' }),
  group('plough', { US: 'plow', UK: 'plough', CA: 'plough', AU: 'plough' }),
  group('mould', { US: 'mold', UK: 'mould', CA: 'mould', AU: 'mould' }),
  group('smoulder', { US: 'smolder', UK: 'smoulder', CA: 'smoulder', AU: 'smoulder' }),
  group('draught', { US: 'draft', UK: 'draught', CA: 'draught', AU: 'draught' }),
  group('aeroplane', { US: 'airplane', UK: 'aeroplane', CA: 'airplane', AU: 'aeroplane' }),
  group('maths', { US: 'math', UK: 'maths', CA: 'math', AU: 'maths' }),
  group('mum', { US: 'mom', UK: 'mum', CA: 'mom', AU: 'mum' }),
  group('programme', { UK: 'programme', AU: 'programme' }, { UK: ['program'], AU: ['program'] }),
  group('storey', { US: 'story', UK: 'storey', CA: 'storey', AU: 'storey' }),
];

function group(
  id: string,
  forms: Partial<Record<EnglishVariant, string>>,
  alsoAccepted?: Partial<Record<EnglishVariant, string[]>>,
): VariantGroup {
  return { id, forms, ...(alsoAccepted === undefined ? {} : { alsoAccepted }) };
}

interface VariantIndexEntry {
  group: VariantGroup;
  /** The standard whose canonical form this spelling is. */
  owner: EnglishVariant;
  /** Forms tolerated by each standard, keyed by lowercase spelling. */
  toleratedBy: EnglishVariant[];
}

const INDEX = new Map<string, VariantIndexEntry>();

for (const entry of VARIANT_GROUPS) {
  for (const [variant, form] of Object.entries(entry.forms) as Array<[EnglishVariant, string]>) {
    const key = form.toLocaleLowerCase();
    const toleratedBy = (Object.entries(entry.alsoAccepted ?? {}) as Array<[EnglishVariant, string[]]>)
      .filter(([, list]) => list.some((item) => item.toLocaleLowerCase() === key))
      .map(([variantName]) => variantName);
    INDEX.set(key, { group: entry, owner: variant, toleratedBy });
  }
}

export interface VariantVerdict {
  /** The spelling the locked standard expects. */
  expected: string;
  /** The standard the document is locked to. */
  standard: EnglishVariant;
  /** The variant the written spelling belongs to. */
  actual: EnglishVariant;
  message: string;
}

/** Returns the group this spelling belongs to, if any. */
export function variantEntry(word: string): VariantIndexEntry | undefined {
  return INDEX.get(word.toLocaleLowerCase());
}

/**
 * Decide whether `word` violates a locked standard.
 *
 * `undefined` means "no opinion": the word is not in the table, or the table has no canonical
 * form for the locked standard, so the checker must stay silent rather than guess.
 */
export function checkAgainstStandard(word: string, standard: EnglishVariant): VariantVerdict | undefined {
  const entry = variantEntry(word);
  if (entry === undefined) return undefined;
  if (entry.toleratedBy.includes(standard)) return undefined;
  const expected = entry.group.forms[standard];
  if (expected === undefined) return undefined;
  if (expected.toLocaleLowerCase() === word.toLocaleLowerCase()) return undefined;
  return {
    expected,
    standard,
    actual: entry.owner,
    message: `"${word}" is ${entry.owner} spelling; this article is locked to ${standardWords[standard]}.`,
  };
}

/** All spellings of the same notion, used by the dialect-consistency module. */
export function variantSiblings(word: string): string[] {
  const entry = variantEntry(word);
  if (entry === undefined) return [];
  const forms = new Set<string>();
  for (const form of Object.values(entry.group.forms)) if (form !== undefined) forms.add(form);
  for (const list of Object.values(entry.group.alsoAccepted ?? {})) for (const form of list) forms.add(form);
  return [...forms];
}

export const standardWords: Record<EnglishVariant, string> = {
  US: 'US English',
  UK: 'UK English',
  CA: 'Canadian English',
  AU: 'Australian English',
};

export function standardFromLanguage(languageId: string): EnglishVariant | undefined {
  if (languageId === 'en-US') return 'US';
  if (languageId === 'en-GB') return 'UK';
  if (languageId === 'en-CA') return 'CA';
  if (languageId === 'en-AU') return 'AU';
  return undefined;
}
