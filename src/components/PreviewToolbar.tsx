// SPDX-License-Identifier: AGPL-3.0-or-later
// Customization controls bar for UploadedPreview (layout modes, backdrop, guides, zoom, rotation).
import type {
  GuideMode,
  InspectRotation,
  MatStyle,
  PreviewMode,
  PreviewSettings,
  ThumbSize,
  ZoomLevel,
} from '../lib/preview-prefs';

interface PreviewToolbarProps {
  settings: PreviewSettings;
  customizeOpen: boolean;
  summaryText: string;
  onToggleCustomize: () => void;
  onChange: (patch: Partial<PreviewSettings>) => void;
  onReset: () => void;
}

const MODES: { value: PreviewMode; label: string }[] = [
  { value: 'grid', label: 'Grid' },
  { value: 'single', label: 'Focus' },
  { value: 'hidden', label: 'Hide' },
];

const MATS: { value: MatStyle; label: string }[] = [
  { value: 'subtle', label: 'Matte' },
  { value: 'paper', label: 'Paper' },
  { value: 'dark', label: 'Dark' },
  { value: 'checker', label: 'Checker' },
];

const SIZES: ThumbSize[] = ['sm', 'md', 'lg'];
const ZOOMS: { value: ZoomLevel; label: string }[] = [
  { value: 'fit', label: 'Fit' },
  { value: '75', label: '75%' },
  { value: '100', label: '100%' },
  { value: '140', label: '140%' },
];
const GUIDES: { value: GuideMode; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'margins', label: 'Margins' },
  { value: 'grid', label: 'Grid' },
  { value: 'cross', label: 'Center' },
];
const ROTATIONS: InspectRotation[] = [0, 90, 180, 270];
const PAGE_CAPS = [6, 12, 24, 48];

export function PreviewToolbar({
  settings,
  customizeOpen,
  summaryText,
  onToggleCustomize,
  onChange,
  onReset,
}: PreviewToolbarProps) {
  return (
    <>
      <div className="preview-bar">
        <div className="preview-bar__info">
          <span className="preview-bar__title">Preview</span>
          <span className="preview-bar__meta">{summaryText}</span>
        </div>

        <div className="preview-bar__actions">
          <div className="preview-seg" role="group" aria-label="Preview layout mode">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                aria-pressed={settings.mode === m.value}
                onClick={() => onChange({ mode: m.value })}
              >
                {m.label}
              </button>
            ))}
          </div>

          {settings.mode !== 'hidden' && (
            <button
              type="button"
              className="preview-chip"
              aria-expanded={customizeOpen}
              aria-pressed={customizeOpen}
              onClick={onToggleCustomize}
            >
              Customize
            </button>
          )}
        </div>
      </div>

      {settings.mode !== 'hidden' && customizeOpen && (
        <div className="preview-custom" role="region" aria-label="Preview customizations">
          <div className="preview-custom__row">
            <span className="preview-custom__label">Backdrop</span>
            <div className="preview-seg" role="group" aria-label="Preview backdrop">
              {MATS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  aria-pressed={settings.mat === m.value}
                  onClick={() => onChange({ mat: m.value })}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="preview-custom__row">
            <span className="preview-custom__label">
              {settings.mode === 'grid' ? 'Thumbnail size' : 'Zoom'}
            </span>
            <div className="preview-seg" role="group" aria-label="Scale options">
              {settings.mode === 'grid'
                ? SIZES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={settings.thumbSize === s}
                      onClick={() => onChange({ thumbSize: s })}
                    >
                      {s.toUpperCase()}
                    </button>
                  ))
                : ZOOMS.map((z) => (
                    <button
                      key={z.value}
                      type="button"
                      aria-pressed={settings.zoom === z.value}
                      onClick={() => onChange({ zoom: z.value })}
                    >
                      {z.label}
                    </button>
                  ))}
            </div>
          </div>

          <div className="preview-custom__row">
            <span className="preview-custom__label">Guides</span>
            <div className="preview-seg" role="group" aria-label="Overlay guides">
              {GUIDES.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  aria-pressed={settings.guide === g.value}
                  onClick={() => onChange({ guide: g.value })}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="preview-custom__row">
            <span className="preview-custom__label">Inspect angle</span>
            <div className="preview-seg" role="group" aria-label="Inspect rotation">
              {ROTATIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={settings.rotation === r}
                  onClick={() => onChange({ rotation: r })}
                >
                  {r}°
                </button>
              ))}
            </div>
          </div>

          <div className="preview-custom__row">
            <span className="preview-custom__label">Pages to load</span>
            <div className="preview-seg" role="group" aria-label="Page batch limit">
              {PAGE_CAPS.map((cap) => (
                <button
                  key={cap}
                  type="button"
                  aria-pressed={settings.pageCap === cap}
                  onClick={() => onChange({ pageCap: cap })}
                >
                  {cap}
                </button>
              ))}
            </div>
          </div>

          <div className="preview-custom__row">
            <div className="cluster">
              <button
                type="button"
                className="preview-chip"
                aria-pressed={settings.showLabels}
                onClick={() => onChange({ showLabels: !settings.showLabels })}
              >
                Labels & sizes
              </button>
              <button
                type="button"
                className="preview-chip"
                aria-pressed={settings.showShadow}
                onClick={() => onChange({ showShadow: !settings.showShadow })}
              >
                Paper shadow
              </button>
              {settings.mode === 'grid' && (
                <button
                  type="button"
                  className="preview-chip"
                  aria-pressed={settings.squareCrop}
                  onClick={() => onChange({ squareCrop: !settings.squareCrop })}
                >
                  Square tiles
                </button>
              )}
            </div>
            <button type="button" className="btn btn--ghost" onClick={onReset}>
              Reset preview
            </button>
          </div>
        </div>
      )}
    </>
  );
}
