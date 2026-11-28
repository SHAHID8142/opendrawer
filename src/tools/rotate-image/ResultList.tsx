// SPDX-License-Identifier: AGPL-3.0-or-later
// Batch result list for rotate-image: preview, rows, failures and ZIP.
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import type { Failure, RotatedFile } from './types';

interface Props {
  results: RotatedFile[];
  failures: Failure[];
  zip: Blob | null;
  previewUrl: string;
}

export function ResultList({ results, failures, zip, previewUrl }: Props) {
  return (
    <section className="card stack" aria-labelledby="rotate-heading">
      <h2 id="rotate-heading">Result</h2>
      {previewUrl && (
        <div className="compressed-preview">
          <img src={previewUrl} alt="Rotated preview" />
        </div>
      )}
      <ul className="converted-list">
        {results.map((entry) => (
          <li key={entry.name}>
            <span>
              <strong>{entry.name}</strong>
              <br />
              <span className="muted">
                {entry.width} × {entry.height} · {formatBytes(entry.blob.size)}
              </span>
            </span>
            <button type="button" className="btn btn--secondary" onClick={() => downloadBlob(entry.blob, entry.name)}>
              Download
            </button>
          </li>
        ))}
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
          <button type="button" className="btn btn--primary" onClick={() => downloadBlob(zip, 'rotated-images.zip')}>
            Download all as .zip
          </button>
        </p>
      )}
      <p className="field__hint">Re-encoding removes EXIF metadata, including any orientation tag.</p>
    </section>
  );
}
