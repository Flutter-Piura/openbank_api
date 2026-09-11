import type { AuthPrincipal } from "../domain/models";

export const ACCESS_TOKEN_SERVICE = Symbol("ACCESS_TOKEN_SERVICE");

export interface AccessTokenService {
  issue(customerId: string): Promise<string>;
  verify(token: string): Promise<AuthPrincipal>;
}
