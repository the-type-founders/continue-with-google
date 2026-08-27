import { CodeChallengeMethod, OAuth2Client } from 'google-auth-library';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { type Page } from 'puppeteer';

import {
  type Options,
  type UserCredentials,
  authenticate,
} from './authenticate.js';
import { type Logger } from './index.js';

export type ClientCredentials = {
  id: string;
  secret: string;
  redirectUri: string;
  scopes: string[];
};

const CONSENT_SELECTOR = '#submit_approve_access, ::-p-aria(Continue)';

export async function authorize(
  clientCredentials: ClientCredentials,
  userCredentials: UserCredentials,
  page: Page,
  options: Options = {},
  logger: Logger = console
): Promise<OAuth2Client> {
  const client = new OAuth2Client(
    clientCredentials.id,
    clientCredentials.secret,
    clientCredentials.redirectUri
  );

  const redirectUri = new URL(clientCredentials.redirectUri);
  const state = randomBytes(32).toString('base64url');
  const { codeChallenge, codeVerifier } =
    await client.generateCodeVerifierAsync();
  const url = client.generateAuthUrl({
    access_type: 'offline',
    code_challenge: codeChallenge,
    code_challenge_method: CodeChallengeMethod.S256,
    hl: 'en',
    prompt: 'consent',
    scope: clientCredentials.scopes,
    state,
  });

  const code = await requestCode(
    redirectUri,
    state,
    page,
    url,
    userCredentials,
    options,
    logger
  );
  const { tokens } = await client.getToken({ code, codeVerifier });
  client.setCredentials(tokens);
  return client;
}

async function requestCode(
  redirectUri: URL,
  state: string,
  page: Page,
  url: string,
  userCredentials: UserCredentials,
  options: Options,
  logger: Logger
): Promise<string> {
  return await new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      try {
        const callback = new URL(request.url || '/', redirectUri);
        if (callback.searchParams.get('state') !== state) {
          throw new Error('found an invalid state');
        }
        const error = callback.searchParams.get('error');
        if (error) {
          throw new Error(`failed to authorize due to ${error}`);
        }
        const code = callback.searchParams.get('code');
        if (!code) {
          throw new Error('found no authorization code');
        }
        response.end();
        resolve(code);
      } catch (cause) {
        response.writeHead(400).end();
        reject(cause);
      } finally {
        server.close();
      }
    });
    server.once('error', reject);

    const host = redirectUri.hostname.replace(/^\[(.*)\]$/, '$1');
    const port = parseInt(redirectUri.port || '80');
    server.listen(port, host, async () => {
      try {
        await page.goto(url);
        const consent = await authenticate(
          userCredentials,
          page,
          CONSENT_SELECTOR,
          options,
          logger
        );
        if (!consent) {
          throw new Error('failed to reach the consent screen');
        }
        await consent.click();
      } catch (cause) {
        server.close();
        reject(cause);
      }
    });
  });
}
