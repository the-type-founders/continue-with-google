# Continue with Google

The package provides a two-factor authentication with Google via Puppeteer.

## Installation

```shell
npm install @thetypefounders/continue-with-google --save
```

## Usage

```javascript
import Puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { authenticate } from '@thetypefounders/continue-with-google';

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
