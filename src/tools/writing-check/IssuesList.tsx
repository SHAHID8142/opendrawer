// SPDX-License-Identifier: AGPL-3.0-or-later
// The issue list: plain-language message, the offending snippet and up to three fixes.
import type { RuleIssue } from './rules';

interface Props {
  issues: RuleIssue[];
  onApply: (issue: RuleIssue, replacement: string) => void;
}

export function IssuesList({ issues, onApply }: Props) {
  return (
    <ol className="issue-list">
      {issues.map((issue) => (
        <li key={`${issue.ruleId}-${issue.from}-${issue.to}`} className={`issue issue--${issue.severity}`}>
          <p>{issue.message}</p>
          <p className="issue__snippet">
            <code>{issue.text.length > 80 ? `${issue.text.slice(0, 80)}…` : issue.text}</code>
          </p>
          {issue.replacements.length > 0 ? (
            <div className="issue__actions">
              {issue.replacements.slice(0, 3).map((replacement) => (
                <button
                  key={replacement}
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => onApply(issue, replacement)}
                >
                  Use “{replacement}”
                </button>
              ))}
            </div>
          ) : (
            <p className="muted">Rewrite this part yourself.</p>
          )}
        </li>
      ))}
    </ol>
  );
}
