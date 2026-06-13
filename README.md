# Continue with Google

The package provides a two-factor authentication with Google via Puppeteer.

## Installation

```shell
npm install @thetypefounders/continue-with-google --save
```

## Usage

```javascript
import { authenticate } from '@thetypefounders/continue-with-google';
import Puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

Puppeteer.use(StealthPlugin());

const browser = await Puppeteer.launch();
const page = await browser.newPage();

// Go to a page that supports Google.
await page.goto('...');
await page.waitForSelector('...');

// Click on the continue-with-Google button.
await page.click('...');

// Finalize the authorization flow and wait for a selector after redirection.
const element = await authenticate(page, email, password, secret, selector);
```

## Maintenance

The logic relies on specific selectors for Google's sign-in screens (the email,
password, CAPTCHA, and verification-code fields). Google's sign-in flow is a
living organism: its layout and markup change without notice, which means these
selectors will inevitably break and have to be updated periodically.
