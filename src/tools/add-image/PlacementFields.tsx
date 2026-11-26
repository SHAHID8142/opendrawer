// SPDX-License-Identifier: AGPL-3.0-or-later
// The add-image controls, rendered as one fieldset so the tool component stays small.
import { MAX_MARGIN_MM, MAX_WIDTH_MM, MIN_WIDTH_MM } from './engine';
import { OPACITIES, PLACEMENTS, type EvaluatedSettings, type ImageSettings } from './options';

interface Props {
  settings: ImageSettings;
  evaluated: EvaluatedSettings;
  pageCount: number;
  disabled: boolean;
  onChange: (next: ImageSettings) => void;
}

export function PlacementFields({ settings, evaluated, pageCount, disabled, onChange }: Props) {
  const update = (patch: Partial<ImageSettings>) => onChange({ ...settings, ...patch });
  const { selection, widthValid, marginValid, syntaxError, boundsError } = evaluated;

  return (
    <fieldset className="fieldset" disabled={disabled}>
      <legend>How to place it</legend>
      <div className="form__row">
        <div className="field">
          <label className="field__label" htmlFor="image-placement">
            Position
          </label>
          <select
            id="image-placement"
            className="select"
            value={settings.placement}
            onChange={(event) => update({ placement: event.target.value as ImageSettings['placement'] })}
          >
            {PLACEMENTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="image-width">
            Width (mm)
          </label>
          <input
            id="image-width"
            className="input"
            type="number"
            min={MIN_WIDTH_MM}
            max={MAX_WIDTH_MM}
            value={settings.widthMm}
            aria-invalid={widthValid ? undefined : 'true'}
            onChange={(event) => update({ widthMm: Number(event.target.value) })}
          />
          {!widthValid && (
            <p className="field__error" role="alert">
              Use {MIN_WIDTH_MM}–{MAX_WIDTH_MM} mm.
            </p>
          )}
        </div>

        <div className="field">
          <label className="field__label" htmlFor="image-margin">
            Margin (mm)
          </label>
          <input
            id="image-margin"
            className="input"
            type="number"
            min={0}
            max={MAX_MARGIN_MM}
            value={settings.marginMm}
            aria-invalid={marginValid ? undefined : 'true'}
            onChange={(event) => update({ marginMm: Number(event.target.value) })}
          />
          {!marginValid && (
            <p className="field__error" role="alert">
              Use 0–{MAX_MARGIN_MM} mm.
            </p>
          )}
        </div>

        <div className="field">
          <label className="field__label" htmlFor="image-opacity">
            Opacity
          </label>
          <select
            id="image-opacity"
            className="select"
            value={String(settings.opacity)}
            onChange={(event) => update({ opacity: Number(event.target.value) })}
          >
            {OPACITIES.map((value) => (
              <option key={value} value={value}>
                {Math.round(value * 100)}%
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="image-range">
          Pages (leave empty for all)
        </label>
        <input
          id="image-range"
          className="input"
          type="text"
          inputMode="numeric"
          placeholder="for example 1, 3-5"
          value={settings.range}
          aria-invalid={syntaxError || boundsError ? 'true' : undefined}
          onChange={(event) => update({ range: event.target.value })}
        />
        <p className="field__hint">
          {selection
            ? `Placing on ${selection.length === pageCount ? `all ${pageCount}` : `${selection.length} of ${pageCount}`} pages.`
            : `This document has ${pageCount} page${pageCount === 1 ? '' : 's'}.`}
        </p>
        {(syntaxError || boundsError) && (
          <p className="field__error" role="alert">
            {syntaxError ?? boundsError}
          </p>
        )}
      </div>
    </fieldset>
  );
}
