// SPDX-License-Identifier: AGPL-3.0-or-later
// File picker, drag-and-drop tray, and compact loaded-file bar for local tools.
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { formatBytes } from '../lib/format';
import { UploadedPreview } from './UploadedPreview';

export interface SelectedFileInfo {
  name: string;
  size: number;
  detail?: string;
}

export interface FileDropProps {
  id: string;
  accept: string;
  label: string;
  hint: string;
  buttonLabel: string;
  multiple?: boolean;
  disabled?: boolean;
  working?: boolean;
  pasteEnabled?: boolean;
  selectedFile?: SelectedFileInfo | null;
  previewFiles?: File[];
  onClear?: () => void;
  onFiles: (files: File[]) => void;
}

export function FileDrop({
  id,
  accept,
  label,
  hint,
  buttonLabel,
  multiple = false,
  disabled = false,
  working = false,
  pasteEnabled = false,
  selectedFile = null,
  previewFiles,
  onClear,
  onFiles,
}: FileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [over, setOver] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (disabled) {
      dragDepth.current = 0;
      setOver(false);
    }
  }, [disabled]);

  function acceptFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const next = Array.from(list);
    setDroppedFiles(next);
    onFiles(next);
  }

  function handleClear() {
    setDroppedFiles([]);
    onClear?.();
  }

  const activePreviewFiles = previewFiles ?? (selectedFile ? droppedFiles : []);

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (disabled) return;
    dragDepth.current += 1;
    setOver(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!disabled && !over) setOver(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setOver(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setOver(false);
    if (!disabled) acceptFiles(event.dataTransfer.files);
  }

  const hintId = `${id}-hint`;
  const fileInput = (
    <input
      ref={inputRef}
      id={id}
      className="drop__input"
      type="file"
      accept={accept}
      multiple={multiple}
      disabled={disabled}
      tabIndex={-1}
      aria-hidden="true"
      onChange={(event) => {
        acceptFiles(event.target.files);
        event.target.value = '';
      }}
    />
  );

  const barDisabled = disabled || working;

  if (selectedFile) {
    return (
      <div className="stack">
        <div
          className={`drop-bar u-motion${over ? ' drop--over' : ''}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="drop-bar__meta">
            <span className="drop-bar__name">{selectedFile.name}</span>
            <span className="drop-bar__size">
              {formatBytes(selectedFile.size)}
              {selectedFile.detail ? ` · ${selectedFile.detail}` : ''}
            </span>
          </div>
          <div className="drop-bar__actions">
            <button
              type="button"
              className="btn btn--secondary"
              disabled={barDisabled}
              onClick={() => inputRef.current?.click()}
            >
              Choose another
            </button>
            {onClear && (
              <button
                type="button"
                className="btn btn--ghost"
                disabled={barDisabled}
                onClick={handleClear}
              >
                Clear
              </button>
            )}
          </div>
          {fileInput}
        </div>
        {activePreviewFiles.length > 0 && <UploadedPreview files={activePreviewFiles} />}
      </div>
    );
  }

  return (
    <div className="stack">
      <div
        className={`drop u-motion${over ? ' drop--over' : ''}${working ? ' drop--disabled' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span className="drop__icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
            <path d="M14 2v5h5" />
            <path d="M12 18v-7" />
            <path d="m9.5 13.5 2.5-2.5 2.5 2.5" />
          </svg>
        </span>
        <p className="drop__title">{label}</p>
        <p className="drop__note">{hint}</p>
        <button
          type="button"
          className="btn btn--primary"
          disabled={disabled}
          aria-describedby={hintId}
          onClick={() => inputRef.current?.click()}
        >
          {buttonLabel}
        </button>
        <p id={hintId} className="drop__hint">
          {pasteEnabled ? (
            <>
              Drop a file here, or paste with <kbd>Ctrl</kbd>+<kbd>V</kbd> / <kbd>Cmd</kbd>+
              <kbd>V</kbd>
            </>
          ) : (
            'Drop a file here'
          )}
        </p>
        {fileInput}
      </div>
      {activePreviewFiles.length > 0 && <UploadedPreview files={activePreviewFiles} />}
    </div>
  );
}
