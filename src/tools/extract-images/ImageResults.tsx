// SPDX-License-Identifier: AGPL-3.0-or-later
// Extracted image grid with object-URL previews and the download action.
import { useEffect, useState } from 'react';
import { bytesToBlob } from '../../lib/blob';
import { formatBytes } from '../../lib/format';
import type { ExtractedImage } from './engine';

interface Props {
  files: ExtractedImage[];
  totalBytes: number;
  single: boolean;
  onDownload: () => void;
}

export function ImageResults({ files, totalBytes, single, onDownload }: Props) {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const created = files.map((file) => URL.createObjectURL(bytesToBlob(file.bytes, 'image/png')));
    setUrls(created);
    return () => created.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  return (
    <section className="card stack" aria-labelledby="extracted-heading">
      <h2 id="extracted-heading">Your images</h2>
      <p className="result-summary">
        <span>
          {files.length} image{files.length === 1 ? '' : 's'}
        </span>
        <span>{formatBytes(totalBytes)}</span>
      </p>
      <p>
        <button type="button" className="btn btn--primary" onClick={onDownload}>
          {single ? 'Download the PNG' : `Download the ZIP (${files.length} images)`}
        </button>
      </p>
      <ul className="image-grid">
        {files.map((file, index) => (
          <li key={file.name} className="stack-sm">
            {urls[index] && <img src={urls[index]} alt={`Extracted from page ${file.page}`} loading="lazy" />}
            <span className="muted">
              {file.width} × {file.height} · page {file.page} · {formatBytes(file.bytes.length)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
