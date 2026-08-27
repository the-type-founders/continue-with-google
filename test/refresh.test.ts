import 'dotenv/config';
import assert from 'node:assert';
import { test } from 'vitest';

import { type Client } from '../src/authorize.js';
import { refresh } from '../src/refresh.js';

const client: Client = {
  id: process.env.GOOGLE_CLIENT_ID!,
  secret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: process.env.GOOGLE_CLIENT_REDIRECT_URI!,
  scopes: ['openid'],
};

test('refresh', async () => {
  const oauthClient = await refresh(client, process.env.GOOGLE_REFRESH_TOKEN!);
  const { token } = await oauthClient.getAccessToken();

  assert.ok(token);
});
