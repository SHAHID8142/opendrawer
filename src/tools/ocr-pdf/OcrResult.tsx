// SPDX-License-Identifier: AGPL-3.0-or-later
// Result card for OCR: per-page warnings, a capped preview and the text download.
const PREVIEW_LIMIT = 8000;

interface Props {
  text: string;
  unusablePages: number[];
  onDownload: () => void;
}

export function OcrResult({ text, unusablePages, onDownload }: Props) {
  return (
    <section className="card" aria-labelledby="ocr-result-heading">
      <h2 id="ocr-result-heading">The recognised text</h2>
      {unusablePages.length > 0 && (
        <div className="note note--warning">
          <p>
            {unusablePages.length === 1
              ? `Page ${unusablePages[0]} produced no legible text.`
              : `Pages ${unusablePages.join(', ')} produced no legible text.`}
          </p>
        </div>
      )}
      <label className="field__label" htmlFor="ocr-text">
        Preview
      </label>
      <textarea
        id="ocr-text"
        className="textarea"
        readOnly
        rows={12}
        value={text.slice(0, PREVIEW_LIMIT)}
      />
      <p className="field__hint">
        {text.length > PREVIEW_LIMIT
          ? `Showing the first ${PREVIEW_LIMIT.toLocaleString()} of ${text.length.toLocaleString()} characters. The download has all of it.`
          : 'Check the words against the page before relying on them.'}
      </p>
      <p>
        <button type="button" className="btn btn--primary" onClick={onDownload}>
          Download the text file
        </button>
      </p>
      <p className="muted">Written in this tab. Nothing is stored after you close it.</p>
    </section>
  );
}
