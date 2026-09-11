import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import { DomainError } from "../../domain/domain-error";
import type { OpenBankRequest } from "./request-context.middleware";

export const CurrentCustomer = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const principal = context
      .switchToHttp()
      .getRequest<OpenBankRequest>().principal;
    if (!principal) {
      throw new DomainError("unauthorized", "La sesión no es válida.", 401);
    }
    return principal.customerId;
  },
);
