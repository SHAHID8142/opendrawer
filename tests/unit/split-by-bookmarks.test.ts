// SPDX-License-Identifier: AGPL-3.0-or-later
// Proves bookmark discovery and splitting a PDF at its top-level outline entries.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, PDFName, PDFString } from 'pdf-lib';

import { readBookmarks, sectionFileName, splitByBookmarks } from '../../src/tools/split-by-bookmarks/engine.ts';

async function bookmarkedPdf(pages: number, marks: { title: string; page: number }[]) {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < pages; i += 1) pdf.addPage([300, 400]);
  const context = pdf.context;
  const pageRefs = pdf.getPages().map((page) => page.ref);
  if (marks.length > 0) {
    const outlinesRef = context.nextRef();
    const itemRefs = marks.map(() => context.nextRef());
    marks.forEach((mark, index) => {
      const dict = context.obj({
        Title: PDFString.of(mark.title),
        Parent: outlinesRef,
        Dest: context.obj([pageRefs[mark.page - 1]!, PDFName.of('Fit')]),
      });
      if (index + 1 < marks.length) dict.set(PDFName.of('Next'), itemRefs[index + 1]!);
      context.assign(itemRefs[index]!, dict);
    });
    context.assign(
      outlinesRef,
      context.obj({ Type: 'Outlines', First: itemRefs[0]!, Last: itemRefs[itemRefs.length - 1]!, Count: marks.length }),
    );
    pdf.catalog.set(PDFName.of('Outlines'), outlinesRef);
  }
  return pdf.save();
}

test('reads top-level bookmarks with their pages', async () => {
  const bytes = await bookmarkedPdf(5, [
    { title: 'Introduction', page: 1 },
    { title: 'Methods', page: 3 },
  ]);
  const result = await readBookmarks({ name: 'paper.pdf', bytes });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(
    result.bookmarks.map((bookmark) => [bookmark.title, bookmark.page]),
    [['Introduction', 1], ['Methods', 3]],
  );
});

test('splits into one PDF per section, keeping the page ranges', async () => {
  const bytes = await bookmarkedPdf(5, [
    { title: 'Introduction', page: 1 },
    { title: 'Methods', page: 3 },
    { title: 'Results', page: 5 },
  ]);
  const result = await splitByBookmarks({ name: 'paper.pdf', bytes });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.files.length, 3);
  const counts = [];
  for (const file of result.files) {
    const pdf = await PDFDocument.load(file.bytes);
    counts.push(pdf.getPageCount());
  }
  assert.deepEqual(counts, [2, 2, 1]);
  assert.equal(result.files[0]!.name, 'paper-01-Introduction.pdf');
});

test('refuses a PDF without bookmarks', async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage([200, 200]);
  const result = await readBookmarks({ name: 'plain.pdf', bytes: await pdf.save() });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'NO_BOOKMARKS');
});

test('sanitises bookmark titles into file names', () => {
  assert.equal(sectionFileName('paper', 2, 'Results & discussion'), 'paper-02-Results-discussion.pdf');
  assert.equal(sectionFileName('paper', 9, '***'), 'paper-09-Section.pdf');
});
