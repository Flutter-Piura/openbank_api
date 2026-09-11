import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { IdentityRepository } from "../../src/identity/application/identity.repository";
import { IdentityService } from "../../src/identity/application/identity.service";
import type {
  AuthSession,
  IdentityCustomer,
} from "../../src/identity/domain/models";
import { DomainError } from "../../src/shared/domain/domain-error";

const session: AuthSession = {
  accessToken: "access-token-long-enough",
  refreshToken: "refresh-token-long-enough",
  tokenType: "Bearer",
  expiresInSeconds: 900,
};

class FakeIdentityRepository implements IdentityRepository {
  email?: string;
  validPassword = true;
  customer: IdentityCustomer | null = {
    id: "customer-id",
    email: "demo@openbank.local",
    passwordHash: "hash",
  };

  findByEmail(email: string): Promise<IdentityCustomer | null> {
    this.email = email;
    return Promise.resolve(this.customer);
  }

  verifyPassword(_password: string, _passwordHash: string): Promise<boolean> {
    return Promise.resolve(this.validPassword);
  }

  createSession(_customerId: string): Promise<AuthSession> {
    return Promise.resolve(session);
  }

  rotateSession(refreshToken: string): Promise<AuthSession | null> {
    return Promise.resolve(refreshToken === "valid-refresh" ? session : null);
  }

  revokeSessions(_customerId: string): Promise<void> {
    return Promise.resolve();
  }
}

describe("IdentityService", () => {
  it("normalizes email and creates a session", async () => {
    const repository = new FakeIdentityRepository();
    const service = new IdentityService(repository);
    assert.equal(
      await service.login("DEMO@OPENBANK.LOCAL", "password"),
      session,
    );
    assert.equal(repository.email, "demo@openbank.local");
  });

  it("does not reveal whether the email or password failed", async () => {
    const repository = new FakeIdentityRepository();
    repository.validPassword = false;
    const service = new IdentityService(repository);
    await assert.rejects(
      service.login("demo@openbank.local", "incorrect"),
      (error: unknown) =>
        error instanceof DomainError && error.code === "unauthorized",
    );
  });

  it("rejects an unknown refresh token", async () => {
    const service = new IdentityService(new FakeIdentityRepository());
    await assert.rejects(
      service.refresh("unknown-refresh"),
      (error: unknown) =>
        error instanceof DomainError && error.code === "unauthorized",
    );
  });
});
