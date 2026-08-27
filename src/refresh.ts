import { OAuth2Client } from 'google-auth-library';

import { type ClientCredentials } from './authorize.js';

export async function refresh(
  clientCredentials: ClientCredentials,
  token: string
): Promise<OAuth2Client> {
  const client = new OAuth2Client(
    clientCredentials.id,
    clientCredentials.secret,
    clientCredentials.redirectUri
  );
  client.setCredentials({ refresh_token: token });
  return client;
}
