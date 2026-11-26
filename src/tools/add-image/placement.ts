// SPDX-License-Identifier: AGPL-3.0-or-later
// Pure geometry for add-image: corner/centre placement, aspect ratio and fitting inside a page.
// PDF points, origin bottom-left, before the page's own rotation is applied.

export type Placement = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'centre';

export interface PageBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlacedImage {
  x: number;
  y: number;
  width: number;
  height: number;
  /** True when the requested width had to shrink to fit the page. */
  scaled: boolean;
}

export function placeImage(
  box: PageBox,
  aspect: number,
  width: number,
  margin: number,
  placement: Placement,
): PlacedImage {
  const availableWidth = Math.max(1, box.width - margin * 2);
  const availableHeight = Math.max(1, box.height - margin * 2);

  let placedWidth = Math.min(width, availableWidth);
  let placedHeight = placedWidth / aspect;
  if (placedHeight > availableHeight) {
    placedHeight = availableHeight;
    placedWidth = placedHeight * aspect;
  }
  const scaled = placedWidth < width - 0.01;

  let x: number;
  let y: number;
  switch (placement) {
    case 'bottom-left':
      x = box.x + margin;
      y = box.y + margin;
      break;
    case 'top-left':
      x = box.x + margin;
      y = box.y + box.height - margin - placedHeight;
      break;
    case 'top-right':
      x = box.x + box.width - margin - placedWidth;
      y = box.y + box.height - margin - placedHeight;
      break;
    case 'bottom-right':
      x = box.x + box.width - margin - placedWidth;
      y = box.y + margin;
      break;
    case 'centre':
      x = box.x + (box.width - placedWidth) / 2;
      y = box.y + (box.height - placedHeight) / 2;
      break;
  }

  return { x, y, width: placedWidth, height: placedHeight, scaled };
}
