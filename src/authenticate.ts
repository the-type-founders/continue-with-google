import { generateToken } from 'authenticator';
import { writeFile } from 'fs/promises';
import { setTimeout } from 'node:timers/promises';
import {
  type ElementHandle,
  type Page,
  type WaitForSelectorOptions,
} from 'puppeteer';

import { type Logger } from './index.js';

export type Options = {
  challengeCount?: number;
  challengeTimeoutSeconds?: number;
  trialCount?: number;
  trialTimeoutSeconds?: number;
  screenshot?: string;
  waitForSelector?: WaitForSelectorOptions;
};

export type UserCredentials = {
  email: string;
  password: string;
  secret: string;
};

const DEFAULTS: Options = {
  challengeCount: 3,
  challengeTimeoutSeconds: 30,
  trialCount: 10,
  trialTimeoutSeconds: 2,
};

// Each selector lists the current layout first and the previous one as a
// fallback; as observed on June 11, 2026, the email field switched from
// type=email to type=text but kept its id, and the CAPTCHA field is matched by
// either its id or name.
const EMAIL_SELECTOR = 'input#identifierId, input[type=email]';
const PASSWORD_SELECTOR = 'input[type=password]';
const CAPTCHA_SELECTOR = 'input#ca, input[name=ca]';
const CODE_SELECTOR = 'input[type=tel]';

export class CaptchaError extends Error {}

export async function authenticate(
  userCredentials: UserCredentials,
  page: Page,
  selector: string,
  options: Options = DEFAULTS,
  logger: Logger = console
): Promise<ElementHandle | null> {
  const mergedOptions = { ...DEFAULTS, ...options };

  logger.info('Waiting to enter the email...');
  await showScreenshot(page, mergedOptions.screenshot, logger);
  await page.waitForSelector(EMAIL_SELECTOR, { visible: true });

  logger.info('Entering the email...');
  await showScreenshot(page, mergedOptions.screenshot, logger);
  await page.type(EMAIL_SELECTOR, userCredentials.email);
  await page.keyboard.press('Enter');

  logger.info('Waiting to enter the password...');
  await showScreenshot(page, mergedOptions.screenshot, logger);
  const captcha = await Promise.any([
    page
      .waitForSelector(PASSWORD_SELECTOR, { visible: true })
      .then(() => false),
    page.waitForSelector(CAPTCHA_SELECTOR, { visible: true }).then(() => true),
  ]);
  if (captcha) {
    throw new CaptchaError('failed to proceed due to CAPTCHA');
  }

  logger.info('Entering the password...');
  await showScreenshot(page, mergedOptions.screenshot, logger);
  await page.type(PASSWORD_SELECTOR, userCredentials.password);
  await page.keyboard.press('Enter');

  for (
    let attempt = 0, found = false;
    attempt < mergedOptions.challengeCount! && !found;
    attempt++
  ) {
    if (attempt > 0) {
      logger.warn(`Challenged on attempt ${attempt}. Entering the code...`);
      await showScreenshot(page, mergedOptions.screenshot, logger);
      if (attempt > 1) {
        await setTimeout(1000 * mergedOptions.challengeTimeoutSeconds!);
      }
      const code = generateToken(userCredentials.secret);
      await page.evaluate((query) => {
        const field = document.querySelector(query);
        (field as HTMLInputElement)?.setAttribute('value', '');
      }, CODE_SELECTOR);
      await page.type(CODE_SELECTOR, code);
      await page.keyboard.press('Enter');
      await waitForTrial(
        page,
        mergedOptions.trialCount!,
        mergedOptions.trialTimeoutSeconds!,
        mergedOptions.screenshot,
        logger
      );
    }
    found = await Promise.any([
      page
        .waitForSelector(selector, mergedOptions.waitForSelector)
        .then(() => true),
      page.waitForSelector(CODE_SELECTOR, { visible: true }).then(() => false),
    ]);
  }

  return await page.$(selector);
}

async function saveImage(data: string): Promise<void> {
  const timestamp = new Date(Date.now()).toISOString().replaceAll(':', '-');
  const path = `continue-with-google-${timestamp}.png`;
  const buffer = Buffer.from(data, 'base64');
  await writeFile(path, buffer);
}

async function showScreenshot(
  page: Page,
  mode: string | undefined,
  logger: Logger
): Promise<void> {
  if (mode === 'log') {
    const content = await takeContent(page, logger);
    if (content) logger.info(`\n${content.split(/\r?\n/).join(' ↵ ')}\n`);
  } else if (mode === 'file') {
    const image = await takeImage(page, logger);
    if (image) await saveImage(image);
  }
}

async function takeContent(
  page: Page,
  logger: Logger
): Promise<string | undefined> {
  try {
    return await page.evaluate(() => document.body.innerText);
  } catch (cause) {
    logger.error(new Error(`failed to take the content`, { cause }));
    return undefined;
  }
}

async function takeImage(
  page: Page,
  logger: Logger
): Promise<string | undefined> {
  try {
    const content = '* { caret-color: transparent !important; }';
    await page.addStyleTag({ content });
    return await page.screenshot({ encoding: 'base64' });
  } catch (cause) {
    logger.error(new Error(`failed to take a screenshot`, { cause }));
    return undefined;
  }
}

async function waitForTrial(
  page: Page,
  attemptCount: number,
  attemptTimeoutSeconds: number,
  screenshot: string | undefined,
  logger: Logger
): Promise<void> {
  for (
    let attempt = -1, previous = undefined, current = undefined;
    attempt < attemptCount && (current === undefined || previous !== current);
    attempt++
  ) {
    if (attempt > 0) {
      logger.warn(`Tried on attempt ${attempt}. Waiting to finish...`);
      await showScreenshot(page, screenshot, logger);
    }
    if (attempt > -1) {
      await setTimeout(1000 * attemptTimeoutSeconds);
    }
    const future = await takeImage(page, logger);
    if (future) {
      previous = current;
      current = future;
    }
  }
}
