// SPDX-License-Identifier: AGPL-3.0-or-later
// Decode a file with createImageBitmap, falling back to an <img> for SVG and other formats
// that Chromium's bitmap decoder rejects but the image pipeline can still render.

export interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}

export async function decodeImageFile(file: File): Promise<DecodedImage | null> {
  try {
    const bitmap = await createImageBitmap(file);
    if (bitmap.width === 0 || bitmap.height === 0) {
      bitmap.close();
      return null;
    }
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  } catch {
    const url = URL.createObjectURL(file);
    const image = new Image();
    try {
      image.src = url;
      await image.decode();
      if (image.naturalWidth === 0 || image.naturalHeight === 0) {
        URL.revokeObjectURL(url);
        return null;
      }
      return {
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        close: () => URL.revokeObjectURL(url),
      };
    } catch {
      URL.revokeObjectURL(url);
      return null;
    }
  }
}
