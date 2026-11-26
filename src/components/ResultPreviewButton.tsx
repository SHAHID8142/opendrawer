// SPDX-License-Identifier: AGPL-3.0-or-later
// On-demand visual output preview button shared across tool result cards.
import { useMemo, useState } from 'react';
import { UploadedPreview } from './UploadedPreview';

interface ResultPreviewButtonProps {
  bytes: Uint8Array;
  filename: string;
  mime?: string;
}

export function ResultPreviewButton({
  bytes,
  filename,
  mime = 'application/pdf',
}: ResultPreviewButtonProps) {
  const [open, setOpen] = useState(false);

  const file = useMemo(() => {
    if (!open) return null;
    const copy = new Uint8Array(bytes);
    return new File([copy], filename, { type: mime });
  }, [open, bytes, filename, mime]);

  return (
    <div className="stack-sm">
      <button
        type="button"
        className="btn btn--secondary"
        aria-expanded={open}
        onClick={() => setOpen((curr) => !curr)}
      >
        {open ? 'Hide output preview' : 'Preview output'}
      </button>
      {open && file && <UploadedPreview files={[file]} />}
    </div>
  );
}
