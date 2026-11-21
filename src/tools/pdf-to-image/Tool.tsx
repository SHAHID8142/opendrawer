import { useEffect, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { bytesToBlob } from '../../lib/blob';
import { downloadBlob } from '../../lib/download';
import { formatBytes } from '../../lib/format';
import { zipStore } from '../../lib/zip';
import {
  DPI_CHOICES,
  renderPdfToImages,
  type ImageFormat,
  type RenderSummary,
} from './render';

type Phase = 'idle' | 'working' | 'done' | 'error';

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<ImageFormat>('png');
  const [dpi, setDpi] = useState(150);
  const [range, setRange] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<RenderSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  const busy = phase === 'working';
  const usable = ready && !busy;

  async function run(chosen: File) {
    setFile(chosen);
    setPhase('working');
    setError(null);
    setResult(null);
    setProgress({ done: 0, total: 0 });
    try {
      const rendered = await renderPdfToImages(chosen, { format, dpi, range }, (done, total) =>
        setProgress({ done, total }),
      );
      setResult(rendered);
      setPhase('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The pages could not be rendered.');
      setPhase('error');
    }
  }

  function save() {
    if (!result) return;
    const base = (file?.name ?? 'document').replace(/\.pdf$/i, '');
    if (result.files.length === 1 && result.files[0]) {
      const only = result.files[0];
      downloadBlob(bytesToBlob(only.bytes, 'application/octet-stream'), only.name);
      return;
    }
    const archive = zipStore(result.files);
    downloadBlob(archive, `${base}-images.zip`);
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <FileDrop
        id="render-file"
        accept="application/pdf,.pdf"
        label="Choose the PDF whose pages you want as images"
        hint="It stays on this device. The pages are drawn here, not on a server."
        buttonLabel="Choose a PDF"
        disabled={!usable}
        onFiles={(files) => {
          const chosen = files[0];
          if (chosen) void run(chosen);
        }}
      />

      <div className="card">
        <fieldset className="fieldset" disabled={!usable}>
          <legend>Output settings</legend>

          <div className="form__row">
            <div className="field">
              <label className="field__label" htmlFor="render-format">
                Image format
              </label>
              <select
                id="render-format"
                className="input"
                value={format}
                onChange={(event) => setFormat(event.target.value === 'jpeg' ? 'jpeg' : 'png')}
              >
                <option value="png">PNG (lossless, larger)</option>
                <option value="jpeg">JPEG (smaller, slight loss)</option>
              </select>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="render-dpi">
                Resolution
              </label>
              <select
                id="render-dpi"
                className="input"
                value={dpi}
                onChange={(event) => setDpi(Number(event.target.value))}
              >
                {DPI_CHOICES.map((choice) => (
                  <option key={choice} value={choice}>
                    {choice} DPI
                  </option>
                ))}
              </select>
            </div>

            <div className="field field--grow">
              <label className="field__label" htmlFor="render-range">
                Pages (leave empty for all)
              </label>
              <input
                id="render-range"
                className="input"
                type="text"
                inputMode="numeric"
                placeholder="for example 1-3, 7"
                value={range}
                onChange={(event) => setRange(event.target.value)}
              />
            </div>
          </div>

          <p className="muted">
            Settings apply to the next file you choose. PNG at 150 DPI suits most screens; 300 DPI
            is for printing.
          </p>
        </fieldset>
      </div>

      <p className="status" role="status" aria-live="polite">
        {phase === 'idle' && (ready ? 'No file yet. Choose a PDF to begin.' : 'Preparing the tool…')}
        {phase === 'working' &&
          (progress.total > 0
            ? `Rendering page ${progress.done} of ${progress.total}…`
            : 'Opening the document…')}
        {phase === 'error' && 'The pages could not be rendered. The reason is below.'}
        {phase === 'done' && result && `${result.pageCount} page${result.pageCount === 1 ? '' : 's'} rendered.`}
      </p>

      {busy && (
        <div className="card">
          <label className="field__label" htmlFor="render-progress">
            Progress
          </label>
          <progress id="render-progress" className="progress" value={progress.done} max={progress.total || 1} />
        </div>
      )}

      {phase === 'error' && error && (
        <div className="note note--danger">
          <h2>What happened</h2>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <section className="card" aria-labelledby="rendered-heading">
          <h2 id="rendered-heading">Your images</h2>
          <ul className="file-list">
            {result.files.map((rendered) => (
              <li key={rendered.name}>
                <span>{rendered.name}</span>{' '}
                <span className="muted">{formatBytes(rendered.bytes.length)}</span>
              </li>
            ))}
          </ul>
          <p>
            <button type="button" className="btn btn--primary" onClick={save}>
              {result.files.length === 1 ? 'Download the image' : 'Download the ZIP'}
            </button>
          </p>
          <p className="muted">
            The download is created in this tab. Nothing is stored after you close it.
          </p>
        </section>
      )}
    </div>
  );
}
