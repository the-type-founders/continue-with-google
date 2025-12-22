import 'dotenv/config';
import assert from 'node:assert';
import PuppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { test } from 'vitest';

import { authenticate } from '../src/index.js';

test('authenticate', { timeout: 5 * 60 * 1000 }, async () => {
  PuppeteerExtra.use(StealthPlugin());
  const browser = await PuppeteerExtra.launch({
    args: ['--no-sandbox'],
    slowMo: parseInt(process.env.PUPPETEER_SLOW_MOTION || '100'),
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://mail.google.com');
    await assert.doesNotReject(
      authenticate(
        page,
        process.env.GOOGLE_USER_EMAIL!,
        process.env.GOOGLE_USER_PASSWORD!,
        process.env.GOOGLE_USER_SECRET!,
        '[aria-label="Search mail"]'
      )
    );
  } finally {
    await browser.close();
  }
});
