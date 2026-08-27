import 'dotenv/config';
import assert from 'node:assert';
import { test } from 'vitest';

import { type ClientCredentials } from '../src/authorize.js';
import { refresh } from '../src/refresh.js';

const clientCredentials: ClientCredentials = {
  id: process.env.GOOGLE_CLIENT_ID!,
  secret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: process.env.GOOGLE_CLIENT_REDIRECT_URI!,
  scopes: ['openid'],
};

test('refresh', async () => {
  const client = await refresh(
    clientCredentials,
    process.env.GOOGLE_REFRESH_TOKEN!
  );
  const { token } = await client.getAccessToken();

  assert.ok(token);
});
