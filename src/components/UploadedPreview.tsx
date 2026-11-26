// SPDX-License-Identifier: AGPL-3.0-or-later
// Local preview studio for uploaded PDFs and images with customizable layout, backdrop, and guides.
import { useEffect, useRef, useState } from 'react';
import { renderUploadedPreview, revokePreviewFrames, type PreviewFrame } from '../lib/preview';
import {
  DEFAULT_PREVIEW_SETTINGS,
  loadPreviewPrefs,
  savePreviewPrefs,
  type PreviewSettings,
} from '../lib/preview-prefs';
import { PreviewToolbar } from './PreviewToolbar';

interface UploadedPreviewProps {
  files: File[];
}

export function UploadedPreview({ files }: UploadedPreviewProps) {
  const [settings, setSettings] = useState<PreviewSettings>(DEFAULT_PREVIEW_SETTINGS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [fileIndex, setFileIndex] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [frames, setFrames] = useState<PreviewFrame[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [kind, setKind] = useState<'pdf' | 'image'>('pdf');
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const framesRef = useRef<PreviewFrame[]>([]);

  useEffect(() => {
    setSettings(loadPreviewPrefs());
    setPrefsLoaded(true);
  }, []);

  useEffect(() => {
    if (prefsLoaded) savePreviewPrefs(settings);
  }, [settings, prefsLoaded]);

  useEffect(() => {
    if (fileIndex >= files.length) setFileIndex(0);
    setPageIndex(0);
  }, [files, fileIndex]);

  const activeTargets =
    files.length > 1 && files.every((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name))
      ? [files[Math.min(fileIndex, files.length - 1)]].filter(Boolean)
      : files;

  useEffect(() => {
    if (settings.mode === 'hidden' || activeTargets.length === 0) {
      revokePreviewFrames(framesRef.current);
      framesRef.current = [];
      setFrames([]);
      setLoading(false);
      setFailed(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setFailed(false);

    renderUploadedPreview(activeTargets, settings.pageCap, settings.mode === 'single', controller.signal)
      .then((out) => {
        if (controller.signal.aborted) {
          revokePreviewFrames(out.frames);
          return;
        }
        revokePreviewFrames(framesRef.current);
        framesRef.current = out.frames;
        setFrames(out.frames);
        setTotalPages(out.totalPages);
        setKind(out.kind);
        setLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setFailed(true);
        setLoading(false);
      });

    return () => controller.abort();
  }, [files, fileIndex, settings.mode, settings.pageCap]);

  useEffect(() => () => revokePreviewFrames(framesRef.current), []);

  if (files.length === 0) return null;

  function patchSettings(patch: Partial<PreviewSettings>) {
    setSettings((curr) => ({ ...curr, ...patch }));
  }

  const summary =
    settings.mode === 'hidden'
      ? 'Hidden'
      : loading
        ? 'Rendering…'
        : failed
          ? 'Unavailable'
          : totalPages > frames.length
            ? `${frames.length} of ${totalPages} ${kind === 'image' ? 'images' : 'pages'}`
            : `${totalPages} ${totalPages === 1 ? (kind === 'image' ? 'image' : 'page') : kind === 'image' ? 'images' : 'pages'}`;

  const currentFrame = frames[Math.min(pageIndex, Math.max(frames.length - 1, 0))];
  const isMultiPdf =
    files.length > 1 && files.every((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));

  return (
    <section className="preview-studio" aria-label="Uploaded files preview">
      <PreviewToolbar
        settings={settings}
        customizeOpen={customizeOpen}
        summaryText={summary}
        onToggleCustomize={() => setCustomizeOpen((o) => !o)}
        onChange={patchSettings}
        onReset={() => setSettings(DEFAULT_PREVIEW_SETTINGS)}
      />

      {settings.mode !== 'hidden' && isMultiPdf && (
        <div className="preview-files" role="group" aria-label="Uploaded PDFs">
          {files.map((f, idx) => (
            <button
              key={`${f.name}-${idx}`}
              type="button"
              className="preview-chip"
              aria-pressed={fileIndex === idx}
              onClick={() => {
                setFileIndex(idx);
                setPageIndex(0);
              }}
            >
              {idx + 1}. {f.name}
            </button>
          ))}
        </div>
      )}

      {settings.mode !== 'hidden' && !failed && frames.length > 0 && (
        <div className="preview-stage" data-mat={settings.mat}>
          {settings.mode === 'grid' ? (
            <ul className="preview-grid" data-size={settings.thumbSize} role="list">
              {frames.map((frame, idx) => (
                <li key={frame.key} className="preview-thumb">
                  <button
                    type="button"
                    className="preview-thumb__btn"
                    aria-label={`Inspect ${frame.label}`}
                    onClick={() => {
                      setPageIndex(idx);
                      patchSettings({ mode: 'single' });
                    }}
                  >
                    <span
                      className={`preview-sheet${settings.showShadow ? ' preview-sheet--shadow' : ''}`}
                      data-rot={settings.rotation}
                      data-crop={settings.squareCrop ? 'true' : 'false'}
                    >
                      <img src={frame.url} alt={`${frame.label} preview`} loading="lazy" />
                      {settings.guide !== 'none' && (
                        <span className={`preview-guide preview-guide--${settings.guide}`} aria-hidden="true" />
                      )}
                    </span>
                  </button>
                  {settings.showLabels && (
                    <span className="preview-caption">
                      {frame.label} · {frame.dimensions}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            currentFrame && (
              <div className="preview-single" data-zoom={settings.zoom}>
                <span
                  className={`preview-sheet${settings.showShadow ? ' preview-sheet--shadow' : ''}`}
                  data-rot={settings.rotation}
                >
                  <img src={currentFrame.url} alt={`${currentFrame.label} preview`} />
                  {settings.guide !== 'none' && (
                    <span className={`preview-guide preview-guide--${settings.guide}`} aria-hidden="true" />
                  )}
                </span>
                {settings.showLabels && (
                  <span className="preview-caption">
                    {currentFrame.label} · {currentFrame.dimensions}
                  </span>
                )}
              </div>
            )
          )}
        </div>
      )}

      {settings.mode === 'single' && frames.length > 1 && (
        <div className="preview-pager">
          <button
            type="button"
            className="btn btn--ghost"
            disabled={pageIndex <= 0}
            onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
          >
            Previous
          </button>
          <span className="muted">
            {pageIndex + 1} of {frames.length}
          </span>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={pageIndex >= frames.length - 1}
            onClick={() => setPageIndex((i) => Math.min(frames.length - 1, i + 1))}
          >
            Next
          </button>
        </div>
      )}

      {settings.mode !== 'hidden' && failed && (
        <p className="muted">Preview could not be rendered for this file.</p>
      )}
    </section>
  );
}
