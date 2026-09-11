import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  ACCESS_TOKEN_SERVICE,
  type AccessTokenService,
} from "../../../identity/application/access-token.service";
import { DomainError } from "../../domain/domain-error";
import { IS_PUBLIC_ROUTE } from "./public.decorator";
import type { OpenBankRequest } from "./request-context.middleware";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Inject(ACCESS_TOKEN_SERVICE)
    private readonly accessTokens: AccessTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_ROUTE,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<OpenBankRequest>();
    const authorization = request.header("authorization");
    const match = /^Bearer\s+(.+)$/i.exec(authorization ?? "");
    if (!match?.[1]) {
      throw new DomainError("unauthorized", "La sesión no es válida.", 401);
    }
    request.principal = await this.accessTokens.verify(match[1]);
    return true;
  }
}
