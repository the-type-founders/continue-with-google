# Continue with Google

The package provides a two-factor authentication with Google via Puppeteer.

## Installation

```shell
npm install @thetypefounders/continue-with-google --save
```

## Usage

```javascript
import { authenticate } from '@thetypefounders/continue-with-google';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
const page = await browser.newPage();

// Go to a page that supports Google.
await page.goto('...');
await page.waitForSelector('...');

// Click on the continue-with-Google button.
await page.click('...');

// Finalize the authorization flow and wait for a selector after redirection.
const element = await authenticate(page, email, password, secret, selector);
```
