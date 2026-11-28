// SPDX-License-Identifier: AGPL-3.0-or-later
// Batch result list for compress-image: totals, per-file rows, failures and ZIP.
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import type { CompressedFile, Failure } from './types';

interface Props {
  results: CompressedFile[];
  failures: Failure[];
  zip: Blob | null;
  previewUrl: string;
}

export function ResultList({ results, failures, zip, previewUrl }: Props) {
  const originalTotal = results.reduce((sum, entry) => sum + entry.originalBytes, 0);
  const newTotal = results.reduce((sum, entry) => sum + entry.blob.size, 0);
  const saved = originalTotal === 0 ? 0 : Math.round((1 - newTotal / originalTotal) * 100);

  return (
    <section className="card stack" aria-labelledby="compress-heading">
      <h2 id="compress-heading">Result</h2>
      {previewUrl && (
        <div className="compressed-preview">
          <img src={previewUrl} alt="Compressed preview" />
        </div>
      )}
      <dl className="stat-grid">
        <div><dt>Original total</dt><dd>{formatBytes(originalTotal)}</dd></div>
        <div><dt>New total</dt><dd>{formatBytes(newTotal)}</dd></div>
        <div><dt>Saved</dt><dd>{saved <= 0 ? 'No saving' : `${saved}%`}</dd></div>
        <div><dt>Files</dt><dd>{results.length}</dd></div>
      </dl>

      <ul className="converted-list">
        {results.map((entry) => {
          const entrySaved = Math.round((1 - entry.blob.size / entry.originalBytes) * 100);
          return (
            <li key={entry.name}>
              <span>
                <strong>{entry.name}</strong>
                <br />
                <span className="muted">
                  {entry.originalWidth} × {entry.originalHeight} → {entry.width} × {entry.height} ·{' '}
                  {formatBytes(entry.originalBytes)} → {formatBytes(entry.blob.size)}
                  {entrySaved > 0 ? ` (${entrySaved}% smaller)` : ' (no saving)'}
                </span>
              </span>
              <button type="button" className="btn btn--secondary" onClick={() => downloadBlob(entry.blob, entry.name)}>
                Download
              </button>
            </li>
          );
        })}
      </ul>

      {failures.length > 0 && (
        <div className="note">
          <h2>{failures.length} file{failures.length === 1 ? '' : 's'} skipped</h2>
          <ul>
            {failures.map((failure) => (
              <li key={failure.name}>
                {failure.name}: {failure.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {zip && (
        <p>
          <button type="button" className="btn btn--primary" onClick={() => downloadBlob(zip, 'compressed-images.zip')}>
            Download all as .zip
          </button>
        </p>
      )}
      <p className="field__hint">Metadata such as camera and location is removed by re-encoding.</p>
    </section>
  );
}
