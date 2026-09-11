import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { DomainError } from "../../shared/domain/domain-error";
import type { AccessTokenService } from "../application/access-token.service";
import type { AuthPrincipal } from "../domain/models";

@Injectable()
export class JwtAccessTokenService implements AccessTokenService {
  constructor(
    @Inject(JwtService)
    private readonly jwt: JwtService,
    @Inject(ConfigService)
    private readonly config: ConfigService,
  ) {}

  issue(customerId: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: customerId, typ: "access" },
      { expiresIn: this.config.getOrThrow<number>("ACCESS_TOKEN_TTL_SECONDS") },
    );
  }

  async verify(token: string): Promise<AuthPrincipal> {
    try {
      const payload = await this.jwt.verifyAsync<{
        sub?: unknown;
        typ?: unknown;
      }>(token);
      if (typeof payload.sub !== "string" || payload.typ !== "access")
        throw new Error();
      return { customerId: payload.sub };
    } catch {
      throw new DomainError("unauthorized", "La sesión no es válida.", 401);
    }
  }
}
