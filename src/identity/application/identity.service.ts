import { DomainError } from "../../shared/domain/domain-error";
import type { AuthSession } from "../domain/models";
import type { IdentityRepository } from "./identity.repository";

export class IdentityService {
  constructor(private readonly repository: IdentityRepository) {}

  async login(email: string, password: string): Promise<AuthSession> {
    const customer = await this.repository.findByEmail(email.toLowerCase());
    if (
      !customer ||
      !(await this.repository.verifyPassword(password, customer.passwordHash))
    ) {
      throw this.unauthorized();
    }
    return this.repository.createSession(customer.id);
  }

  async refresh(refreshToken: string): Promise<AuthSession> {
    const session = await this.repository.rotateSession(refreshToken);
    if (!session) throw this.unauthorized();
    return session;
  }

  logout(customerId: string): Promise<void> {
    return this.repository.revokeSessions(customerId);
  }

  private unauthorized(): DomainError {
    return new DomainError(
      "unauthorized",
      "La sesión o las credenciales no son válidas.",
      401,
    );
  }
}
