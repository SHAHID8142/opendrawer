// SPDX-License-Identifier: AGPL-3.0-or-later
// Rendered image result card: summary, primary download CTA, safe first-page preview, and file list.
import { useEffect, useState } from 'react';
import { bytesToBlob } from '../../lib/blob';
import { formatBytes } from '../../lib/format';
import { FORMATS } from './formats';
import type { RenderSummary } from './render';

export interface ResultViewProps {
  result: RenderSummary;
  onDownload: () => void;
}

export function ResultView({ result, onDownload }: ResultViewProps) {
  const firstFile = result.files[0];
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!firstFile) {
      setPreviewUrl(null);
      return;
    }
    const mime = FORMATS[result.format].mime;
    const url = URL.createObjectURL(bytesToBlob(firstFile.bytes, mime));
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [firstFile, result.format]);

  const singleFile = result.files.length === 1;
  const downloadLabel = singleFile
    ? `Download the ${result.format.toUpperCase()}`
    : `Download the ZIP (${result.baseName}-images.zip)`;

  const fileItems = result.files.map((rendered) => (
    <li key={rendered.name}>
      <span>{rendered.name}</span>
      <span className="muted">{formatBytes(rendered.bytes.length)}</span>
    </li>
  ));

  return (
    <section className="card stack" aria-labelledby="rendered-heading">
      <h2 id="rendered-heading">Your images</h2>
      <p className="result-summary">
        {result.pageCount} {result.pageCount === 1 ? 'page' : 'pages'} ·{' '}
        {result.format.toUpperCase()} · {result.dpi} DPI · {formatBytes(result.totalBytes)}
      </p>
      <p>
        <button type="button" className="btn btn--primary" onClick={onDownload}>
          {downloadLabel}
        </button>
      </p>

      <div className="stack-lg">
        {previewUrl && firstFile && (
          <figure className="preview-frame stack-sm">
            <img src={previewUrl} alt={`Preview of ${firstFile.name}`} />
            {result.files.length > 1 && (
              <figcaption className="muted">First rendered page: {firstFile.name}</figcaption>
            )}
          </figure>
        )}

        {result.files.length > 5 ? (
          <details className="file-disclosure">
            <summary>Show all {result.files.length} files</summary>
            <ul className="file-list">{fileItems}</ul>
          </details>
        ) : (
          <ul className="file-list">{fileItems}</ul>
        )}
      </div>

      <p className="muted">
        The download is created in this tab. Nothing is stored after you close it.
      </p>
    </section>
  );
}
