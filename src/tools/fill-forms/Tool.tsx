// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for fill-forms: discover the PDF's fields, fill them, optionally flatten, download.
import { useEffect, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import { countPdfPages } from '../../lib/pdf';
import { fillForm, inspectForm, type FormField } from './engine';
import { FormFields } from './FormFields';

type Phase = 'idle' | 'working' | 'done' | 'error';

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [flatten, setFlatten] = useState(true);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [out, setOut] = useState<{ bytes: Uint8Array; filled: number; flattened: boolean } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);
  const busy = phase === 'working';

  function reset() {
    setOut(null);
    setPhase('idle');
    setError(null);
  }

  async function choose(chosen: File) {
    setFile(chosen);
    setPageCount(null);
    setFields([]);
    setValues({});
    reset();
    const bytes = new Uint8Array(await chosen.arrayBuffer());
    setPageCount(await countPdfPages(bytes));
    const inspected = await inspectForm({ name: chosen.name, bytes });
    if (!inspected.ok) {
      setError(inspected.message);
      setPhase('error');
      return;
    }
    setFields(inspected.fields);
    const initial: Record<string, string | boolean> = {};
    for (const field of inspected.fields) {
      initial[field.name] = field.kind === 'checkbox' ? field.checked : field.value;
    }
    setValues(initial);
  }

  async function run() {
    if (!file) return;
    setPhase('working');
    setError(null);
    setOut(null);
    try {
      const result = await fillForm(
        { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) },
        { values, flatten },
      );
      if (!result.ok) {
        setError(result.message);
        setPhase('error');
        return;
      }
      setOut({ bytes: result.bytes, filled: result.filled, flattened: result.flattened });
      setPhase('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The form could not be filled.');
      setPhase('error');
    }
  }

  function save() {
    if (!out || !file) return;
    downloadBlob(
      bytesToBlob(out.bytes, 'application/pdf'),
      `${file.name.replace(/\.pdf$/i, '')}-filled.pdf`,
    );
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <FileDrop
        id="fill-input"
        accept="application/pdf,.pdf"
        label="Choose the PDF with form fields"
        hint="It stays on this device. Standard AcroForm fields only."
        buttonLabel="Choose a PDF"
        disabled={!ready}
        selectedFile={file ? { name: file.name, size: file.size, detail: pageCount === null ? undefined : `${pageCount} pages` } : null}
        onClear={() => {
          setFile(null);
          setPageCount(null);
          setFields([]);
          setValues({});
          reset();
        }}
        onFiles={(chosen) => {
          const first = chosen[0];
          if (first) void choose(first);
        }}
      />

      {file && fields.length > 0 && (
        <div className="card">
          <FormFields
            fields={fields}
            values={values}
            disabled={!ready || busy}
            onChange={(name, value) => {
              setValues((current) => ({ ...current, [name]: value }));
              reset();
            }}
          />
          <label className="checkbox" htmlFor="fill-flatten">
            <input
              id="fill-flatten"
              type="checkbox"
              checked={flatten}
              disabled={!ready || busy}
              onChange={(event) => {
                setFlatten(event.target.checked);
                reset();
              }}
            />
            <span>Flatten after filling (the fields stop being editable)</span>
          </label>
          <div className="note note--warning">
            <p>A typed name is not a certified signature, and flattening cannot be undone.</p>
          </div>
          <p>
            <button type="button" className="btn btn--primary" disabled={!ready || busy} onClick={() => void run()}>
              {busy ? 'Filling…' : 'Fill the form'}
            </button>
          </p>
        </div>
      )}

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' && !file && 'No file yet. Choose a PDF to begin.'}
        {phase === 'idle' && file && fields.length > 0 && `${fields.length} field${fields.length === 1 ? '' : 's'} ready.`}
        {phase === 'working' && 'Writing the values…'}
        {phase === 'done' && out && `Filled ${out.filled} field${out.filled === 1 ? '' : 's'}${out.flattened ? ' and flattened' : ''}.`}
        {phase === 'error' && 'The form was not filled. The reason is below.'}
      </p>

      {error && <div className="note note--danger"><h2>What happened</h2><p>{error}</p></div>}

      {out && (
        <section className="card" aria-labelledby="fill-result-heading">
          <h2 id="fill-result-heading">Your filled PDF</h2>
          <p className="result-summary">
            <span>{out.filled} field{out.filled === 1 ? '' : 's'}</span>
            <span>{out.flattened ? 'Flattened' : 'Still editable'}</span>
            <span>{formatBytes(out.bytes.length)}</span>
          </p>
          <p><button type="button" className="btn btn--primary" onClick={save}>Download the PDF</button></p>
          <p className="muted">Your original file is untouched.</p>
        </section>
      )}
    </div>
  );
}
