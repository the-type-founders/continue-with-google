import { generateToken } from 'authenticator';
import { setTimeout } from 'node:timers/promises';
import { type ElementHandle, Page, WaitForSelectorOptions } from 'puppeteer';

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
}

export type Options = {
  challengeCount?: number;
  challengeTimeoutSeconds?: number;
  challengeScreenshot?: boolean;
  trialCount?: number;
  trialTimeoutSeconds?: number;
  trialScreenshot?: boolean;
  waitForSelector?: WaitForSelectorOptions;
};

const DEFAULTS: Options = {
  challengeCount: 3,
  challengeTimeoutSeconds: 30,
  challengeScreenshot: false,
  trialCount: 10,
  trialTimeoutSeconds: 2,
  trialScreenshot: false,
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
  logger.info('Waiting to enter the email...');
  await page.waitForSelector('input[type=email]', { visible: true });
  logger.info('Entering the email...');
  await page.type('input[type=email]', email);
  await page.keyboard.press('Enter');

  logger.info('Waiting to enter the password...');
  await page.waitForSelector('input[type=password]', { visible: true });
  logger.info('Entering the password...');
  await page.type('input[type=password]', password);
  await page.keyboard.press('Enter');

  for (
    let attempt = 0, found = false;
    attempt < (options.challengeCount || DEFAULTS.challengeCount!) && !found;
    attempt++
  ) {
    if (attempt > 0) {
      logger.warn(`Challenged on attempt ${attempt}. Entering the code...`);
      if (options.challengeScreenshot) await takeScreenshotToDisplay(page);
      if (attempt > 1) {
        await setTimeout(
          1000 *
            (options.challengeTimeoutSeconds ||
              DEFAULTS.challengeTimeoutSeconds!)
        );
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
        options.trialCount || DEFAULTS.trialCount!,
        options.trialTimeoutSeconds || DEFAULTS.trialTimeoutSeconds!,
        options.trialScreenshot || DEFAULTS.trialScreenshot!,
        logger
      );
    }
    found = await Promise.any([
      page.waitForSelector(selector, options.waitForSelector).then(() => true),
      page
        .waitForSelector('input[type=tel]', { visible: true })
        .then(() => false),
    ]);
  }

  return await page.$(selector);
}

async function waitForTrial(
  page: Page,
  attemptCount: number,
  attemptTimeoutSeconds: number,
  attemptScreenshot: boolean,
  logger: Logger
): Promise<void> {
  for (
    let attempt = -1, previous = undefined, current = undefined;
    attempt < attemptCount && (current === undefined || previous !== current);
    attempt++
  ) {
    if (attempt > 0) {
      logger.warn(`Tried on attempt ${attempt}. Waiting to finish...`);
      if (attemptScreenshot) await takeScreenshotToDisplay(page);
    }
    if (attempt > -1) {
      await setTimeout(1000 * attemptTimeoutSeconds);
    }
    const future = await takeScreenshotToCompare(page);
    if (future) {
      previous = current;
      current = future;
    }
  }
}

async function takeScreenshotToCompare(
  page: Page
): Promise<string | undefined> {
  try {
    const content = '* { caret-color: transparent !important; }';
    await page.addStyleTag({ content });
    return await page.screenshot({ encoding: 'base64' });
  } catch {
    return undefined;
  }
}

async function takeScreenshotToDisplay(page: Page): Promise<void> {
  await page.screenshot({
    path: `continue-with-google-${new Date(Date.now()).toISOString()}.png`,
  });
}
