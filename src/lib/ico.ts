// SPDX-License-Identifier: AGPL-3.0-or-later
// ICO container writer shared by the image converter and favicon generator.

/** ICO files embed square PNGs; 256 is the largest size the container can describe. */
export const ICO_SIZE = 256;
/** Sizes written into a standard multi-resolution icon, smallest first. */
export const ICO_SIZES = [16, 32, 48, 256] as const;

/** Wraps a square PNG in a single-entry ICO container (the Vista+ PNG-icon form). */
export function wrapIco(png: Uint8Array, size = ICO_SIZE): Uint8Array {
  return wrapIcoMulti([{ png, size }]);
}

/** Wraps several square PNGs in one ICO, one directory entry per size. */
export function wrapIcoMulti(images: { png: Uint8Array; size: number }[]): Uint8Array {
  const header = 6 + images.length * 16;
  const total = images.reduce((sum, image) => sum + image.png.length, header);
  const bytes = new Uint8Array(total);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, images.length, true);
  let offset = header;
  images.forEach((image, index) => {
    const entry = 6 + index * 16;
    bytes[entry] = image.size >= 256 ? 0 : image.size;
    bytes[entry + 1] = image.size >= 256 ? 0 : image.size;
    view.setUint16(entry + 4, 1, true);
    view.setUint16(entry + 6, 32, true);
    view.setUint32(entry + 8, image.png.length, true);
    view.setUint32(entry + 12, offset, true);
    bytes.set(image.png, offset);
    offset += image.png.length;
  });
  return bytes;
}
