// SPDX-License-Identifier: AGPL-3.0-or-later
// Universal uploaded-file preview & status studio with incremental multi-page loading (supports all pages).
import { useEffect, useRef, useState } from 'react';
import { formatBytes } from '../lib/format';
import { renderPdfPages, renderUploadedPreview, revokePreviewResources, type RenderedPreview } from '../lib/preview';
import { DEFAULT_PREVIEW_SETTINGS, loadPreviewPrefs, savePreviewPrefs, type PreviewSettings } from '../lib/preview-prefs';
import { PreviewToolbar } from './PreviewToolbar';

const INITIAL_BATCH = 12;

export function UploadedPreview({ files }: { files: File[] }) {
  const [settings, setSettings] = useState<PreviewSettings>(DEFAULT_PREVIEW_SETTINGS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [fileIndex, setFileIndex] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [rendered, setRendered] = useState<RenderedPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const resRef = useRef<RenderedPreview | null>(null);
  const moreAbortRef = useRef<AbortController | null>(null);

  useEffect(() => { setSettings(loadPreviewPrefs()); setPrefsLoaded(true); }, []);
  useEffect(() => { if (prefsLoaded) savePreviewPrefs(settings); }, [settings, prefsLoaded]);
  useEffect(() => { if (fileIndex >= files.length) setFileIndex(0); setPageIndex(0); }, [files, fileIndex]);

  const multiImageGallery =
    files.length > 1 && files.every((f) => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(f.name));
  const activeTargets = multiImageGallery
    ? files
    : [files[Math.min(fileIndex, Math.max(files.length - 1, 0))]].filter(Boolean);

  useEffect(() => {
    moreAbortRef.current?.abort();
    if (activeTargets.length === 0) {
      if (resRef.current) revokePreviewResources(resRef.current);
      resRef.current = null;
      setRendered(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const initialLimit = settings.autoLoadAll ? 500 : INITIAL_BATCH;

    renderUploadedPreview(activeTargets, initialLimit, settings.mode === 'single', controller.signal)
      .then((out) => {
        if (controller.signal.aborted) { revokePreviewResources(out); return; }
        if (resRef.current) revokePreviewResources(resRef.current);
        resRef.current = out;
        setRendered(out);
        setLoading(false);
      })
      .catch(() => { if (!controller.signal.aborted) setLoading(false); });

    return () => controller.abort();
  }, [files, fileIndex, settings.mode, settings.autoLoadAll]);

  useEffect(() => () => {
    moreAbortRef.current?.abort();
    if (resRef.current) revokePreviewResources(resRef.current);
  }, []);

  if (files.length === 0) return null;

  const patchSettings = (patch: Partial<PreviewSettings>) => setSettings((c) => ({ ...c, ...patch }));
  const frames = rendered?.frames ?? [];
  const kind = rendered?.kind ?? 'summary';
  const info = rendered?.inspection;
  const totalPages = rendered?.totalPages ?? 0;

  async function loadRange(untilPage: number, nextPageIndex?: number) {
    const target = activeTargets[0];
    if (!target || !rendered || rendered.kind !== 'pdf' || loadingMore) return;
    const fromPage = frames.length + 1;
    if (fromPage > untilPage || frames.length >= totalPages) {
      if (nextPageIndex !== undefined) setPageIndex(nextPageIndex);
      return;
    }
    moreAbortRef.current?.abort();
    const controller = new AbortController();
    moreAbortRef.current = controller;
    setLoadingMore(true);
    try {
      const more = await renderPdfPages(target, fromPage, untilPage, settings.mode === 'single', controller.signal);
      if (controller.signal.aborted) { revokePreviewResources({ frames: more.frames }); return; }
      const merged = [...(resRef.current?.frames ?? []), ...more.frames];
      const next = { ...rendered, frames: merged };
      resRef.current = next;
      setRendered(next);
      if (nextPageIndex !== undefined) setPageIndex(nextPageIndex);
    } finally {
      setLoadingMore(false);
    }
  }

  const summary =
    settings.mode === 'hidden' ? 'Hidden'
      : loading ? 'Checking file…'
        : kind === 'pdf' || kind === 'image'
          ? totalPages > frames.length
            ? `${frames.length} of ${totalPages} pages loaded`
            : `${totalPages} ${totalPages === 1 ? (kind === 'image' ? 'image' : 'page') : kind === 'image' ? 'images' : 'pages'}`
          : info?.detectedFormat ?? 'Checked locally';

  const currentFrame = frames[Math.min(pageIndex, Math.max(frames.length - 1, 0))];

  return (
    <section className="preview-studio" aria-label="Uploaded files preview">
      <PreviewToolbar
        kind={kind}
        settings={settings}
        customizeOpen={customizeOpen}
        summaryText={summary}
        onToggleCustomize={() => setCustomizeOpen((o) => !o)}
        onChange={patchSettings}
        onReset={() => setSettings(DEFAULT_PREVIEW_SETTINGS)}
      />

      {info && (
        <div className="preview-status" data-tone={info.statusTone}>
          <span className="preview-status__badge">{info.statusLabel}</span>
          <span className="preview-status__meta">
            {info.detectedFormat} · {formatBytes(info.fileSize)} · {info.modifiedLabel}
          </span>
        </div>
      )}

      {files.length > 1 && !multiImageGallery && (
        <div className="preview-files" role="group" aria-label="Uploaded files">
          {files.map((f, idx) => (
            <button key={`${f.name}-${idx}`} type="button" className="preview-chip" aria-pressed={fileIndex === idx} onClick={() => { setFileIndex(idx); setPageIndex(0); }}>
              {idx + 1}. {f.name}
            </button>
          ))}
        </div>
      )}

      {settings.mode !== 'hidden' && rendered && (
        <div className="preview-stage" data-mat={settings.mat}>
          {(kind === 'pdf' || kind === 'image') && frames.length > 0 && (
            settings.mode === 'grid' ? (
              <ul className="preview-grid" data-size={settings.thumbSize} role="list">
                {frames.map((frame, idx) => (
                  <li key={frame.key} className="preview-thumb">
                    <button type="button" className="preview-thumb__btn" aria-label={`Inspect ${frame.label}`} onClick={() => { setPageIndex(idx); patchSettings({ mode: 'single' }); }}>
                      <span className={`preview-sheet${settings.showShadow ? ' preview-sheet--shadow' : ''}`} data-rot={settings.rotation} data-crop={settings.squareCrop ? 'true' : 'false'}>
                        <img src={frame.url} alt={`${frame.label} preview`} loading="lazy" />
                        {settings.guide !== 'none' && <span className={`preview-guide preview-guide--${settings.guide}`} aria-hidden="true" />}
                      </span>
                    </button>
                    {settings.showLabels && <span className="preview-caption">{frame.label} · {frame.dimensions}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              currentFrame && (
                <div className="preview-single" data-zoom={settings.zoom}>
                  <span className={`preview-sheet${settings.showShadow ? ' preview-sheet--shadow' : ''}`} data-rot={settings.rotation}>
                    <img src={currentFrame.url} alt={`${currentFrame.label} preview`} />
                    {settings.guide !== 'none' && <span className={`preview-guide preview-guide--${settings.guide}`} aria-hidden="true" />}
                  </span>
                  {settings.showLabels && <span className="preview-caption">{currentFrame.label} · {currentFrame.dimensions}</span>}
                </div>
              )
            )
          )}

          {kind === 'text' && info?.textExcerpt !== undefined && (
            <div className="preview-doc">
              <pre className={`preview-text${settings.wrapText ? ' preview-text--wrap' : ''}`}>{info.textExcerpt || '(Empty file)'}</pre>
              {info.truncatedText && <p className="preview-caption">Showing first {info.lineCount && info.lineCount > 220 ? '220 lines' : '24 KB'} locally.</p>}
            </div>
          )}

          {kind === 'media' && rendered.mediaUrl && (
            <div className="preview-media">
              {rendered.mediaType === 'video' ? <video src={rendered.mediaUrl} controls preload="metadata" /> : <audio src={rendered.mediaUrl} controls preload="metadata" />}
            </div>
          )}

          {kind === 'summary' && info && (
            <div className="preview-doc-card">
              <p className="preview-doc-card__note">{info.detailNote}</p>
              <dl className="preview-doc-card__facts">
                <div><dt>File</dt><dd>{info.fileName}</dd></div>
                <div><dt>Detected</dt><dd>{info.detectedFormat}</dd></div>
                <div><dt>Header</dt><dd><code>{info.headerHex}</code></dd></div>
              </dl>
            </div>
          )}
        </div>
      )}

      {settings.mode === 'grid' && kind === 'pdf' && totalPages > frames.length && (
        <div className="preview-more">
          <button type="button" className="btn btn--secondary" disabled={loadingMore} onClick={() => void loadRange(Math.min(totalPages, frames.length + 12))}>
            {loadingMore ? 'Loading pages…' : `Load next ${Math.min(12, totalPages - frames.length)} pages`}
          </button>
          <button type="button" className="btn btn--ghost" disabled={loadingMore} onClick={() => void loadRange(totalPages)}>
            Load all {totalPages} pages
          </button>
        </div>
      )}

      {(kind === 'pdf' || kind === 'image') && settings.mode === 'single' && totalPages > 1 && (
        <div className="preview-pager">
          <button type="button" className="btn btn--ghost" disabled={pageIndex <= 0} onClick={() => setPageIndex((i) => Math.max(0, i - 1))}>
            Previous
          </button>
          <span className="muted">{pageIndex + 1} of {totalPages}</span>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={loadingMore || pageIndex >= totalPages - 1}
            onClick={() => {
              const targetIdx = Math.min(totalPages - 1, pageIndex + 1);
              if (targetIdx >= frames.length) void loadRange(Math.min(totalPages, targetIdx + 6), targetIdx);
              else setPageIndex(targetIdx);
            }}
          >
            {loadingMore ? 'Loading…' : 'Next'}
          </button>
        </div>
      )}
    </section>
  );
}
