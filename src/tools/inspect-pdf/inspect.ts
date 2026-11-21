import { PDFDocument, PDFName } from 'pdf-lib';
import { formatBytes } from '../../lib/format';
import {
  countEmbeddedFiles,
  countEndOfFileMarkers,
  decodeHeader,
  dictionary,
  hasJavaScript,
  isoDate,
  pageFeatures,
} from './pdf-features';

export type FlagSeverity = 'info' | 'warning';

export interface PrivacyFlag {
  severity: FlagSeverity;
  text: string;
}

export interface PageSize {
  width: number;
  height: number;
  rotation: number;
}

export interface InspectResult {
  fileName: string;
  fileBytes: number;
  pdfVersion: string | null;
  linearized: boolean;
  incrementalSaves: number;
  encrypted: boolean;
  pageCount: number;
  pageSizes: PageSize[];
  mixedPageSizes: boolean;
  fonts: number;
  images: number;
  annotations: number;
  signatures: number;
  acroForm: boolean;
  xfa: boolean;
  javascript: boolean;
  attachments: number;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    created?: string;
    modified?: string;
  };
  flags: PrivacyFlag[];
  warnings: string[];
}

const MAX_BYTES = 100 * 1024 * 1024;

export async function inspectPdf(file: File): Promise<InspectResult> {
  const warnings: string[] = [];

  if (file.size > MAX_BYTES) {
    throw new Error(
      `This file is ${formatBytes(file.size)}. The inspector stops at ${formatBytes(MAX_BYTES)} so a huge file cannot freeze the tab.`,
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const header = decodeHeader(bytes);
  if (header.version === null) {
    throw new Error(
      'This file does not start with a PDF header, so it is not a PDF. It may be a renamed image or a damaged download.',
    );
  }

  let doc: PDFDocument;
  let encrypted = false;
  try {
    doc = await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/encrypt/i.test(message)) {
      encrypted = true;
      warnings.push(
        'This file is encrypted with a password. Its page count and page sizes can be read, but its metadata, fonts and embedded files cannot.',
      );
      doc = await PDFDocument.load(bytes, { updateMetadata: false, ignoreEncryption: true });
    } else {
      throw new Error(
        `This file could not be read as a PDF (${message}). It may be truncated or damaged.`,
      );
    }
  }

  const pageSizes: PageSize[] = [];
  let fonts = 0;
  let images = 0;
  let annotations = 0;
  let signatures = 0;

  const pages = doc.getPages();
  for (const page of pages) {
    const size = page.getSize();
    pageSizes.push({
      width: Math.round(size.width * 100) / 100,
      height: Math.round(size.height * 100) / 100,
      rotation: page.getRotation().angle,
    });
    const features = pageFeatures(page);
    fonts += features.fonts;
    images += features.images;
    annotations += features.annotations;
    signatures += features.signatures;
  }

  const catalog = doc.catalog;
  const names = dictionary(catalog.lookup(PDFName.of('Names')));
  const acroForm = dictionary(catalog.lookup(PDFName.of('AcroForm')));
  const xfa = acroForm ? acroForm.has(PDFName.of('XFA')) : false;
  const javascript = hasJavaScript(catalog);
  const attachments = countEmbeddedFiles(names);
  const incrementalSaves = countEndOfFileMarkers(bytes);

  const metadata = {
    title: doc.getTitle(),
    author: doc.getAuthor(),
    subject: doc.getSubject(),
    creator: doc.getCreator(),
    producer: doc.getProducer(),
    created: isoDate(doc.getCreationDate()),
    modified: isoDate(doc.getModificationDate()),
  };

  const uniqueSizes = new Set(pageSizes.map((size) => `${size.width}x${size.height}`));

  return {
    fileName: file.name,
    fileBytes: file.size,
    pdfVersion: header.version,
    linearized: header.linearized,
    incrementalSaves,
    encrypted,
    pageCount: pages.length,
    pageSizes,
    mixedPageSizes: uniqueSizes.size > 1,
    fonts,
    images,
    annotations,
    signatures,
    acroForm: acroForm !== undefined,
    xfa,
    javascript,
    attachments,
    metadata,
    flags: buildFlags(metadata, {
      incrementalSaves,
      javascript,
      attachments,
      xfa,
      signatures,
    }),
    warnings,
  };
}

function buildFlags(
  metadata: InspectResult['metadata'],
  facts: { incrementalSaves: number; javascript: boolean; attachments: number; xfa: boolean; signatures: number },
): PrivacyFlag[] {
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
  if (flags.length === 0) {
    flags.push({
      severity: 'info',
      text: 'No author name, scripts, attachments or signatures were found.',
    });
  }
  return flags;
}
