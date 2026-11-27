// SPDX-License-Identifier: AGPL-3.0-or-later
// Action buttons for text-transform; presentational so Tool keeps only wiring.
import type { TransformAction } from './transform';

interface Props {
  disabled: boolean;
  onAction: (action: TransformAction) => void;
}

const GROUPS: { title: string; actions: { id: TransformAction; label: string }[] }[] = [
  {
    title: 'Case',
    actions: [
      { id: 'sentence', label: 'Sentence case' },
      { id: 'title', label: 'Title case' },
      { id: 'upper', label: 'UPPERCASE' },
      { id: 'lower', label: 'lowercase' },
    ],
  },
  {
    title: 'Lines',
    actions: [
      { id: 'tidy', label: 'Tidy lines' },
      { id: 'spaces', label: 'Remove extra spaces' },
      { id: 'sort-asc', label: 'Sort A–Z' },
      { id: 'sort-desc', label: 'Sort Z–A' },
      { id: 'unique', label: 'Remove duplicate lines' },
      { id: 'reverse', label: 'Reverse lines' },
      { id: 'number', label: 'Number lines' },
    ],
  },
];

export function ActionGrid({ disabled, onAction }: Props) {
  return (
    <div className="stack">
      {GROUPS.map((group) => (
        <div className="field" key={group.title}>
          <span className="field__label">{group.title}</span>
          <div className="transform-actions">
            {group.actions.map((action) => (
              <button
                key={action.id}
                type="button"
                className="btn btn--secondary"
                disabled={disabled}
                onClick={() => onAction(action.id)}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
