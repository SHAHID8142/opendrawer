// SPDX-License-Identifier: AGPL-3.0-or-later
// Shared shape and validation for the add-image form, kept out of the component for testability.

import { parsePageSelection, validatePageRangeSyntax } from '../../lib/page-range';
import { MAX_MARGIN_MM, MAX_WIDTH_MM, MIN_WIDTH_MM } from './engine';
import type { Placement } from './placement';

export interface ImageSettings {
  placement: Placement;
  widthMm: number;
  marginMm: number;
  opacity: number;
  range: string;
}

export const PLACEMENTS: { value: Placement; label: string }[] = [
  { value: 'bottom-right', label: 'Bottom right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'top-right', label: 'Top right' },
  { value: 'top-left', label: 'Top left' },
  { value: 'centre', label: 'Centre' },
];

export const OPACITIES = [1, 0.75, 0.5, 0.25];

export const DEFAULT_SETTINGS: ImageSettings = {
  placement: 'bottom-right',
  widthMm: 30,
  marginMm: 10,
  opacity: 1,
  range: '',
};

export interface EvaluatedSettings {
  widthValid: boolean;
  marginValid: boolean;
  syntaxError: string | null;
  boundsError: string | null;
  selection: number[] | null;
}

export function evaluateSettings(settings: ImageSettings, pageCount: number | null): EvaluatedSettings {
  const widthValid = settings.widthMm >= MIN_WIDTH_MM && settings.widthMm <= MAX_WIDTH_MM;
  const marginValid = settings.marginMm >= 0 && settings.marginMm <= MAX_MARGIN_MM;
  const syntaxError = validatePageRangeSyntax(settings.range);
  let selection: number[] | null = null;
  let boundsError: string | null = null;
  if (pageCount !== null && syntaxError === null) {
    try {
      selection = parsePageSelection(settings.range, pageCount);
    } catch (cause) {
      boundsError = cause instanceof Error ? cause.message : 'That range is outside the document.';
    }
  }
  return { widthValid, marginValid, syntaxError, boundsError, selection };
}
