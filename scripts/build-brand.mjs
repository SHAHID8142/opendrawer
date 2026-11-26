// SPDX-License-Identifier: AGPL-3.0-or-later
// Renders PNG brand assets (app icons and Open Graph card) from public/brand/mark-color.svg.
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const root = new URL('../', import.meta.url).pathname;
const brandDir = join(root, 'public/brand');
const FONT_SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const markSvg = (await readFile(join(brandDir, 'mark-color.svg'), 'utf8'))
  .replace(/<\?xml[^>]*\?>\s*/, '')
  .trim();

function iconHtml(size, markSize) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${size}px;
    height: ${size}px;
    overflow: hidden;
    background: radial-gradient(circle at 32% 24%, #fffdf8 0%, #fcfaf6 60%, #f4f0e8 100%);
    display: grid;
    place-items: center;
  }
  .mark {
    width: ${markSize}px;
    height: ${markSize}px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .mark svg {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
</head>
<body>
  <div class="mark">${markSvg}</div>
</body>
</html>`;
}

function ogHtml() {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 1200px;
    height: 630px;
    overflow: hidden;
    background: linear-gradient(155deg, #f6f3ec 0%, #f4f0e8 55%, #ede7dc 100%);
    font-family: ${FONT_SANS};
    color: #16140f;
    padding: 36px;
    display: flex;
  }
  .card {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, #fffdf8 0%, #fcfaf6 100%);
    border-radius: 24px;
    overflow: hidden;
    border: 1px solid rgba(22, 20, 15, 0.07);
    box-shadow:
      0 24px 48px -14px rgba(22, 20, 15, 0.14),
      0 6px 14px rgba(22, 20, 15, 0.05),
      inset 0 2px 0 #fffdf8,
      inset 0 -3px 0 rgba(212, 203, 188, 0.45);
  }
  .rule {
    height: 8px;
    background: #b83510;
    flex-shrink: 0;
  }
  .inner {
    flex: 1;
    padding: 52px 64px 46px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }
  .lockup {
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .lockup svg {
    width: 58px;
    height: 58px;
    display: block;
  }
  .wordmark {
    font-size: 36px;
    font-weight: 700;
    letter-spacing: -0.025em;
    color: #16140f;
    line-height: 1;
  }
  .badge {
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: #57523f;
    background: #f4f0e8;
    padding: 10px 18px;
    border-radius: 999px;
    box-shadow:
      inset 0 1px 0 #fffdf8,
      inset 0 -1px 0 rgba(22, 20, 15, 0.07),
      0 2px 6px rgba(22, 20, 15, 0.05);
  }
  h1 {
    font-size: 62px;
    font-weight: 700;
    line-height: 1.08;
    letter-spacing: -0.03em;
    color: #16140f;
    max-width: 19ch;
  }
  .footer {
    border-top: 1px solid rgba(22, 20, 15, 0.1);
    padding-top: 22px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 20px;
    font-weight: 500;
    letter-spacing: -0.01em;
    color: #57523f;
  }
  .dot-accent {
    color: #b83510;
    font-weight: 700;
    margin: 0 6px;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="rule"></div>
    <div class="inner">
      <div class="top">
        <div class="lockup">
          ${markSvg}
          <span class="wordmark">OpenDrawer</span>
        </div>
        <div class="badge">PUBLIC GOOD · AGPL-3.0</div>
      </div>
      <h1>Everyday file tools, kept on your device.</h1>
      <div class="footer">
        <span>0 uploads<span class="dot-accent">·</span>No accounts<span class="dot-accent">·</span>Runs in your browser</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function renderPng(browser, html, width, height, outPath) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  await page.setContent(html, { waitUntil: 'load' });
  const buffer = await page.screenshot({ type: 'png' });
  await writeFile(outPath, buffer);
  await page.close();
}

const browser = await chromium.launch();
try {
  await renderPng(browser, iconHtml(180, 122), 180, 180, join(brandDir, 'apple-touch-icon.png'));
  await renderPng(browser, iconHtml(512, 348), 512, 512, join(brandDir, 'icon-512.png'));
  await renderPng(browser, ogHtml(), 1200, 630, join(brandDir, 'og.png'));
} finally {
  await browser.close();
}

console.log('Generated apple-touch-icon.png (180x180), icon-512.png (512x512), og.png (1200x630).');
