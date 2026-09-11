import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { DomainError } from "../../domain/domain-error";
import type { OpenBankRequest } from "./request-context.middleware";

interface ProblemDetails {
  code: string;
  message: string;
  correlationId: string;
  details?: Readonly<Record<string, unknown>>;
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request & OpenBankRequest>();
    const correlationId = request.correlationId ?? "unknown";
    const problem = this.problem(exception, correlationId);

    if (problem.status >= 500) {
      console.error(`[${correlationId}]`, exception);
    }
    response
      .status(problem.status)
      .type("application/problem+json")
      .send(problem.body);
  }

  private problem(
    exception: unknown,
    correlationId: string,
  ): { status: number; body: ProblemDetails } {
    if (exception instanceof DomainError) {
      return {
        status: exception.statusCode,
        body: {
          code: exception.code,
          message: exception.message,
          correlationId,
          ...(exception.details ? { details: exception.details } : {}),
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const messages =
        typeof raw === "object" && "message" in raw ? raw.message : undefined;
      return {
        status,
        body: {
          code: this.codeFor(status),
          message:
            status === 400
              ? "La solicitud contiene valores inválidos."
              : exception.message,
          correlationId,
          ...(Array.isArray(messages)
            ? { details: { errors: messages.map(String) } }
            : {}),
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        code: "internal_error",
        message: "No pudimos completar la solicitud.",
        correlationId,
      },
    };
  }

  private codeFor(status: number): string {
    if (status === 400) return "validation_error";
    if (status === 401) return "unauthorized";
    if (status === 404) return "resource_not_found";
    return status >= 500 ? "internal_error" : "request_error";
  }
}
