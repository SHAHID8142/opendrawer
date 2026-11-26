import { PDFArray, PDFDict, PDFName, PDFPage, PDFRawStream } from 'pdf-lib';

export type FlagSeverity = 'info' | 'warning';

export interface PrivacyFlag {
  severity: FlagSeverity;
  text: string;
}

export interface FlagFacts {
  incrementalSaves: number;
  javascript: boolean;
  attachments: number;
  xfa: boolean;
  signatures: number;
  encrypted: boolean;
}

export interface MetadataSummary {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  created?: string;
  modified?: string;
}

export interface PageFeatures {
  fonts: number;
  images: number;
  annotations: number;
  signatures: number;
}

export function dictionary(value: unknown): PDFDict | undefined {
  if (value instanceof PDFDict) return value;
  if (value instanceof PDFRawStream) return value.dict;
  return undefined;
}

export function nameAt(dict: PDFDict | undefined, key: string): string | null {
  if (!dict) return null;
  const value = dict.get(PDFName.of(key));
  return value ? value.toString() : null;
}

export function countDictKeys(dict: PDFDict | undefined): number {
  if (!dict) return 0;
  return dict.keys().length;
}

export function countEmbeddedFiles(names: PDFDict | undefined): number {
  if (!names) return 0;
  const tree = dictionary(names.lookup(PDFName.of('EmbeddedFiles')));
  if (!tree) return 0;
  const entries = tree.lookup(PDFName.of('Names'));
  if (!(entries instanceof PDFArray)) return 0;
  return Math.floor(entries.size() / 2);
}

export function hasJavaScript(catalog: PDFDict): boolean {
  const names = dictionary(catalog.lookup(PDFName.of('Names')));
  if (names && names.has(PDFName.of('JavaScript'))) return true;
  const openAction = dictionary(catalog.lookup(PDFName.of('OpenAction')));
  return nameAt(openAction, 'S') === '/JavaScript';
}

export function decodeHeader(bytes: Uint8Array): { version: string | null; linearized: boolean } {
  const head = new TextDecoder('latin1').decode(bytes.slice(0, 2048));
  const match = /%PDF-(\d\.\d)/.exec(head);
  return {
    version: match ? (match[1] ?? null) : null,
    linearized: head.includes('/Linearized'),
  };
}

export function countEndOfFileMarkers(bytes: Uint8Array): number {
  const text = new TextDecoder('latin1').decode(bytes);
  let count = 0;
  let index = text.indexOf('%%EOF');
  while (index !== -1) {
    count += 1;
    index = text.indexOf('%%EOF', index + 5);
  }
  return Math.max(count, 1);
}

export function isoDate(value: Date | undefined): string | undefined {
  if (!value || Number.isNaN(value.getTime())) return undefined;
  return value.toISOString().slice(0, 10);
}

/** Fonts, image XObjects, annotations and signatures for one page. */
export function pageFeatures(page: PDFPage): PageFeatures {
  const features: PageFeatures = { fonts: 0, images: 0, annotations: 0, signatures: 0 };
  const resources = page.node.Resources();

  features.fonts = countDictKeys(dictionary(resources?.lookup(PDFName.of('Font'))));

  const xObjects = dictionary(resources?.lookup(PDFName.of('XObject')));
  if (xObjects) {
    for (const [, value] of xObjects.entries()) {
      const stream = dictionary(value);
      if (stream && nameAt(stream, 'Subtype') === '/Image') {
        features.images += 1;
      }
    }
  }

  const annots = page.node.Annots();
  if (annots instanceof PDFArray) {
    features.annotations = annots.size();
    for (let index = 0; index < annots.size(); index += 1) {
      const annot = dictionary(annots.get(index));
      if (annot && nameAt(annot, 'FT') === '/Sig') features.signatures += 1;
    }
  }

  return features;
}

/** Build privacy and sharing flags from parsed PDF metadata and structural facts. */
export function buildPrivacyFlags(metadata: MetadataSummary, facts: FlagFacts): PrivacyFlag[] {
  const flags: PrivacyFlag[] = [];
  if (metadata.author) {
    flags.push({ severity: 'warning', text: `Includes an author name: ${metadata.author}` });
  }
  const software = [metadata.creator, metadata.producer].filter(Boolean).join(' / ');
  if (software) {
    flags.push({ severity: 'info', text: `Records the software that made it: ${software}` });
  }
  if (metadata.created) {
    flags.push({ severity: 'info', text: `Records a creation date: ${metadata.created}` });
  }
  if (facts.incrementalSaves > 1) {
    flags.push({
      severity: 'warning',
      text: `Saved ${facts.incrementalSaves} times. Earlier revisions can still hold text that was replaced later, so a "removed" name or number may still be readable.`,
    });
  }
  if (facts.javascript) {
    flags.push({
      severity: 'warning',
      text: 'Contains JavaScript that runs when the file is opened. OpenDrawer never runs it; most viewers will.',
    });
  }
  if (facts.attachments > 0) {
    flags.push({
      severity: 'warning',
      text: `Carries ${facts.attachments} embedded file${facts.attachments === 1 ? '' : 's'} inside it, which travel with the PDF.`,
    });
  }
  if (facts.xfa) {
    flags.push({ severity: 'info', text: 'Uses an XFA form, which many viewers cannot display.' });
  }
  if (facts.signatures > 0) {
    flags.push({
      severity: 'info',
      text: `Has ${facts.signatures} digital signature${facts.signatures === 1 ? '' : 's'}. Changing the file will invalidate the signature.`,
    });
  }
  if (flags.length === 0 && !facts.encrypted) {
    flags.push({
      severity: 'info',
      text: 'No author name, scripts, attachments or signatures were found.',
    });
  }
  return flags;
}
