import { DomainError } from "../../shared/domain/domain-error";
import type { BankingRepository } from "./banking.repository";
import {
  Money,
  type Account,
  type BankTransaction,
  type Customer,
  type TransactionPage,
  type Transfer,
} from "../domain/models";

export class BankingService {
  constructor(private readonly repository: BankingRepository) {}

  async getCustomer(customerId: string): Promise<Customer> {
    const customer = await this.repository.getCustomer(customerId);
    if (!customer) throw this.notFound();
    return customer;
  }

  listAccounts(customerId: string): Promise<readonly Account[]> {
    return this.repository.listAccounts(customerId);
  }

  async getAccount(customerId: string, accountId: string): Promise<Account> {
    const account = await this.repository.getAccount(customerId, accountId);
    if (!account) throw this.notFound();
    return account;
  }

  async listTransactions(
    customerId: string,
    accountId: string,
    limit: number,
    cursor?: string,
  ): Promise<TransactionPage> {
    const page = await this.repository.listTransactions(
      customerId,
      accountId,
      limit,
      cursor,
    );
    if (!page) throw this.notFound();
    return page;
  }

  async getTransaction(
    customerId: string,
    transactionId: string,
  ): Promise<BankTransaction> {
    const transaction = await this.repository.getTransaction(
      customerId,
      transactionId,
    );
    if (!transaction) throw this.notFound();
    return transaction;
  }

  createTransfer(input: {
    customerId: string;
    sourceAccountId: string;
    destinationAccountId: string;
    minorUnits: number;
    currency: string;
    reference?: string;
    idempotencyKey: string;
  }): Promise<Transfer> {
    if (input.sourceAccountId === input.destinationAccountId) {
      throw new DomainError(
        "validation_error",
        "La cuenta de origen y destino deben ser diferentes.",
        400,
      );
    }
    const amount = Money.positive(input.minorUnits, input.currency);
    return this.repository.createTransfer({
      customerId: input.customerId,
      sourceAccountId: input.sourceAccountId,
      destinationAccountId: input.destinationAccountId,
      amount,
      idempotencyKey: input.idempotencyKey,
      ...(input.reference === undefined ? {} : { reference: input.reference }),
    });
  }

  async getTransfer(customerId: string, transferId: string): Promise<Transfer> {
    const transfer = await this.repository.getTransfer(customerId, transferId);
    if (!transfer) throw this.notFound();
    return transfer;
  }

  private notFound(): DomainError {
    return new DomainError(
      "resource_not_found",
      "No se encontró el recurso solicitado.",
      404,
    );
  }
}
