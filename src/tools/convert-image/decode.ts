// SPDX-License-Identifier: AGPL-3.0-or-later
// Re-export the shared image decoder so the tool keeps one import path.
export { decodeImageFile, type DecodedImage } from '../../lib/decode-image.ts';
