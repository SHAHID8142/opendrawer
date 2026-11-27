// SPDX-License-Identifier: AGPL-3.0-or-later
// Renders the line diff with old/new line numbers and a change marker.
import type { DiffLine } from './diff';

interface Props {
  lines: DiffLine[];
}

export function DiffView({ lines }: Props) {
  return (
    <ol className="diff-list" aria-label="Line differences">
      {lines.map((line, index) => (
        <li key={`${line.kind}-${index}`} className={`diff-row diff-row--${line.kind}`}>
          <span className="diff-gutter" aria-hidden="true">
            {line.oldLine ?? ''}
          </span>
          <span className="diff-gutter" aria-hidden="true">
            {line.newLine ?? ''}
          </span>
          <span className="diff-marker" aria-hidden="true">
            {line.kind === 'added' ? '+' : line.kind === 'removed' ? '−' : ' '}
          </span>
          <code className="diff-text">{line.text === '' ? ' ' : line.text}</code>
          <span className="sr-only">
            {line.kind === 'added' ? 'Added' : line.kind === 'removed' ? 'Removed' : 'Unchanged'}
          </span>
        </li>
      ))}
    </ol>
  );
}
