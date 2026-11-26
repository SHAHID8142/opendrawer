// SPDX-License-Identifier: AGPL-3.0-or-later
// Warnings shown with extracted text: missing, unreadable and partly readable pages.
interface Props {
  emptyPages: number[];
  unreadablePages: number[];
  partialPages: number[];
}

function pageList(pages: number[]): string {
  return pages.length === 1 ? `Page ${pages[0]}` : `Pages ${pages.join(', ')}`;
}

export function ResultNotes({ emptyPages, unreadablePages, partialPages }: Props) {
  return (
    <>
      {unreadablePages.length > 0 && (
        <div className="note note--warning">
          <p>
            {pageList(unreadablePages)} could not be decoded: no readable text. Their fonts have
            no usable character mapping.
          </p>
        </div>
      )}
      {partialPages.length > 0 && (
        <div className="note note--warning">
          <p>
            {pageList(partialPages)} only partly readable. A font in the PDF has no usable
            character mapping, so some words are missing.
          </p>
        </div>
      )}
      {emptyPages.length > 0 && (
        <div className="note note--warning">
          <p>
            {pageList(emptyPages)} has no selectable text. It is probably a scan, and this tool
            does not read text from images.
          </p>
        </div>
      )}
    </>
  );
}
