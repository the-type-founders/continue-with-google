import { OAuth2Client } from 'google-auth-library';

import { type Client } from './authorize.js';

export async function refresh(
  client: Client,
  token: string
): Promise<OAuth2Client> {
  const oauthClient = new OAuth2Client(
    client.id,
    client.secret,
    client.redirectUri
  );
  oauthClient.setCredentials({ refresh_token: token });
  return oauthClient;
}
