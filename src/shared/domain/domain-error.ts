export type DomainErrorCode =
  | "unauthorized"
  | "resource_not_found"
  | "validation_error"
  | "idempotency_conflict"
  | "insufficient_funds"
  | "account_not_active"
  | "currency_mismatch";

export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
    readonly statusCode: number,
    readonly details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
