// SPDX-License-Identifier: AGPL-3.0-or-later
// Pure structural PDF inspector: checks metadata, scripts, embedded files, forms, and page sizes.
import { PDFDocument, PDFName } from 'pdf-lib';
import { formatBytes } from '../../lib/format';
import {
  buildPrivacyFlags,
  countEmbeddedFiles,
  countEndOfFileMarkers,
  decodeHeader,
  dictionary,
  hasJavaScript,
  isoDate,
  pageFeatures,
  type FlagSeverity,
  type MetadataSummary,
  type PrivacyFlag,
} from './pdf-features';

export type { FlagSeverity, PrivacyFlag };

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
  metadata: MetadataSummary;
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
      throw new Error('This file could not be read as a PDF. It may be truncated or damaged.');
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

  const metadata: MetadataSummary = {
    title: doc.getTitle(),
    author: doc.getAuthor(),
    subject: doc.getSubject(),
    creator: doc.getCreator(),
    producer: doc.getProducer(),
    created: isoDate(doc.getCreationDate()),
    modified: isoDate(doc.getModificationDate()),
  };

  const uniqueSizes = new Set(pageSizes.map((size) => `${size.width}x${size.height}`));
  const flags = buildPrivacyFlags(metadata, {
    incrementalSaves,
    javascript,
    attachments,
    xfa,
    signatures,
    encrypted,
  });

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
    flags,
    warnings,
  };
}
