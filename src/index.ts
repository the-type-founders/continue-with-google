import { generateToken } from 'authenticator';
import { writeFile } from 'fs/promises';
import { setTimeout } from 'node:timers/promises';
import { type ElementHandle, Page, WaitForSelectorOptions } from 'puppeteer';

export interface Logger {
  info(value: any): void;
  warn(value: any): void;
  error(value: any): void;
}

export type Options = {
  challengeCount?: number;
  challengeTimeoutSeconds?: number;
  trialCount?: number;
  trialTimeoutSeconds?: number;
  screenshot?: string;
  waitForSelector?: WaitForSelectorOptions;
};

const DEFAULTS: Options = {
  challengeCount: 3,
  challengeTimeoutSeconds: 30,
  trialCount: 10,
  trialTimeoutSeconds: 2,
};

export async function authenticate(
  page: Page,
  email: string,
  password: string,
  secret: string,
  selector: string,
  options: Options = DEFAULTS,
  logger: Logger = console
): Promise<ElementHandle | null> {
  const mergedOptions = { ...DEFAULTS, ...options };

  logger.info('Waiting to enter the email...');
  await showScreenshot(page, mergedOptions.screenshot, logger);
  await page.waitForSelector('input[type=email]', { visible: true });

  logger.info('Entering the email...');
  await showScreenshot(page, mergedOptions.screenshot, logger);
  await page.type('input[type=email]', email);
  await page.keyboard.press('Enter');

  logger.info('Waiting to enter the password...');
  await showScreenshot(page, mergedOptions.screenshot, logger);
  await page.waitForSelector('input[type=password]', { visible: true });

  logger.info('Entering the password...');
  await showScreenshot(page, mergedOptions.screenshot, logger);
  await page.type('input[type=password]', password);
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
      const code = generateToken(secret);
      await page.evaluate(() => {
        const field = document.querySelector('input[type=tel]');
        (field as HTMLInputElement)?.setAttribute('value', '');
      });
      await page.type('input[type=tel]', code);
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
      page
        .waitForSelector('input[type=tel]', { visible: true })
        .then(() => false),
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
