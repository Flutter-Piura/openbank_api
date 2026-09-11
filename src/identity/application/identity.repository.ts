import type { AuthSession, IdentityCustomer } from "../domain/models";

export const IDENTITY_REPOSITORY = Symbol("IDENTITY_REPOSITORY");

export interface IdentityRepository {
  findByEmail(email: string): Promise<IdentityCustomer | null>;
  verifyPassword(password: string, passwordHash: string): Promise<boolean>;
  createSession(customerId: string): Promise<AuthSession>;
  rotateSession(refreshToken: string): Promise<AuthSession | null>;
  revokeSessions(customerId: string): Promise<void>;
}
