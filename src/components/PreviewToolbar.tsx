// SPDX-License-Identifier: AGPL-3.0-or-later
// Quiet preview toolbar aligned with homepage card controls (mode, backdrop, scale, guides, rotation).
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
  kind: 'pdf' | 'image' | 'text' | 'media' | 'summary';
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

export function PreviewToolbar({
  kind,
  settings,
  customizeOpen,
  summaryText,
  onToggleCustomize,
  onChange,
  onReset,
}: PreviewToolbarProps) {
  const isVisual = kind === 'pdf' || kind === 'image';

  return (
    <>
      <div className="preview-bar">
        <div className="preview-bar__info">
          <span className="preview-bar__title">Preview</span>
          <span className="preview-bar__meta">{summaryText}</span>
        </div>

        <div className="preview-bar__actions">
          {isVisual ? (
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
          ) : (
            <button
              type="button"
              className="preview-chip"
              aria-pressed={settings.mode !== 'hidden'}
              onClick={() => onChange({ mode: settings.mode === 'hidden' ? 'grid' : 'hidden' })}
            >
              {settings.mode === 'hidden' ? 'Show preview' : 'Hide preview'}
            </button>
          )}

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
                <button key={m.value} type="button" aria-pressed={settings.mat === m.value} onClick={() => onChange({ mat: m.value })}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {isVisual && (
            <>
              <div className="preview-custom__row">
                <span className="preview-custom__label">{settings.mode === 'grid' ? 'Thumbnail size' : 'Zoom'}</span>
                <div className="preview-seg" role="group" aria-label="Scale options">
                  {settings.mode === 'grid'
                    ? SIZES.map((s) => (
                        <button key={s} type="button" aria-pressed={settings.thumbSize === s} onClick={() => onChange({ thumbSize: s })}>
                          {s.toUpperCase()}
                        </button>
                      ))
                    : ZOOMS.map((z) => (
                        <button key={z.value} type="button" aria-pressed={settings.zoom === z.value} onClick={() => onChange({ zoom: z.value })}>
                          {z.label}
                        </button>
                      ))}
                </div>
              </div>

              <div className="preview-custom__row">
                <span className="preview-custom__label">Guides</span>
                <div className="preview-seg" role="group" aria-label="Overlay guides">
                  {GUIDES.map((g) => (
                    <button key={g.value} type="button" aria-pressed={settings.guide === g.value} onClick={() => onChange({ guide: g.value })}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="preview-custom__row">
                <span className="preview-custom__label">Inspect angle</span>
                <div className="preview-seg" role="group" aria-label="Inspect rotation">
                  {ROTATIONS.map((r) => (
                    <button key={r} type="button" aria-pressed={settings.rotation === r} onClick={() => onChange({ rotation: r })}>
                      {r}°
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="preview-custom__row">
            <div className="cluster">
              {isVisual ? (
                <>
                  <button type="button" className="preview-chip" aria-pressed={settings.showLabels} onClick={() => onChange({ showLabels: !settings.showLabels })}>
                    Labels & sizes
                  </button>
                  <button type="button" className="preview-chip" aria-pressed={settings.showShadow} onClick={() => onChange({ showShadow: !settings.showShadow })}>
                    Paper shadow
                  </button>
                  {kind === 'pdf' && (
                    <button type="button" className="preview-chip" aria-pressed={settings.autoLoadAll} onClick={() => onChange({ autoLoadAll: !settings.autoLoadAll })}>
                      Always load all pages
                    </button>
                  )}
                  {settings.mode === 'grid' && (
                    <button type="button" className="preview-chip" aria-pressed={settings.squareCrop} onClick={() => onChange({ squareCrop: !settings.squareCrop })}>
                      Square tiles
                    </button>
                  )}
                </>
              ) : (
                <button type="button" className="preview-chip" aria-pressed={settings.wrapText} onClick={() => onChange({ wrapText: !settings.wrapText })}>
                  Wrap lines
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
