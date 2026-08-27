export { OAuth2Client as Client } from 'google-auth-library';

export interface Logger {
  info(value: any): void;
  warn(value: any): void;
  error(value: any): void;
}
