// SPDX-License-Identifier: AGPL-3.0-or-later
// Session-only allow list for names, brands and jargon. Nothing is persisted or sent.
interface Props {
  allowed: string[];
  draft: string;
  disabled: boolean;
  onDraft: (value: string) => void;
  onAdd: () => void;
  onRemove: (word: string) => void;
}

export function AllowList({ allowed, draft, disabled, onDraft, onAdd, onRemove }: Props) {
  return (
    <div className="field">
      <label className="field__label" htmlFor="allow-word">
        Allowed words
      </label>
      <div className="allow-row">
        <input
          id="allow-word"
          className="input"
          value={draft}
          disabled={disabled}
          placeholder="Name, brand or jargon"
          onChange={(event) => onDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onAdd();
            }
          }}
        />
        <button type="button" className="btn btn--secondary" disabled={disabled || draft.trim() === ''} onClick={onAdd}>
          Allow word
        </button>
      </div>
      <p className="field__hint">Kept for this tab only. It is never saved or uploaded.</p>
      {allowed.length > 0 && (
        <ul className="allow-list" aria-label="Allowed words">
          {allowed.map((word) => (
            <li key={word} className="allow-chip">
              {word}
              <button
                type="button"
                className="allow-chip__remove"
                aria-label={`Stop ignoring ${word}`}
                disabled={disabled}
                onClick={() => onRemove(word)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
