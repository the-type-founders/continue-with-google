import 'dotenv/config';
import assert from 'node:assert';
import PuppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { test } from 'vitest';

import { type UserCredentials } from '../src/authenticate.js';
import { type ClientCredentials, authorize } from '../src/authorize.js';

const clientCredentials: ClientCredentials = {
  id: process.env.GOOGLE_CLIENT_ID!,
  secret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: process.env.GOOGLE_CLIENT_REDIRECT_URI!,
  scopes: ['openid'],
};

const userCredentials: UserCredentials = {
  email: process.env.GOOGLE_USER_EMAIL!,
  password: process.env.GOOGLE_USER_PASSWORD!,
  secret: process.env.GOOGLE_USER_SECRET!,
};

test('authorize', { timeout: 5 * 60 * 1000 }, async () => {
  PuppeteerExtra.use(StealthPlugin());
  const browser = await PuppeteerExtra.launch({
    args: ['--no-sandbox'],
    slowMo: parseInt(process.env.PUPPETEER_SLOW_MOTION || '100'),
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 1000 });
    const client = await authorize(clientCredentials, userCredentials, page, {
      trialTimeoutSeconds: 10,
      screenshot: 'log',
      waitForSelector: { timeout: 0 },
    });

    assert.ok(client.credentials.access_token);
  } finally {
    await browser.close();
  }
});
