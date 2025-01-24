import { generateToken } from 'authenticator';
import { setTimeout } from 'node:timers/promises';
import { ElementHandle, Page } from 'puppeteer';

export interface Logger {
  info(message: string): void;
}

export async function authenticate(
  page: Page,
  email: string,
  password: string,
  secret: string,
  target: string,
  logger: Logger = console,
  attemptCount: number = 3,
  attemptSeconds: number = 30
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
    attempt < attemptCount && !found;
    attempt++
  ) {
    if (attempt > 0) {
      logger.info(`Challenged on attempt ${attempt}. Entering the code...`);
      if (attempt > 1) {
        await setTimeout(1000 * attemptSeconds);
      }
      const code = generateToken(secret);
      await page.evaluate(() => {
        const field = document.querySelector('input[type=tel]');
        (field as HTMLInputElement)?.setAttribute('value', '');
      });
      await page.type('input[type=tel]', code);
      await page.keyboard.press('Enter');
      await waitForPeace(page, logger);
    }
    found = await Promise.any([
      page.waitForSelector(target).then(() => true),
      page
        .waitForSelector('input[type=tel]', { visible: true })
        .then(() => false),
    ]);
  }

  return await page.$(target);
}

async function waitForPeace(
  page: Page,
  logger: Logger,
  attemptCount: number = 10,
  attemptSeconds: number = 2
): Promise<void> {
  for (
    let attempt = -1, previous = undefined, current = undefined;
    attempt < attemptCount && (current === undefined || previous !== current);
    attempt++
  ) {
    if (attempt > 0) {
      logger.info(`Changed on attempt ${attempt}. Taking a screenshot...`);
    }
    if (attempt > -1) {
      await setTimeout(1000 * attemptSeconds);
    }
    const future = await screenshot(page);
    if (future) {
      previous = current;
      current = future;
    }
  }
}

async function screenshot(page: Page): Promise<string | undefined> {
  try {
    const content = '* { caret-color: transparent !important; }';
    await page.addStyleTag({ content });
    return await page.screenshot({ encoding: 'base64' });
  } catch {
    return undefined;
  }
}
