import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const ROUTES = ['/', '/privacy', '/tools/inspect-pdf', '/tools/pdf-to-image', '/tools/images-to-pdf', '/tools/merge-pdf', '/tools/split-pdf'];

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
