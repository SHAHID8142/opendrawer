// SPDX-License-Identifier: AGPL-3.0-or-later
// UI-only preferences for the uploaded-file preview studio (zero document data stored).

export type PreviewMode = 'grid' | 'single' | 'hidden';
export type ThumbSize = 'sm' | 'md' | 'lg';
export type ZoomLevel = 'fit' | '75' | '100' | '140';
export type MatStyle = 'subtle' | 'paper' | 'dark' | 'checker';
export type GuideMode = 'none' | 'margins' | 'grid' | 'cross';
export type InspectRotation = 0 | 90 | 180 | 270;

export interface PreviewSettings {
  mode: PreviewMode;
  thumbSize: ThumbSize;
  zoom: ZoomLevel;
  mat: MatStyle;
  guide: GuideMode;
  rotation: InspectRotation;
  pageCap: number;
  showLabels: boolean;
  showShadow: boolean;
  squareCrop: boolean;
}

export const DEFAULT_PREVIEW_SETTINGS: PreviewSettings = {
  mode: 'grid',
  thumbSize: 'md',
  zoom: 'fit',
  mat: 'subtle',
  guide: 'none',
  rotation: 0,
  pageCap: 12,
  showLabels: true,
  showShadow: true,
  squareCrop: false,
};

const STORAGE_KEY = 'od-preview-prefs-v1';

export function loadPreviewPrefs(): PreviewSettings {
  if (typeof window === 'undefined') return DEFAULT_PREVIEW_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREVIEW_SETTINGS;
    return { ...DEFAULT_PREVIEW_SETTINGS, ...(JSON.parse(raw) as Partial<PreviewSettings>) };
  } catch {
    return DEFAULT_PREVIEW_SETTINGS;
  }
}

export function savePreviewPrefs(next: PreviewSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota or private-mode restrictions.
  }
}
