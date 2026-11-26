// SPDX-License-Identifier: AGPL-3.0-or-later
// Inputs mirroring the PDF's own fields: text, checkbox and option lists.
import type { FormField } from './engine';

interface Props {
  fields: FormField[];
  values: Record<string, string | boolean>;
  disabled: boolean;
  onChange: (name: string, value: string | boolean) => void;
}

export function FormFields({ fields, values, disabled, onChange }: Props) {
  return (
    <fieldset className="fieldset" disabled={disabled}>
      <legend>Form fields</legend>
      {fields.map((field) => {
        const id = `field-${field.name.replace(/[^\w-]+/g, '-')}`;
        if (field.kind === 'checkbox') {
          return (
            <label className="checkbox" htmlFor={id} key={field.name}>
              <input
                id={id}
                type="checkbox"
                checked={Boolean(values[field.name])}
                onChange={(event) => onChange(field.name, event.target.checked)}
              />
              <span>{field.name}</span>
            </label>
          );
        }
        if (field.options.length > 0) {
          return (
            <div className="field" key={field.name}>
              <label className="field__label" htmlFor={id}>
                {field.name}
              </label>
              <select
                id={id}
                className="select"
                value={String(values[field.name] ?? '')}
                onChange={(event) => onChange(field.name, event.target.value)}
              >
                <option value="">Choose…</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          );
        }
        return (
          <div className="field" key={field.name}>
            <label className="field__label" htmlFor={id}>
              {field.name}
            </label>
            <input
              id={id}
              className="input"
              type="text"
              maxLength={field.maxLength ?? undefined}
              value={String(values[field.name] ?? '')}
              onChange={(event) => onChange(field.name, event.target.value)}
            />
            {field.maxLength !== null && (
              <p className="field__hint">At most {field.maxLength} characters.</p>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}
