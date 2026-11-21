import { useRef, useState } from 'react';

export interface FileDropProps {
  id: string;
  accept: string;
  label: string;
  hint: string;
  buttonLabel: string;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
}

export function FileDrop({
  id,
  accept,
  label,
  hint,
  buttonLabel,
  disabled = false,
  onFiles,
}: FileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function acceptFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    onFiles(Array.from(list));
  }

  return (
    <div
      className={`drop u-motion${over ? ' drop--over' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        if (!disabled) acceptFiles(event.dataTransfer.files);
      }}
    >
      <p className="drop__label">{label}</p>
      <p className="drop__hint">{hint}</p>
      <button
        type="button"
        className="btn btn--primary"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {buttonLabel}
      </button>
      <label className="drop__hint" htmlFor={id}>
        or drop a file here, or paste one with Ctrl+V / Cmd+V
      </label>
      <input
        ref={inputRef}
        id={id}
        className="drop__input"
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(event) => {
          acceptFiles(event.target.files);
          event.target.value = '';
        }}
      />
    </div>
  );
}
