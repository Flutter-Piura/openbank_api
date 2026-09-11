import { DomainError } from "../../shared/domain/domain-error";

export interface MoneyData {
  readonly minorUnits: number;
  readonly currency: string;
}

export class Money implements MoneyData {
  private constructor(
    readonly minorUnits: number,
    readonly currency: string,
  ) {}

  static positive(minorUnits: number, currency: string): Money {
    if (!Number.isSafeInteger(minorUnits) || minorUnits <= 0) {
      throw new DomainError(
        "validation_error",
        "El monto debe ser un entero positivo en unidades menores.",
        400,
        { field: "amount.minorUnits" },
      );
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new DomainError(
        "validation_error",
        "La moneda debe usar un código ISO 4217 de tres letras.",
        400,
        { field: "amount.currency" },
      );
    }
    return new Money(minorUnits, currency);
  }
}

export interface Customer {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
}

export interface Account {
  readonly id: string;
  readonly alias: string;
  readonly maskedNumber: string;
  readonly status: string;
  readonly availableBalance: MoneyData;
  readonly createdAt?: string;
}

export interface BankTransaction {
  readonly id: string;
  readonly accountId: string;
  readonly transferId?: string | null;
  readonly type: string;
  readonly description: string;
  readonly amount: MoneyData;
  readonly occurredAt: string;
}

export interface TransactionPage {
  readonly items: readonly BankTransaction[];
  readonly pagination: { readonly nextCursor: string | null };
}

export interface Transfer {
  readonly id: string;
  readonly sourceAccountId: string;
  readonly destinationAccountId: string;
  readonly amount: MoneyData;
  readonly reference?: string | null;
  readonly status: string;
  readonly rejectionCode?: string | null;
  readonly createdAt: string;
  readonly completedAt?: string | null;
}

export interface CreateTransferCommand {
  readonly customerId: string;
  readonly sourceAccountId: string;
  readonly destinationAccountId: string;
  readonly amount: Money;
  readonly reference?: string;
  readonly idempotencyKey: string;
}
