# Continue with Google

The package signs users into websites with Google via Puppeteer and authorizes
clients to call Google APIs using OAuth 2.0.

## Installation

```shell
npm install @thetypefounders/continue-with-google --save
```

## Browser authentication

```javascript
import { authenticate } from '@thetypefounders/continue-with-google/authenticate.js';
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

// Finish signing in and wait for a selector after redirection.
const userCredentials = { email, password, secret };
const element = await authenticate(userCredentials, page, selector);
```

## API authorization

Define a Google OAuth client and the user who will grant it access. Scopes are
part of the client configuration because they describe the access it requests.
The redirect URI must be an HTTP loopback address, such as
`http://127.0.0.1:3000`.

```javascript
import { authorize } from '@thetypefounders/continue-with-google/authorize.js';
import { refresh } from '@thetypefounders/continue-with-google/refresh.js';

const clientCredentials = {
  id,
  secret: '...', // OAuth client secret.
  redirectUri,
  scopes,
};
const userCredentials = {
  email,
  password,
  secret: '...', // TOTP secret.
};
```

When the user already has a refresh token, use it without a browser:

```javascript
const client = await refresh(clientCredentials, refreshToken);
```

To obtain a refresh token, provide a Puppeteer page. The package opens Google's
authorization page, signs the user in, handles consent, waits for the OAuth
callback, and returns the authorization together with the refresh token obtained
from Google.

```javascript
const browser = await Puppeteer.launch();
const page = await browser.newPage();
const client = await authorize(clientCredentials, userCredentials, page);
const refreshToken = client.credentials.refresh_token ?? null;
```

If `refreshToken` is not `null`, store it securely and pass it to `refresh` on
subsequent runs. Both `authorize` and `refresh` return `google-auth-library`
OAuth clients that can be passed to any compatible Google API client.

## Maintenance

The logic relies on specific selectors for Google's sign-in and consent screens
(the email, password, CAPTCHA, verification-code, and consent fields). Google's
flows are living organisms: their layout and markup change without notice, which
means these selectors will inevitably break and have to be updated periodically.
