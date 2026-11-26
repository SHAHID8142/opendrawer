import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const ROUTES = ['/', '/tools/inspect-pdf', '/tools/pdf-to-image'];

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
    await expect(page.getByRole('link', { name: 'Inspect PDF' })).toBeVisible();
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
        const overflow = await page.evaluate(() => {
          const element = document.documentElement;
          return element.scrollWidth - element.clientWidth;
        });
        expect(overflow, `horizontal overflow on ${route}`).toBeLessThanOrEqual(1);
      }
    });
  }
});

test.describe('UI-G5 target size', () => {
  test('every button and button-like link is at least 44px tall', async ({ page }) => {
    await page.goto('/tools/inspect-pdf');
    const targets = page.locator('button, [role="button"], a.btn');
    const count = await targets.count();
    expect(count).toBeGreaterThan(0);
    for (let index = 0; index < count; index += 1) {
      const box = await targets.nth(index).boundingBox();
      expect(box, `target ${index} has no box`).not.toBeNull();
      if (box) {
        expect(box.height, `target ${index} height`).toBeGreaterThanOrEqual(44);
        expect(box.width, `target ${index} width`).toBeGreaterThanOrEqual(44);
      }
    }
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
  test('inspects a fixture and makes no off-origin request', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));

    await page.goto('/tools/inspect-pdf');
    // The island accepts files only after hydration; without this the change can race it.
    await expect(page.locator('[data-ready="true"]')).toBeVisible();

    const pdf = await PDFDocument.create();
    pdf.setTitle('Gate fixture');
    pdf.setAuthor('Gate');
    const pageOne = pdf.addPage([595.28, 841.89]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    pageOne.drawText('fixture page', { x: 72, y: 700, size: 12, font });
    const bytes = await pdf.save();

    await page.locator('#inspect-file').setInputFiles({
      name: 'fixture.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(bytes),
    });

    await expect(page.getByRole('status')).toContainText('Report ready', { timeout: 20_000 });
    await expect(page.getByText('Gate fixture')).toBeVisible();
    await expect(page.getByText('A4')).toBeVisible();

    const origin = new URL(page.url()).origin;
    const foreign = requests.filter((url) => {
      if (url.startsWith('data:') || url.startsWith('blob:')) return false;
      return new URL(url).origin !== origin;
    });
    expect(foreign, 'requests that left the origin').toEqual([]);
  });

  test('renders two pages to a ZIP without leaving the origin', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));

    await page.goto('/tools/pdf-to-image');
    // The island hydrates when it becomes visible; settings chosen before that would be reset.
    await page.waitForSelector('[data-ready="true"]');
    await page.selectOption('#render-format', 'jpeg');
    await page.selectOption('#render-dpi', '72');

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    for (const label of ['first', 'second']) {
      const created = pdf.addPage([595.28, 841.89]);
      created.drawText(`page ${label}`, { x: 72, y: 700, size: 18, font });
    }
    const bytes = await pdf.save();

    await page.locator('#render-file').setInputFiles({
      name: 'two-pages.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(bytes),
    });

    await expect(page.getByRole('status')).toContainText('2 pages rendered', { timeout: 60_000 });
    await expect(page.getByText('two-pages-page-001.jpg')).toBeVisible();

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download the ZIP' }).click();
    const saved = await download;
    expect(saved.suggestedFilename()).toBe('two-pages-images.zip');

    const origin = new URL(page.url()).origin;
    const foreign = requests.filter((url) => {
      if (url.startsWith('data:') || url.startsWith('blob:')) return false;
      return new URL(url).origin !== origin;
    });
    expect(foreign, 'requests that left the origin').toEqual([]);
  });
});
