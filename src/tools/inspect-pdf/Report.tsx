import { formatBytes, formatPoints, pageSizeName } from '../../lib/format';
import type { InspectResult } from './inspect';

export function Report({ result }: { result: InspectResult }) {
  return (
    <div className="stack-lg">
      <section aria-labelledby="file-heading" className="card">
        <h2 id="file-heading">The file</h2>
        <dl className="facts">
          <dt>Name</dt>
          <dd>{result.fileName}</dd>
          <dt>Size</dt>
          <dd>{formatBytes(result.fileBytes)}</dd>
          <dt>PDF version</dt>
          <dd>{result.pdfVersion ?? 'not stated in the header'}</dd>
          <dt>Pages</dt>
          <dd>{result.pageCount}</dd>
          <dt>Encryption</dt>
          <dd>{result.encrypted ? 'Encrypted with a password' : 'Not encrypted'}</dd>
          <dt>Fast web view</dt>
          <dd>{result.linearized ? 'Yes, linearised for streaming' : 'No'}</dd>
          <dt>Saved</dt>
          <dd>
            {result.incrementalSaves > 1
              ? `${result.incrementalSaves} times (edited after creation)`
              : 'In one pass (no visible edit history)'}
          </dd>
        </dl>
      </section>

      {result.warnings.length > 0 && (
        <section className="note note--warning" aria-labelledby="limited-heading">
          <h2 id="limited-heading">What could not be read</h2>
          <ul>
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="privacy-heading" className="card">
        <h2 id="privacy-heading">Before you send it</h2>
        <p className="muted">These are things a recipient can read without opening the pages.</p>
        <ul>
          {result.flags.map((flag) => (
            <li key={flag.text}>
              <strong>{flag.severity === 'warning' ? 'Worth knowing: ' : 'Noted: '}</strong>
              {flag.text}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="pages-heading" className="card">
        <h2 id="pages-heading">Page sizes</h2>
        {result.mixedPageSizes && (
          <p>This document mixes page sizes. Printing or scanning it may resize some pages.</p>
        )}
        <div className="table-scroll">
          <table>
            <caption className="muted">First ten pages</caption>
            <thead>
              <tr>
                <th scope="col">Page</th>
                <th scope="col">Size</th>
                <th scope="col">Format</th>
                <th scope="col">Rotation</th>
              </tr>
            </thead>
            <tbody>
              {result.pageSizes.slice(0, 10).map((size, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>
                    {formatPoints(size.width)} × {formatPoints(size.height)}
                  </td>
                  <td>{pageSizeName(size.width, size.height) ?? 'custom'}</td>
                  <td>{size.rotation === 0 ? 'upright' : `${size.rotation}°`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result.pageSizes.length > 10 && (
          <p className="muted">
            Showing 10 of {result.pageSizes.length} pages. The counts below cover the whole file.
          </p>
        )}
      </section>

      <section aria-labelledby="inside-heading" className="card">
        <h2 id="inside-heading">What is inside</h2>
        <dl className="facts">
          <dt>Fonts referenced</dt>
          <dd>{result.fonts}</dd>
          <dt>Images</dt>
          <dd>{result.images}</dd>
          <dt>Annotations</dt>
          <dd>{result.annotations}</dd>
          <dt>Digital signatures</dt>
          <dd>{result.signatures}</dd>
          <dt>Form fields</dt>
          <dd>{result.acroForm ? (result.xfa ? 'Yes, XFA form' : 'Yes, AcroForm') : 'None'}</dd>
          <dt>Embedded files</dt>
          <dd>{result.attachments}</dd>
          <dt>JavaScript</dt>
          <dd>{result.javascript ? 'Present (never run here)' : 'None found'}</dd>
        </dl>
      </section>

      <section aria-labelledby="meta-heading" className="card">
        <h2 id="meta-heading">Document properties</h2>
        <dl className="facts">
          <dt>Title</dt>
          <dd>{result.metadata.title || 'not set'}</dd>
          <dt>Author</dt>
          <dd>{result.metadata.author || 'not set'}</dd>
          <dt>Subject</dt>
          <dd>{result.metadata.subject || 'not set'}</dd>
          <dt>Created with</dt>
          <dd>{result.metadata.creator || 'not stated'}</dd>
          <dt>Produced by</dt>
          <dd>{result.metadata.producer || 'not stated'}</dd>
          <dt>Created</dt>
          <dd>{result.metadata.created || 'not stated'}</dd>
          <dt>Modified</dt>
          <dd>{result.metadata.modified || 'not stated'}</dd>
        </dl>
      </section>
    </div>
  );
}
