// SPDX-License-Identifier: AGPL-3.0-or-later
// Output format, resolution, and page-range controls for PDF to image.
import { FORMATS, FORMAT_ORDER, type ImageFormat } from './formats';
import { DPI_CHOICES } from './render';

export interface RenderSettingsProps {
  format: ImageFormat;
  dpi: number;
  range: string;
  rangeError: string | null;
  disabled: boolean;
  hasFile: boolean;
  busy: boolean;
  availableFormats: Record<ImageFormat, boolean>;
  onFormatChange: (value: ImageFormat) => void;
  onDpiChange: (value: number) => void;
  onRangeChange: (value: string) => void;
  onRerender: () => void;
}

export function RenderSettings({
  format,
  dpi,
  range,
  rangeError,
  disabled,
  hasFile,
  busy,
  availableFormats,
  onFormatChange,
  onDpiChange,
  onRangeChange,
  onRerender,
}: RenderSettingsProps) {
  return (
    <div className="card">
      <fieldset className="fieldset" disabled={disabled}>
        <legend>Output settings</legend>

        <div className="form__row">
          <div className="field">
            <label className="field__label" htmlFor="render-format">
              Image format
            </label>
            <select
              id="render-format"
              className="input"
              value={format}
              onChange={(event) => {
                const next = event.target.value as ImageFormat;
                if (next in FORMATS) onFormatChange(next);
              }}
            >
              {FORMAT_ORDER.map((value) => (
                <option key={value} value={value} disabled={!availableFormats[value]}>
                  {FORMATS[value].label}
                  {availableFormats[value] ? '' : ' — not supported here'}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="render-dpi">
              Resolution
            </label>
            <select
              id="render-dpi"
              className="input"
              value={dpi}
              onChange={(event) => onDpiChange(Number(event.target.value))}
            >
              {DPI_CHOICES.map((choice) => (
                <option key={choice} value={choice}>
                  {choice} DPI
                </option>
              ))}
            </select>
          </div>

          <div className="field field--grow">
            <label className="field__label" htmlFor="render-range">
              Pages (leave empty for all)
            </label>
            <input
              id="render-range"
              className="input"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="1-3, 7"
              aria-invalid={rangeError ? 'true' : undefined}
              aria-describedby={rangeError ? 'render-range-hint render-range-error' : 'render-range-hint'}
              value={range}
              onChange={(event) => onRangeChange(event.target.value)}
            />
            <p id="render-range-hint" className="field__hint">
              Use page numbers or ranges separated by commas, such as 1-3, 7, 10-12.
            </p>
            {rangeError && (
              <p id="render-range-error" className="field__error">
                {rangeError}
              </p>
            )}
          </div>
        </div>

        <p className="muted">
          PNG at 150 DPI suits most screens; WebP is smaller for the web, and 300 DPI is for
          printing.
        </p>

        {hasFile && !busy && (
          <div className="drop-bar__actions">
            <button
              type="button"
              className="btn btn--secondary"
              disabled={disabled || Boolean(rangeError)}
              onClick={onRerender}
            >
              Render again
            </button>
          </div>
        )}
      </fieldset>
    </div>
  );
}
