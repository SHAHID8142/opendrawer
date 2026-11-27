import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { PDFDocument, PDFName, PDFString, StandardFonts } from 'pdf-lib';
import { readFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const ROUTES = ['/', '/privacy', '/tools/inspect-pdf', '/tools/pdf-to-image', '/tools/images-to-pdf', '/tools/merge-pdf', '/tools/split-pdf', '/tools/rotate-pdf', '/tools/delete-pages', '/tools/reorder-pages', '/tools/extract-pages', '/tools/page-numbers', '/tools/watermark-pdf', '/tools/crop-pdf', '/tools/flatten-pdf', '/tools/extract-text', '/tools/add-image', '/tools/ocr-pdf', '/tools/resize-pdf', '/tools/compress-pdf', '/tools/protect-pdf', '/tools/unlock-pdf', '/tools/repair-pdf', '/tools/fill-forms', '/tools/extract-images', '/tools/n-up-pdf', '/tools/edit-metadata', '/tools/split-by-bookmarks', '/tools/redact-pdf', '/tools/booklet-pdf', '/tools/writing-check', '/tools/text-transform', '/tools/text-statistics', '/tools/text-diff', '/tools/image-to-text', '/tools/compress-image', '/tools/crop-image'];

async function createPdf(
  pageCount: number,
  options: { title?: string; author?: string; labelPrefix?: string } = {},
): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  if (options.title) pdf.setTitle(options.title);
  if (options.author) pdf.setAuthor(options.author);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const prefix = options.labelPrefix ?? 'Page';
  for (let index = 1; index <= pageCount; index += 1) {
    const page = pdf.addPage([595.28, 841.89]);
    page.drawText(`${prefix} ${index}`, { x: 72, y: 700, size: 18, font });
  }
  return Buffer.from(await pdf.save());
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const kind = Buffer.from(type, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([kind, data])));
  return Buffer.concat([length, kind, data, crc]);
}

/** A real 200×200 solid-colour PNG, for the image-extraction flow. */
function makePng(size: number): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 3, 0xc0)]);
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}


async function makeBookmarkedPdf(pages: number, marks: { title: string; page: number }[]) {
  const pdf = await PDFDocument.create();
  for (let index = 0; index < pages; index += 1) {
    const page = pdf.addPage([300, 400]);
    page.drawText(`Page ${index + 1}`, { x: 30, y: 360, size: 12 });
  }
  const context = pdf.context;
  const pageRefs = pdf.getPages().map((page) => page.ref);
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
    context.obj({
      Type: 'Outlines',
      First: itemRefs[0]!,
      Last: itemRefs[itemRefs.length - 1]!,
      Count: marks.length,
    }),
  );
  pdf.catalog.set(PDFName.of('Outlines'), outlinesRef);
  return Buffer.from(await pdf.save());
}

async function assertNoHorizontalOverflow(page: Page, context: string): Promise<void> {
  const overflow = await page.evaluate(() => {
    const element = document.documentElement;
    return element.scrollWidth - element.clientWidth;
  });
  expect(overflow, `horizontal overflow on ${context}`).toBeLessThanOrEqual(1);
}

async function assertTargetsAtLeast44(page: Page, context: string): Promise<void> {
  const targets = page.locator('button, [role="button"], a.btn, summary');
  const count = await targets.count();
  expect(count, `no interactive targets on ${context}`).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    const target = targets.nth(index);
    if (!(await target.isVisible())) continue;
    const box = await target.boundingBox();
    expect(box, `target ${index} on ${context} has no box`).not.toBeNull();
    if (box) {
      expect(box.height, `target ${index} height on ${context}`).toBeGreaterThanOrEqual(44);
      expect(box.width, `target ${index} width on ${context}`).toBeGreaterThanOrEqual(44);
    }
  }
}

test.describe('UI-G9 content in HTML', () => {
  test('tool page is readable with JavaScript disabled', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/tools/inspect-pdf');

    await expect(page.getByRole('heading', { level: 1, name: 'Inspect a PDF' })).toBeVisible();
    await expect(page.getByText('What this tool cannot do')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();

    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description?.length ?? 0).toBeGreaterThan(60);

    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toContain('/tools/inspect-pdf');

    await context.close();
  });

  test('home page lists the live tool without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /Inspect PDF/ })).toBeVisible();
    await context.close();
  });
});

test.describe('UI-G3 accessibility', () => {
  for (const route of ROUTES) {
    test(`no serious axe violations on ${route}`, async ({ page }) => {
      await page.goto(route);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const serious = results.violations.filter(
        (violation) => violation.impact === 'serious' || violation.impact === 'critical',
      );
      expect(
        serious.map((violation) => `${violation.id}: ${violation.help}`),
        'serious or critical accessibility violations',
      ).toEqual([]);
    });
  }
});

test.describe('UI-G4 reflow', () => {
  for (const width of [320, 360, 768, 1280]) {
    test(`no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 740 });
      for (const route of ROUTES) {
        await page.goto(route);
        await assertNoHorizontalOverflow(page, `${route} at ${width}px`);
      }
    });
  }

  test('no horizontal scroll at 320px after rendering results in both tools', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });

    await page.goto('/tools/inspect-pdf');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    const inspectBytes = await createPdf(2, { title: 'Reflow check', author: 'QA' });
    await page.locator('#inspect-file').setInputFiles({
      name: 'quarterly-financial-audit-statement-with-a-very-long-filename-2026.pdf',
      mimeType: 'application/pdf',
      buffer: inspectBytes,
    });
    await expect(page.getByRole('status')).toContainText('Report ready', { timeout: 20_000 });
    await assertNoHorizontalOverflow(page, 'inspect-pdf result at 320px');

    await page.goto('/tools/pdf-to-image');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.selectOption('#render-format', 'jpeg');
    await page.selectOption('#render-dpi', '72');
    await page.locator('#render-file').setInputFiles({
      name: 'two-pages.pdf',
      mimeType: 'application/pdf',
      buffer: await createPdf(2),
    });
    await expect(page.getByRole('status')).toContainText('2 pages rendered', { timeout: 60_000 });
    await assertNoHorizontalOverflow(page, 'pdf-to-image result at 320px');
  });
});

test.describe('UI-G5 target size', () => {
  test('every button, button-like link, and summary is at least 44px across states', async ({ page }) => {
    await page.goto('/');
    await assertTargetsAtLeast44(page, '/ idle');

    await page.goto('/tools/inspect-pdf');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await assertTargetsAtLeast44(page, 'inspect-pdf idle');

    await page.locator('#inspect-file').setInputFiles({
      name: 'targets.pdf',
      mimeType: 'application/pdf',
      buffer: await createPdf(1, { title: 'Targets' }),
    });
    await expect(page.getByRole('status')).toContainText('Report ready', { timeout: 20_000 });
    await assertTargetsAtLeast44(page, 'inspect-pdf report');

    await page.goto('/tools/pdf-to-image');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await assertTargetsAtLeast44(page, 'pdf-to-image idle');

    await page.selectOption('#render-format', 'jpeg');
    await page.selectOption('#render-dpi', '72');
    await page.locator('#render-file').setInputFiles({
      name: 'six-pages.pdf',
      mimeType: 'application/pdf',
      buffer: await createPdf(6),
    });
    await expect(page.getByRole('status')).toContainText('6 pages rendered', { timeout: 60_000 });
    await assertTargetsAtLeast44(page, 'pdf-to-image multi-page result');
  });
});

test.describe('UI-G7 reduced motion', () => {
  test('transitions collapse when motion is reduced', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/tools/inspect-pdf');
    const duration = await page.locator('.drop').evaluate((element) => {
      return getComputedStyle(element).transitionDuration;
    });
    expect(duration).toContain('0');
  });
});

test.describe('UI-G8 and the file flow', () => {
  test('FileDrop exposes a single Tab stop and hides the native file input', async ({ page }) => {
    await page.goto('/tools/inspect-pdf');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();

    const inputAttrs = await page.locator('#inspect-file').evaluate((el: HTMLInputElement) => ({
      tabIndex: el.tabIndex,
      ariaHidden: el.getAttribute('aria-hidden'),
    }));
    expect(inputAttrs.tabIndex).toBe(-1);
    expect(inputAttrs.ariaHidden).toBe('true');

    const chooseBtn = page.getByRole('button', { name: 'Choose a PDF' });
    await chooseBtn.focus();
    await expect(chooseBtn).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#inspect-file')).not.toBeFocused();
  });

  test('inspects a fixture, clears cleanly, and reports malformed input', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));

    await page.goto('/tools/inspect-pdf');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();

    await page.locator('#inspect-file').setInputFiles({
      name: 'fixture.pdf',
      mimeType: 'application/pdf',
      buffer: await createPdf(1, { title: 'Gate fixture', author: 'Gate', labelPrefix: 'fixture page' }),
    });

    await expect(page.getByRole('status')).toContainText('Report ready', { timeout: 20_000 });
    await expect(page.getByText('Gate fixture')).toBeVisible();
    await expect(page.getByText('A4')).toBeVisible();

    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.locator('.drop')).toBeVisible();
    await expect(page.getByRole('status')).toContainText('No file yet.');

    await page.locator('#inspect-file').setInputFiles({
      name: 'broken.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('not a pdf document'),
    });
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('does not start with a PDF header');

    const origin = new URL(page.url()).origin;
    const foreign = requests.filter((url) => {
      if (url.startsWith('data:') || url.startsWith('blob:')) return false;
      return new URL(url).origin !== origin;
    });
    expect(foreign, 'requests that left the origin').toEqual([]);
  });

  test('renders two pages to a ZIP, previews image, and supports Render again', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));

    await page.goto('/tools/pdf-to-image');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.selectOption('#render-format', 'jpeg');
    await page.selectOption('#render-dpi', '72');

    await page.locator('#render-file').setInputFiles({
      name: 'two-pages.pdf',
      mimeType: 'application/pdf',
      buffer: await createPdf(2),
    });

    await expect(page.getByRole('status')).toContainText('2 pages rendered', { timeout: 60_000 });
    await expect(page.getByText('two-pages-page-001.jpg', { exact: true })).toBeVisible();

    const previewImg = page.locator('.preview-frame img');
    await expect(previewImg).toBeVisible();
    expect(await previewImg.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the ZIP' }).click();
    const saved = await download;
    expect(saved.suggestedFilename()).toBe('two-pages-images.zip');

    await page.selectOption('#render-format', 'png');
    await page.fill('#render-range', '1');
    await page.getByRole('button', { name: 'Render again' }).click();
    await expect(page.locator('.drop-bar')).toBeVisible();
    await expect(page.getByRole('status')).toContainText('1 page rendered', { timeout: 60_000 });
    await expect(page.getByRole('button', { name: 'Download the PNG' })).toBeVisible();

    const origin = new URL(page.url()).origin;
    const foreign = requests.filter((url) => {
      if (url.startsWith('data:') || url.startsWith('blob:')) return false;
      return new URL(url).origin !== origin;
    });
    expect(foreign, 'requests that left the origin').toEqual([]);
  });

  test('builds one PDF from two images without leaving the origin', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));

    await page.goto('/tools/images-to-pdf');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();

    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64',
    );
    await page.locator('#images-input').setInputFiles([
      { name: 'one.png', mimeType: 'image/png', buffer: png },
      { name: 'two.png', mimeType: 'image/png', buffer: png },
    ]);
    await expect(page.getByRole('status')).toContainText('2 images ready');

    await page.getByRole('button', { name: 'Create the PDF' }).click();
    await expect(page.getByRole('status')).toContainText('PDF ready with 2 pages', { timeout: 30_000 });

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the PDF' }).click();
    const saved = await download;
    expect(saved.suggestedFilename()).toBe('one-and-more.pdf');

    const origin = new URL(page.url()).origin;
    const foreign = requests.filter((url) => {
      if (url.startsWith('data:') || url.startsWith('blob:')) return false;
      return new URL(url).origin !== origin;
    });
    expect(foreign, 'requests that left the origin').toEqual([]);
  });

  test('merges two PDFs in order without leaving the origin', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));

    await page.goto('/tools/merge-pdf');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.locator('#merge-input').setInputFiles([
      { name: 'first.pdf', mimeType: 'application/pdf', buffer: await createPdf(2) },
      { name: 'second.pdf', mimeType: 'application/pdf', buffer: await createPdf(1) },
    ]);
    await expect(page.getByRole('status')).toContainText('2 PDFs ready');

    await page.getByRole('button', { name: 'Merge the PDFs' }).click();
    await expect(page.getByRole('status')).toContainText('Merged 2 PDFs into 3 pages', {
      timeout: 30_000,
    });

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the merged PDF' }).click();
    const saved = await download;
    expect(saved.suggestedFilename()).toBe('first-merged.pdf');

    const origin = new URL(page.url()).origin;
    const foreign = requests.filter((url) => {
      if (url.startsWith('data:') || url.startsWith('blob:')) return false;
      return new URL(url).origin !== origin;
    });
    expect(foreign, 'requests that left the origin').toEqual([]);
  });

  test('splits a PDF by ranges into a ZIP without leaving the origin', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));

    await page.goto('/tools/split-pdf');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.locator('#split-input').setInputFiles({
      name: 'report.pdf',
      mimeType: 'application/pdf',
      buffer: await createPdf(4),
    });
    await expect(page.getByRole('status')).toContainText('4 pages ready');

    await page.fill('#split-range', '1-2,4');
    await page.getByRole('button', { name: 'Split the PDF' }).click();
    await expect(page.getByRole('status')).toContainText('Split into 2 files', { timeout: 30_000 });
    await expect(page.getByText('report-pages-1-2.pdf')).toBeVisible();

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the ZIP' }).click();
    const saved = await download;
    expect(saved.suggestedFilename()).toBe('report-split.zip');

    const origin = new URL(page.url()).origin;
    const foreign = requests.filter((url) => {
      if (url.startsWith('data:') || url.startsWith('blob:')) return false;
      return new URL(url).origin !== origin;
    });
    expect(foreign, 'requests that left the origin').toEqual([]);
  });

  test('rotates selected pages and downloads the result', async ({ page }) => {
    await page.goto('/tools/rotate-pdf');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.locator('#rotate-input').setInputFiles({
      name: 'upright.pdf',
      mimeType: 'application/pdf',
      buffer: await createPdf(3),
    });
    await expect(page.getByRole('status')).toContainText('3 pages ready');

    await page.fill('#rotate-range', '1-2');
    await page.getByRole('button', { name: 'Rotate the pages' }).click();
    await expect(page.getByRole('status')).toContainText('Rotated 2 pages', { timeout: 30_000 });

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the PDF' }).click();
    const saved = await download;
    expect(saved.suggestedFilename()).toBe('upright-rotated.pdf');
  });

  test('deletes chosen pages and downloads a shorter PDF', async ({ page }) => {
    await page.goto('/tools/delete-pages');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.locator('#delete-input').setInputFiles({
      name: 'keep.pdf',
      mimeType: 'application/pdf',
      buffer: await createPdf(4),
    });
    await expect(page.getByRole('status')).toContainText('4 pages ready');

    await page.fill('#delete-range', '2,4');
    await page.getByRole('button', { name: 'Remove the pages' }).click();
    await expect(page.getByRole('status')).toContainText('Removed 2 pages. 2 remain.', {
      timeout: 30_000,
    });

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the PDF' }).click();
    const saved = await download;
    expect(saved.suggestedFilename()).toBe('keep-pages-removed.pdf');
  });

  test('reverses page order and downloads the reordered PDF', async ({ page }) => {
    await page.goto('/tools/reorder-pages');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.locator('#reorder-input').setInputFiles({
      name: 'order.pdf',
      mimeType: 'application/pdf',
      buffer: await createPdf(3),
    });
    await expect(page.getByRole('status')).toContainText('3 pages ready');

    await page.getByRole('button', { name: 'Reverse order' }).click();
    await page.getByRole('button', { name: 'Save the new order' }).click();
    await expect(page.getByRole('status')).toContainText('3 pages reordered', { timeout: 30_000 });

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the PDF' }).click();
    const saved = await download;
    expect(saved.suggestedFilename()).toBe('order-reordered.pdf');
  });

  test('extracts chosen pages into a new PDF', async ({ page }) => {
    await page.goto('/tools/extract-pages');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.locator('#extract-input').setInputFiles({
      name: 'bundle.pdf',
      mimeType: 'application/pdf',
      buffer: await createPdf(5),
    });
    await expect(page.getByRole('status')).toContainText('5 pages ready');

    await page.fill('#extract-range', '2,4');
    await expect(page.locator('#extract-range-help')).toContainText('Keeping 2 of 5 pages');
    await page.getByRole('button', { name: 'Extract the pages' }).click();
    await expect(page.getByRole('status')).toContainText('Extracted 2 pages', { timeout: 30_000 });

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the PDF' }).click();
    const saved = await download;
    expect(saved.suggestedFilename()).toBe('bundle-pages.pdf');
  });

  test('adds page numbers and downloads the numbered PDF', async ({ page }) => {
    await page.goto('/tools/page-numbers');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.locator('#numbers-input').setInputFiles({
      name: 'draft.pdf',
      mimeType: 'application/pdf',
      buffer: await createPdf(3),
    });
    await expect(page.getByRole('status')).toContainText('3 pages ready');

    await page.selectOption('#numbers-position', 'bottom-right');
    await page.selectOption('#numbers-format', 'page-of-total');
    await page.getByRole('button', { name: 'Add page numbers' }).click();
    await expect(page.getByRole('status')).toContainText('Numbered 3 pages', { timeout: 30_000 });

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the PDF' }).click();
    const saved = await download;
    expect(saved.suggestedFilename()).toBe('draft-numbered.pdf');
  });

  test('watermarks every page and downloads the stamped PDF', async ({ page }) => {
    await page.goto('/tools/watermark-pdf');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.locator('#watermark-input').setInputFiles({
      name: 'notes.pdf',
      mimeType: 'application/pdf',
      buffer: await createPdf(2),
    });
    await expect(page.getByRole('status')).toContainText('2 pages ready');

    await page.fill('#watermark-text', 'CONFIDENTIAL');
    await page.getByRole('button', { name: 'Add the watermark' }).click();
    await expect(page.getByRole('status')).toContainText('Watermarked 2 pages', { timeout: 30_000 });

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the PDF' }).click();
    const saved = await download;
    expect(saved.suggestedFilename()).toBe('notes-watermarked.pdf');
  });

  test('crops selected pages and downloads the cropped PDF', async ({ page }) => {
    await page.goto('/tools/crop-pdf');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.locator('#crop-input').setInputFiles({
      name: 'wide.pdf',
      mimeType: 'application/pdf',
      buffer: await createPdf(3),
    });
    await expect(page.getByRole('status')).toContainText('3 pages ready');

    await page.fill('#crop-range', '1-2');
    await page.getByRole('button', { name: 'Crop the pages' }).click();
    await expect(page.getByRole('status')).toContainText('Cropped 2 pages', { timeout: 30_000 });

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the PDF' }).click();
    const saved = await download;
    expect(saved.suggestedFilename()).toBe('wide-cropped.pdf');
  });

  test('flattens a form and downloads a PDF without fields', async ({ page }) => {
    const pdf = await PDFDocument.create();
    const formPage = pdf.addPage([595.28, 841.89]);
    const field = pdf.getForm().createTextField('full_name');
    field.setText('Ada Lovelace');
    field.addToPage(formPage, { x: 72, y: 700, width: 240, height: 24 });
    const formBytes = Buffer.from(await pdf.save());

    await page.goto('/tools/flatten-pdf');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.locator('#flatten-input').setInputFiles({
      name: 'form.pdf',
      mimeType: 'application/pdf',
      buffer: formBytes,
    });
    await expect(page.getByRole('status')).toContainText('1 pages ready');

    await page.getByRole('button', { name: 'Flatten the form' }).click();
    await expect(page.getByRole('status')).toContainText('Flattened 1 form field', {
      timeout: 30_000,
    });

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the PDF' }).click();
    const saved = await download;
    expect(saved.suggestedFilename()).toBe('form-flattened.pdf');
  });

  test('extracts text from every page and downloads a .txt file', async ({ page }) => {
    await page.goto('/tools/extract-text');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.locator('#extract-input').setInputFiles({
      name: 'notes.pdf',
      mimeType: 'application/pdf',
      buffer: await createPdf(2),
    });
    await page.getByRole('button', { name: 'Extract the text' }).click();
    await expect(page.getByRole('status')).toContainText('Read 2 pages', { timeout: 30_000 });

    const preview = page.locator('#extracted-text');
    await expect(preview).toHaveValue(/--- Page 1 ---/);
    await expect(preview).toHaveValue(/Page 2/);

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the text file' }).click();
    const saved = await download;
    expect(saved.suggestedFilename()).toBe('notes.txt');
  });

  test('adds an image to the chosen pages and downloads the PDF', async ({ page }) => {
    const dot = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );

    await page.goto('/tools/add-image');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.locator('#image-pdf-input').setInputFiles({
      name: 'report.pdf',
      mimeType: 'application/pdf',
      buffer: await createPdf(1),
    });
    await expect(page.getByRole('status')).toContainText('Now choose a PNG or JPEG image');
    await page.locator('#image-file-input').setInputFiles({
      name: 'dot.png',
      mimeType: 'image/png',
      buffer: dot,
    });

    await page.selectOption('#image-placement', 'top-left');
    await page.getByRole('button', { name: 'Add the image' }).click();
    await expect(page.getByRole('status')).toContainText('Added the image to 1 page', {
      timeout: 30_000,
    });

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the PDF' }).click();
    const saved = await download;
    expect(saved.suggestedFilename()).toBe('report-with-image.pdf');
  });

  test('resizes pages to US Letter and downloads the rebuilt PDF', async ({ page }) => {
    await page.goto('/tools/resize-pdf');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.locator('#resize-input').setInputFiles({
      name: 'mixed.pdf',
      mimeType: 'application/pdf',
      buffer: await createPdf(2),
    });
    await expect(page.getByRole('status')).toContainText('2 pages ready');
    await page.selectOption('#resize-paper', 'letter');
    await page.getByRole('button', { name: 'Resize the pages' }).click();
    await expect(page.getByRole('status')).toContainText('Resized 2 pages', { timeout: 30_000 });

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the PDF' }).click();
    const saved = await download;
    expect(saved.suggestedFilename()).toBe('mixed-letter.pdf');
    const bytes = readFileSync((await saved.path())!);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(2);
    expect(Math.abs(pdf.getPage(0).getWidth() - 612)).toBeLessThan(0.01);
    expect(Math.abs(pdf.getPage(0).getHeight() - 792)).toBeLessThan(0.01);
  });

  test('crops an image to exact pixels and downloads a valid PNG', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/tools/crop-image');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    const base64 = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 700;
      const context = canvas.getContext('2d');
      if (!context) return '';
      context.fillStyle = '#c93914';
      context.fillRect(0, 0, 500, 350);
      context.fillStyle = '#16653c';
      context.fillRect(500, 350, 500, 350);
      return canvas.toDataURL('image/png').split(',')[1] ?? '';
    });
    await page.locator('#crop-input').setInputFiles({
      name: 'quadrants.png',
      mimeType: 'image/png',
      buffer: Buffer.from(base64, 'base64'),
    });
    await page.fill('#crop-x', '100');
    await page.fill('#crop-y', '100');
    await page.fill('#crop-width', '400');
    await page.fill('#crop-height', '300');
    await page.getByRole('button', { name: 'Crop the image' }).click();
    await expect(page.getByRole('status')).toContainText('Cropped to 400 × 300.', { timeout: 30_000 });
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the cropped image' }).click();
    const saved = await download;
    const bytes = readFileSync((await saved.path())!);
    expect(bytes.subarray(1, 4).toString()).toBe('PNG');
    expect(bytes.readUInt32BE(16)).toBe(400);
    expect(bytes.readUInt32BE(20)).toBe(300);
    expect(saved.suggestedFilename()).toBe('quadrants-cropped.png');
  });

  test('re-encodes an image and reports the real size change', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/tools/compress-image');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    const base64 = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 900;
      const context = canvas.getContext('2d');
      if (!context) return '';
      const image = context.createImageData(canvas.width, canvas.height);
      for (let index = 0; index < image.data.length; index += 4) {
        image.data[index] = Math.random() * 255;
        image.data[index + 1] = Math.random() * 255;
        image.data[index + 2] = Math.random() * 255;
        image.data[index + 3] = 255;
      }
      context.putImageData(image, 0, 0);
      return canvas.toDataURL('image/png').split(',')[1] ?? '';
    });
    const source = Buffer.from(base64, 'base64');
    await page.locator('#compress-input').setInputFiles({
      name: 'noise.png',
      mimeType: 'image/png',
      buffer: source,
    });
    await page.selectOption('#compress-format', 'jpeg');
    await page.selectOption('#compress-edge', '0');
    await page.getByRole('button', { name: 'Compress the image' }).click();
    await expect(page.getByRole('status')).toContainText('→', { timeout: 60_000 });
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the image' }).click();
    const saved = await download;
    const bytes = readFileSync((await saved.path())!);
    expect(bytes.subarray(0, 3).toString('hex')).toBe('ffd8ff');
    expect(bytes.length).toBeLessThan(source.length);
    expect(saved.suggestedFilename()).toBe('noise-compressed.jpg');
  });

  test('reads text from an image with the local OCR engine', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/tools/image-to-text');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    const base64 = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 220;
      const context = canvas.getContext('2d');
      if (!context) return '';
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#000000';
      context.font = '600 56px Arial, sans-serif';
      context.fillText('Hello receipt 42', 28, 130);
      return canvas.toDataURL('image/png').split(',')[1] ?? '';
    });
    await page.locator('#image-input').setInputFiles({
      name: 'receipt.png',
      mimeType: 'image/png',
      buffer: Buffer.from(base64, 'base64'),
    });
    await page.getByLabel('Grayscale').check();
    await page.getByLabel('Boost contrast').check();
    await page.getByRole('button', { name: 'Read the image' }).click();
    await expect(page.locator('#ocr-text')).toContainText('Hello', { timeout: 90_000 });
    await expect(page.locator('#ocr-text')).toContainText('42');
  });

  test('compares two drafts and marks added and removed lines', async ({ page }) => {
    await page.goto('/tools/text-diff');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.fill('#diff-left', 'a\nb\nc');
    await page.fill('#diff-right', 'a\nx\nc');
    await page.getByRole('button', { name: 'Compare texts' }).click();
    await expect(page.getByRole('status')).toContainText('1 added, 1 removed, 2 unchanged.');
    await expect(page.locator('.diff-row--added')).toHaveCount(1);
    await expect(page.locator('.diff-row--removed')).toHaveCount(1);
    await expect(page.locator('.diff-row--added .diff-text')).toHaveText('x');
    await expect(page.locator('.diff-row--removed .diff-text')).toHaveText('b');
  });

  test('shows counts and clarity estimates for pasted text', async ({ page }) => {
    await page.goto('/tools/text-statistics');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.fill('#statistics-text', 'The cat sat on the mat. It was a good day.');
    await expect(page.locator('#stat-words')).toHaveText('11');
    await expect(page.locator('#stat-sentences')).toHaveText('2');
    await expect(page.locator('#readability-score')).toContainText('100');
    await expect(page.locator('#readability-level')).toHaveText('Very easy');
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.getByText('No text yet. Paste something to see the counts.')).toBeVisible();
  });

  test('sorts, dedupes and replaces text locally', async ({ page }) => {
    await page.goto('/tools/text-transform');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.fill('#transform-text', 'banana\nApple\napple');
    await page.getByRole('button', { name: 'Sort A–Z' }).click();
    await expect(page.locator('#transform-text')).toHaveValue('Apple\napple\nbanana');
    await page.getByRole('button', { name: 'Remove duplicate lines' }).click();
    await expect(page.locator('#transform-text')).toHaveValue('Apple\nbanana');

    await page.fill('#transform-find', 'apple');
    await page.fill('#transform-replace', 'cherry');
    await page.getByRole('button', { name: 'Replace all' }).click();
    await expect(page.locator('#transform-text')).toHaveValue('cherry\nbanana');
    await expect(page.getByRole('status')).toContainText('Replaced 1 occurrence.');

    await page.getByRole('button', { name: 'Undo last change' }).click();
    await expect(page.locator('#transform-text')).toHaveValue('Apple\nbanana');
  });

  test('checks spelling, fixes it and keeps the text local', async ({ page }) => {
    await page.goto('/tools/writing-check');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.fill('#writing-text', 'I recieve the the report.');
    await page.getByRole('button', { name: 'Check the text' }).click();
    await expect(page.getByRole('status')).toContainText('Found 2 issues', { timeout: 60_000 });
    await expect(page.getByText('"recieve" may be misspelled.')).toBeVisible();

    await page.getByRole('button', { name: 'Fix all spelling' }).click();
    await expect(page.locator('#writing-text')).toHaveValue('I receive the the report.');
    await page.getByRole('button', { name: 'Fix all mechanical' }).click();
    await expect(page.locator('#writing-text')).toHaveValue('I receive the report.');

    await page.fill('#writing-text', 'I recieve the report.');
    await page.fill('#allow-word', 'recieve');
    await page.getByRole('button', { name: 'Allow word' }).click();
    await page.getByRole('button', { name: 'Check the text' }).click();
    await expect(page.getByRole('status')).toContainText('Found 0 issues');
    await page.getByRole('button', { name: 'Stop ignoring recieve' }).click();
    await expect(page.getByRole('status')).toContainText('Found 1 issue');
  });

  test('imposes eight pages as four booklet spreads', async ({ page }) => {
    await page.goto('/tools/booklet-pdf');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.locator('#booklet-input').setInputFiles({
      name: 'eight.pdf',
      mimeType: 'application/pdf',
      buffer: await createPdf(8),
    });
    await expect(page.getByRole('status')).toContainText('8 pages ready');
    await page.getByRole('button', { name: 'Make the booklet' }).click();
    await expect(page.getByRole('status')).toContainText('Made 4 sheets from 8 pages', {
      timeout: 30_000,
    });

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the PDF' }).click();
    const saved = await download;
    expect(saved.suggestedFilename()).toBe('eight-booklet.pdf');
    const pdf = await PDFDocument.load(readFileSync((await saved.path())!));
    expect(pdf.getPageCount()).toBe(4);
    expect(Math.abs(pdf.getPage(0).getWidth() - 841.89)).toBeLessThan(0.01);
    expect(Math.abs(pdf.getPage(0).getHeight() - 595.28)).toBeLessThan(0.01);
  });

  test('redacts by destroying the text on the affected page', async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 1400 });
    await page.goto('/tools/redact-pdf');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.locator('#redact-input').setInputFiles({
      name: 'memo.pdf',
      mimeType: 'application/pdf',
      buffer: await createPdf(2, { labelPrefix: 'Secret' }),
    });
    const canvas = page.locator('.redact-stage canvas');
    await canvas.waitFor({ timeout: 30_000 });
    await expect(page.getByText('Drag a box over anything that must disappear')).toBeVisible({
      timeout: 30_000,
    });
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    await page.mouse.move(box!.x + box!.width * 0.1, box!.y + box!.height * 0.15);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width * 0.1, box!.y + box!.height * 0.2);
    await page.mouse.move(box!.x + box!.width * 0.9, box!.y + box!.height * 0.35, { steps: 8 });
    await page.mouse.up();
    await expect(page.getByText('1 box on this page')).toBeVisible();
    await page.getByRole('button', { name: /Redact 1 area/ }).click();
    await expect(page.getByRole('status')).toContainText('Redacted 1 page', { timeout: 60_000 });

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the PDF' }).click();
    const saved = await download;
    const bytes = readFileSync((await saved.path())!);
    const pdfDocument = await getDocument({
      data: new Uint8Array(bytes),
      useWorkerFetch: false,
      useSystemFonts: false,
    }).promise;
    const first = await (await pdfDocument.getPage(1)).getTextContent();
    const second = await (await pdfDocument.getPage(2)).getTextContent();
    expect(first.items.map((item) => ('str' in item ? item.str : '')).join('')).toBe('');
    expect(second.items.map((item) => ('str' in item ? item.str : '')).join('')).toContain(
      'Secret 2',
    );
  });

  test('splits a PDF at its top-level bookmarks', async ({ page }) => {
    const bookmarked = await makeBookmarkedPdf(5, [
      { title: 'Introduction', page: 1 },
      { title: 'Methods', page: 3 },
    ]);

    await page.goto('/tools/split-by-bookmarks');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.locator('#bookmarks-input').setInputFiles({
      name: 'paper.pdf',
      mimeType: 'application/pdf',
      buffer: bookmarked,
    });
    await expect(page.getByRole('status')).toContainText('Found 2 bookmarks');
    await page.getByRole('button', { name: 'Split at the bookmarks' }).click();
    await expect(page.getByRole('status')).toContainText('Made 2 sections', { timeout: 30_000 });

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the ZIP' }).click();
    const saved = await download;
    expect(saved.suggestedFilename()).toBe('paper-bookmarks.zip');
  });

  test('edits the document title and downloads the updated PDF', async ({ page }) => {
    await page.goto('/tools/edit-metadata');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.locator('#metadata-input').setInputFiles({
      name: 'report.pdf',
      mimeType: 'application/pdf',
      buffer: await createPdf(1, { title: 'Old title', author: 'QA' }),
    });
    await expect(page.locator('#metadata-title')).toHaveValue('Old title');
    await expect(page.locator('#metadata-author')).toHaveValue('QA');
    await page.fill('#metadata-title', 'New title');
    await page.fill('#metadata-keywords', 'audit, 2026');
    await page.getByRole('button', { name: 'Save the details' }).click();
    await expect(page.getByRole('status')).toContainText('Updated the details of 1 page', {
      timeout: 30_000,
    });

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the PDF' }).click();
    const saved = await download;
    expect(saved.suggestedFilename()).toBe('report-metadata.pdf');
    const pdf = await PDFDocument.load(readFileSync((await saved.path())!));
    expect(pdf.getTitle()).toBe('New title');
    expect(pdf.getKeywords()).toBe('audit 2026');
    expect(pdf.getPageCount()).toBe(1);
  });

  test('lays five pages out on two A4 sheets', async ({ page }) => {
    await page.goto('/tools/n-up-pdf');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.locator('#nup-input').setInputFiles({
      name: 'five.pdf',
      mimeType: 'application/pdf',
      buffer: await createPdf(5),
    });
    await expect(page.getByRole('status')).toContainText('5 pages ready');
    await page.selectOption('#nup-count', '4');
    await page.getByRole('button', { name: 'Make the sheets' }).click();
    await expect(page.getByRole('status')).toContainText('Made 2 sheets from 5 pages', {
      timeout: 30_000,
    });

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the PDF' }).click();
    const saved = await download;
    expect(saved.suggestedFilename()).toBe('five-4up.pdf');
    const pdf = await PDFDocument.load(readFileSync((await saved.path())!));
    expect(pdf.getPageCount()).toBe(2);
    expect(Math.abs(pdf.getPage(0).getWidth() - 595.28)).toBeLessThan(0.01);
  });

  test('extracts a raster image and downloads a real PNG', async ({ page }) => {
    const pdf = await PDFDocument.create();
    const imagePage = pdf.addPage([400, 500]);
    const embedded = await pdf.embedPng(makePng(200));
    imagePage.drawImage(embedded, { x: 60, y: 120, width: 200, height: 200 });

    await page.goto('/tools/extract-images');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.locator('#extract-images-input').setInputFiles({
      name: 'brochure.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(await pdf.save()),
    });
    await page.getByRole('button', { name: 'Extract the images' }).click();
    await expect(page.getByRole('status')).toContainText('Found 1 image', { timeout: 30_000 });

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the PNG' }).click();
    const saved = await download;
    expect(saved.suggestedFilename()).toBe('brochure-image-001.png');
    const bytes = readFileSync((await saved.path())!);
    expect(bytes.subarray(0, 8).toString('latin1')).toBe('\x89PNG\r\n\x1a\n');
  });

  test('fills a text field and flattens the form', async ({ page }) => {
    const pdf = await PDFDocument.create();
    const formPage = pdf.addPage([595.28, 841.89]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const form = pdf.getForm();
    const name = form.createTextField('full_name');
    name.setText('Ada Lovelace');
    name.addToPage(formPage, { x: 72, y: 700, width: 240, height: 24, font });
    const agree = form.createCheckBox('agree');
    agree.addToPage(formPage, { x: 72, y: 660, width: 16, height: 16 });

    await page.goto('/tools/fill-forms');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.locator('#fill-input').setInputFiles({
      name: 'application.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(await pdf.save()),
    });
    await expect(page.getByRole('status')).toContainText('2 fields ready');

    await page.fill('#field-full_name', 'Grace Hopper');
    await page.check('#field-agree');
    await page.getByRole('button', { name: 'Fill the form' }).click();
    await expect(page.getByRole('status')).toContainText('Filled 2 fields and flattened', {
      timeout: 30_000,
    });

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the PDF' }).click();
    const saved = await download;
    expect(saved.suggestedFilename()).toBe('application-filled.pdf');
    const out = await PDFDocument.load(readFileSync((await saved.path())!));
    expect(out.getForm().getFields().length).toBe(0);
  });

  test('optimises a PDF losslessly and reports the outcome', async ({ page }) => {
    await page.goto('/tools/compress-pdf');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.locator('#compress-input').setInputFiles({
      name: 'office.pdf',
      mimeType: 'application/pdf',
      buffer: await createPdf(30),
    });
    await expect(page.getByRole('status')).toContainText('30 pages ready');
    await page.getByRole('button', { name: 'Optimise the PDF' }).click();
    await expect(page.getByRole('status')).toContainText(/Saved \d+%|already as small/, {
      timeout: 60_000,
    });
  });

  test('protects a PDF, then unlocks the downloaded copy with the same password', async ({ page }) => {
    await page.goto('/tools/protect-pdf');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.locator('#protect-input').setInputFiles({
      name: 'contract.pdf',
      mimeType: 'application/pdf',
      buffer: await createPdf(1),
    });
    await page.fill('#protect-password', 'correct horse battery');
    await page.fill('#protect-confirm', 'correct horse battery');
    await page.getByRole('button', { name: 'Add the password' }).click();
    await expect(page.getByRole('status')).toContainText('Protected 1 page', { timeout: 60_000 });

    const protectedDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the PDF' }).click();
    const protectedFile = await protectedDownload;
    expect(protectedFile.suggestedFilename()).toBe('contract-protected.pdf');
    const protectedPath = await protectedFile.path();
    await expect(PDFDocument.load(readFileSync(protectedPath!))).rejects.toThrow();

    await page.goto('/tools/unlock-pdf');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.locator('#unlock-input').setInputFiles({
      name: 'contract-protected.pdf',
      mimeType: 'application/pdf',
      buffer: readFileSync(protectedPath!),
    });
    await page.fill('#unlock-password', 'correct horse battery');
    await page.getByRole('button', { name: 'Remove the password' }).click();
    await expect(page.getByRole('status')).toContainText('Unlocked 1 page', { timeout: 60_000 });

    const openDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the PDF' }).click();
    const openFile = await openDownload;
    const pdf = await PDFDocument.load(readFileSync((await openFile.path())!));
    expect(pdf.getPageCount()).toBe(1);
  });

  test('refuses a file that is not a PDF in Repair and explains why', async ({ page }) => {
    await page.goto('/tools/repair-pdf');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.locator('#repair-input').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not a pdf', 'utf8'),
    });
    await page.getByRole('button', { name: 'Repair the PDF' }).click();
    await expect(page.getByText('does not start like a PDF')).toBeVisible();
  });

  test('refuses more than 20 OCR pages and serves the OCR assets itself', async ({ page, request }) => {
    await page.goto('/tools/ocr-pdf');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();
    await page.locator('#ocr-input').setInputFiles({
      name: 'long.pdf',
      mimeType: 'application/pdf',
      buffer: await createPdf(21),
    });
    await page.fill('#ocr-range', '1-21');
    await expect(page.getByText(/OCR stops at 20 pages/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Read the text (OCR)' })).toBeDisabled();

    expect((await request.get('/ocr/worker.min.js')).status()).toBe(200);
    expect((await request.get('/ocr/core/tesseract-core-simd-lstm.wasm')).status()).toBe(200);
    expect((await request.get('/ocr/lang/eng.traineddata.gz')).status()).toBe(200);
  });

  test('renders a page as WebP and disables unsupported formats', async ({ page }) => {
    await page.goto('/tools/pdf-to-image');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();

    const avifSupported = await page.evaluate(() =>
      document.createElement('canvas').toDataURL('image/avif').startsWith('data:image/avif'),
    );
    expect(await page.locator('#render-format option[value="avif"]').isDisabled()).toBe(
      !avifSupported,
    );

    await page.selectOption('#render-format', 'webp');
    await page.selectOption('#render-dpi', '72');
    await page.fill('#render-range', '1');
    await page.locator('#render-file').setInputFiles({
      name: 'one-page.pdf',
      mimeType: 'application/pdf',
      buffer: await createPdf(1),
    });
    await expect(page.getByRole('status')).toContainText('1 page rendered', { timeout: 60_000 });

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: /Download the WEBP/ }).click();
    const saved = await download;
    expect(saved.suggestedFilename()).toBe('one-page-page-001.webp');
    const path = await saved.path();
    const bytes = readFileSync(path!);
    expect(bytes.subarray(0, 4).toString('latin1')).toBe('RIFF');
    expect(bytes.subarray(8, 12).toString('latin1')).toBe('WEBP');
  });

  test('validates range live, collapses >5 files in disclosure, and cancels mid-render', async ({ page }) => {
    await page.goto('/tools/pdf-to-image');
    await expect(page.locator('[data-ready="true"]')).toBeVisible();

    const rangeInput = page.locator('#render-range');
    await rangeInput.fill('5-2');
    await expect(rangeInput).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#render-range-error')).toBeVisible();
    await rangeInput.fill('');
    await expect(rangeInput).not.toHaveAttribute('aria-invalid', 'true');

    await page.selectOption('#render-format', 'jpeg');
    await page.selectOption('#render-dpi', '72');
    await page.locator('#render-file').setInputFiles({
      name: 'six-pages.pdf',
      mimeType: 'application/pdf',
      buffer: await createPdf(6),
    });

    await expect(page.getByRole('status')).toContainText('6 pages rendered', { timeout: 60_000 });
    const disclosure = page.locator('.file-disclosure');
    await expect(disclosure).toBeVisible();
    await expect(disclosure.locator('.file-list li').first()).toBeHidden();
    await disclosure.locator('summary').click();
    await expect(disclosure.locator('.file-list li')).toHaveCount(6);

    await page.selectOption('#render-dpi', '300');
    await page.locator('#render-file').setInputFiles({
      name: 'thirty-pages.pdf',
      mimeType: 'application/pdf',
      buffer: await createPdf(30),
    });
    const cancelBtn = page.getByRole('button', { name: 'Cancel' });
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();
    await expect(page.locator('#render-progress')).toBeHidden();
    await expect(page.getByRole('status')).toContainText('Rendering cancelled.');
  });
});
