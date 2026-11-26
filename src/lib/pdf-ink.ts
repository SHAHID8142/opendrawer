// SPDX-License-Identifier: AGPL-3.0-or-later
// The ink colour used when writing text into a PDF. It cannot read a CSS custom property,
// so this is the one recorded literal for PDF drawing; it matches --color-text (#17150F).

import { rgb } from 'pdf-lib';

export const PDF_INK = rgb(0.09, 0.08, 0.06);
export const PDF_FONT_SIZE = 11;

/** Softer ink for watermarks; the opacity option is applied on top. */
export const PDF_WATERMARK_INK = rgb(0.36, 0.33, 0.28);

/** True black for redaction, both the canvas fill and the PDF rectangle. Never soften it. */
export const REDACT_FILL = 'rgb(0, 0, 0)';
export const PDF_REDACT_INK = rgb(0, 0, 0);
