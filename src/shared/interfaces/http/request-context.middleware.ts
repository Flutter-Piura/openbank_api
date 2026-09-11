import { randomUUID } from "node:crypto";
import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

export interface OpenBankRequest extends Request {
  correlationId?: string;
  principal?: { customerId: string };
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(request: OpenBankRequest, response: Response, next: NextFunction): void {
    const incoming = request.header("x-correlation-id")?.trim();
    request.correlationId =
      incoming && incoming.length <= 128 ? incoming : randomUUID();
    response.setHeader("X-Correlation-Id", request.correlationId);
    next();
  }
}
