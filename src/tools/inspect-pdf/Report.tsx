// SPDX-License-Identifier: AGPL-3.0-or-later
// Verdict-first inspection report for PDF metadata, internal features, and page sizes.
import { Fragment } from 'react';
import { formatBytes, pageSizeName } from '../../lib/format';
import type { InspectResult } from './inspect';

const ENCRYPTED_VALUE = 'Not readable (encrypted)';
const ptToMm = (points: number) => Math.round(points * (25.4 / 72));

function StatusIcon({ kind }: { kind: 'warning' | 'success' }) {
  return (
    <svg
      className="note__icon"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === 'success' ? (
        <>
          <circle cx="8" cy="8" r="6.5" />
          <path d="m5.5 8 1.75 1.75L10.75 6.25" />
        </>
      ) : (
        <>
          <path d="M8 2.25 14.25 13.5H1.75L8 2.25Z" />
          <path d="M8 6.5v3" />
          <circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

function FactList({ rows }: { rows: Array<[string, string | number]> }) {
  return (
    <dl className="facts">
      {rows.map(([label, value]) => (
        <Fragment key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

export function Report({ result }: { result: InspectResult }) {
  const orderedFlags = [...result.flags].sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === 'warning' ? -1 : 1,
  );
  const hasWarnings =
    result.encrypted ||
    result.warnings.length > 0 ||
    orderedFlags.some((flag) => flag.severity === 'warning');

  const hasMetadata = Object.values(result.metadata).some(Boolean);
  const showFlattenHint =
    !result.encrypted &&
    (hasMetadata || result.javascript || result.incrementalSaves > 1 || result.attachments > 0);

  const fileRows: Array<[string, string | number]> = [
    ['Name', result.fileName],
    ['Size', formatBytes(result.fileBytes)],
    ['PDF version', result.pdfVersion ?? 'Not set'],
    ['Pages', result.pageCount],
    ['Encryption', result.encrypted ? 'Encrypted with a password' : 'Not encrypted'],
    ['Fast web view', result.linearized ? 'Yes, linearised for streaming' : 'No'],
    [
      'Saved',
      result.incrementalSaves > 1
        ? `${result.incrementalSaves} times (edited after creation)`
        : 'In one pass (no visible edit history)',
    ],
  ];

  const insideRows: Array<[string, string | number]> = result.encrypted
    ? ['Fonts referenced', 'Images', 'Annotations', 'Digital signatures', 'Form fields', 'Embedded files', 'JavaScript'].map(
        (label) => [label, ENCRYPTED_VALUE],
      )
    : [
        ['Fonts referenced', result.fonts],
        ['Images', result.images],
        ['Annotations', result.annotations],
        ['Digital signatures', result.signatures],
        ['Form fields', result.acroForm ? (result.xfa ? 'Yes, XFA form' : 'Yes, AcroForm') : 'None'],
        ['Embedded files', result.attachments],
        ['JavaScript', result.javascript ? 'Present (never run here)' : 'None'],
      ];

  const propertyRows: Array<[string, string]> = (
    [
      ['Title', result.metadata.title],
      ['Author', result.metadata.author],
      ['Subject', result.metadata.subject],
      ['Created with', result.metadata.creator],
      ['Produced by', result.metadata.producer],
      ['Created', result.metadata.created],
      ['Modified', result.metadata.modified],
    ] as Array<[string, string | undefined]>
  ).map(([label, value]) => [label, result.encrypted ? ENCRYPTED_VALUE : value || 'Not set']);

  return (
    <div className="stack-lg">
      <section aria-labelledby="privacy-heading" className={`note ${hasWarnings ? 'note--warning' : 'note--success'}`}>
        <h2 id="privacy-heading" className="note__title">
          <StatusIcon kind={hasWarnings ? 'warning' : 'success'} />
          Before you send it
        </h2>
        <p className="muted">
          {result.encrypted
            ? 'This file is password-protected, so items behind encryption cannot be inspected.'
            : 'These are things a recipient can read without opening the pages.'}
        </p>
        <ul className="flag-list">
          {result.encrypted && (
            <li className="flag flag--warning">
              <strong>Encrypted: </strong>
              {ENCRYPTED_VALUE}
            </li>
          )}
          {orderedFlags.map((flag) => (
            <li key={flag.text} className={`flag ${flag.severity === 'warning' ? 'flag--warning' : 'flag--info'}`}>
              <strong>{flag.severity === 'warning' ? 'Worth knowing: ' : 'Noted: '}</strong>
              {flag.text}
            </li>
          ))}
        </ul>
        {showFlattenHint && (
          <p className="muted">
            To share only what is visible on the page without PDF metadata, edit history or scripts, render the pages as
            images with <a href="/tools/pdf-to-image">PDF to image</a>.
          </p>
        )}
      </section>

      {result.warnings.length > 0 && (
        <section className="note note--warning" aria-labelledby="limited-heading">
          <h2 id="limited-heading" className="note__title">
            <StatusIcon kind="warning" />
            What could not be read
          </h2>
          <ul>
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="file-heading" className="card">
        <h2 id="file-heading">The file</h2>
        <FactList rows={fileRows} />
      </section>

      <section aria-labelledby="inside-heading" className="card">
        <h2 id="inside-heading">What is inside</h2>
        <FactList rows={insideRows} />
      </section>

      <section aria-labelledby="pages-heading" className="card">
        <h2 id="pages-heading">Page sizes</h2>
        {result.pageSizes.length === 0 ? (
          <p className="muted">This document contains no pages.</p>
        ) : (
          <>
            {result.mixedPageSizes && (
              <p>This document mixes page sizes. Printing or scanning it may resize some pages.</p>
            )}
            <div className="table-scroll" tabIndex={0} role="region" aria-label="Page sizes">
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
                        <div>{ptToMm(size.width)} × {ptToMm(size.height)} mm</div>
                        <div className="muted">{Math.round(size.width)} × {Math.round(size.height)} pt</div>
                      </td>
                      <td>{pageSizeName(size.width, size.height) ?? 'Custom'}</td>
                      <td>{size.rotation === 0 ? 'Upright' : `${size.rotation}°`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.pageSizes.length > 10 && (
              <p className="muted">
                Showing 10 of {result.pageSizes.length} pages. The counts above cover the whole file.
              </p>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="meta-heading" className="card">
        <h2 id="meta-heading">Document properties</h2>
        <FactList rows={propertyRows} />
      </section>
    </div>
  );
}
