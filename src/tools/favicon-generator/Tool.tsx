// SPDX-License-Identifier: AGPL-3.0-or-later
// UI for favicon-generator: preview, snippet, ZIP and .ico downloads.
import { useEffect, useRef, useState } from 'react';
import { FileDrop } from '../../components/FileDrop';
import { downloadBlob } from '../../lib/download';
import { byteLimitMessage } from '../../lib/image-format';
import { decodeImageFile } from '../../lib/decode-image';
import { DEFAULT_MANIFEST, type ManifestOptions } from './engine';
import { buildFavicons, type FaviconPackage } from './favicon';

type Phase = 'idle' | 'working' | 'done' | 'error';

export default function Tool() {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [pack, setPack] = useState<FaviconPackage | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [manifest, setManifest] = useState<ManifestOptions>(DEFAULT_MANIFEST);
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState(false);
  const previewRef = useRef('');

  useEffect(() => {
    setReady(true);
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const busy = phase === 'working';

  function clearResult() {
    setPack(null);
    setError(null);
    setNotice('');
    setPhase('idle');
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = '';
      setPreviewUrl('');
    }
  }

  async function generate() {
    if (!file) return;
    clearResult();
    setPhase('working');
    const result = await buildFavicons(file, manifest);
    if (!result.ok) {
      setError(result.message);
      setPhase('error');
      return;
    }
    const url = URL.createObjectURL(result.package.preview);
    previewRef.current = url;
    setPreviewUrl(url);
    setPack(result.package);
    setPhase('done');
  }

  async function copySnippet() {
    if (!pack) return;
    try {
      await navigator.clipboard.writeText(pack.snippet);
      setNotice('HTML copied to the clipboard.');
    } catch {
      setNotice('Your browser blocked the clipboard; select the snippet and copy it.');
    }
  }

  return (
    <div className="stack" data-ready={ready ? 'true' : 'false'}>
      <div className="card stack">
        <FileDrop
          id="favicon-input"
          accept="image/*"
          label="Square-ish logo or image"
          hint="PNG, JPEG, WebP, AVIF, GIF, BMP, ICO or SVG up to 25 MB. It is fitted into each square icon without cropping."
          buttonLabel="Choose an image"
          working={busy}
          disabled={!ready || busy}
          selectedFile={file ? { name: file.name, size: file.size } : null}
          previewFiles={file ? [file] : []}
          onFiles={(files) => {
            const chosen = files[0];
            if (!chosen) return;
            void (async () => {
              clearResult();
              const tooBig = byteLimitMessage(chosen.size);
              if (tooBig !== null) {
                setFile(null);
                setError(tooBig);
                setPhase('error');
                return;
              }
              const decoded = await decodeImageFile(chosen);
              if (!decoded) {
                setFile(null);
                setError('That file could not be decoded as an image. Choose a PNG, JPEG, WebP, SVG or another image your browser can read.');
                setPhase('error');
                return;
              }
              decoded.close();
              setFile(chosen);
            })();
          }}
          onClear={() => {
            setFile(null);
            clearResult();
          }}
        />

        <div className="form__row">
          <div className="field">
            <label className="field__label" htmlFor="favicon-name">
              App name
            </label>
            <input
              id="favicon-name"
              className="input"
              value={manifest.name}
              disabled={busy}
              onChange={(event) => {
                setManifest({ ...manifest, name: event.target.value });
                clearResult();
              }}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="favicon-short">
              Short name
            </label>
            <input
              id="favicon-short"
              className="input"
              value={manifest.shortName}
              disabled={busy}
              onChange={(event) => {
                setManifest({ ...manifest, shortName: event.target.value });
                clearResult();
              }}
            />
          </div>
        </div>

        <div className="form__row">
          <div className="field">
            <label className="field__label" htmlFor="favicon-theme">
              Theme colour
            </label>
            <input
              id="favicon-theme"
              className="input"
              value={manifest.themeColor}
              disabled={busy}
              onChange={(event) => {
                setManifest({ ...manifest, themeColor: event.target.value });
                clearResult();
              }}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="favicon-background">
              Background colour
            </label>
            <input
              id="favicon-background"
              className="input"
              value={manifest.backgroundColor}
              disabled={busy}
              onChange={(event) => {
                setManifest({ ...manifest, backgroundColor: event.target.value });
                clearResult();
              }}
            />
          </div>
        </div>
        <p className="field__hint">Used in site.webmanifest. Any CSS colour works, for example “white” or “navy”.</p>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={manifest.maskable}
            disabled={busy}
            onChange={(event) => {
              setManifest({ ...manifest, maskable: event.target.checked });
              clearResult();
            }}
          />
          Add maskable Android icons
        </label>
        <p className="field__hint">
          Full-bleed 192 and 512 icons with the logo inside the safe zone, using the background colour.
        </p>

        <p>
          <button type="button" className="btn btn--primary" disabled={!ready || busy || file === null} onClick={() => void generate()}>
            {busy ? 'Building the icons…' : 'Generate favicons'}
          </button>
        </p>
      </div>

      <p className="status" role="status" aria-live="polite">
        {phase === 'error'
          ? 'Nothing was produced. The reason is below.'
          : !file
            ? 'No image yet. Choose a logo to build the icon package.'
            : busy
              ? 'Rendering icons in this tab. Nothing is uploaded.'
              : phase === 'done' && pack
                ? `Built ${pack.files.length} files.`
                : 'Ready to generate.'}
        {notice && ` ${notice}`}
      </p>

      {error && (
        <div className="note note--danger">
          <h2>What happened</h2>
          <p>{error}</p>
        </div>
      )}

      {pack && phase === 'done' && (
        <section className="card stack" aria-labelledby="favicon-heading">
          <h2 id="favicon-heading">Your icon package</h2>
          <div className="favicon-preview">
            <img src={previewUrl} alt="512 pixel icon preview" width={128} height={128} />
            <p className="muted">512 × 512 preview. Smaller sizes use the same artwork.</p>
          </div>
          <p className="allow-list">
            {pack.files.map((name) => (
              <span className="allow-chip" key={name}>
                {name}
              </span>
            ))}
          </p>
          <p className="cluster">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => downloadBlob(pack.zip, 'favicon-package.zip')}
            >
              Download the .zip
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => downloadBlob(pack.ico, 'favicon.ico')}
            >
              Download favicon.ico
            </button>
          </p>

          <div className="field">
            <span className="field__label">HTML to paste in &lt;head&gt;</span>
            <pre className="code-block"><code>{pack.snippet}</code></pre>
            <p>
              <button type="button" className="btn btn--secondary" onClick={() => void copySnippet()}>
                Copy the HTML
              </button>
            </p>
          </div>
          <p className="field__hint">
            Upload the files to the root of your site. Edit site.webmanifest to set the site name and colours.
          </p>
        </section>
      )}
    </div>
  );
}
