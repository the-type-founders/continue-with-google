import 'dotenv/config';
import assert from 'node:assert';
import PuppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { test } from 'vitest';

import { authenticate } from '../src/authenticate.js';

test('authenticate', { timeout: 5 * 60 * 1000 }, async () => {
  PuppeteerExtra.use(StealthPlugin());
  const browser = await PuppeteerExtra.launch({
    args: ['--no-sandbox'],
    slowMo: 100,
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://mail.google.com');
    await assert.doesNotReject(
      authenticate(
        {
          email: process.env.GOOGLE_USER_EMAIL!,
          password: process.env.GOOGLE_USER_PASSWORD!,
          secret: process.env.GOOGLE_USER_SECRET!,
        },
        page,
        '[aria-label="Search mail"]',
        { screenshot: 'log' }
      )
    );
  } finally {
    await browser.close();
  }
});
