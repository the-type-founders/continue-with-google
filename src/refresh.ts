import { type ClientCredentials } from './authorize.js';
import { Client } from './index.js';

export async function refresh(
  clientCredentials: ClientCredentials,
  token: string
): Promise<Client> {
  const client = new Client(
    clientCredentials.id,
    clientCredentials.secret,
    clientCredentials.redirectUri
  );
  client.setCredentials({ refresh_token: token });
  return client;
}
