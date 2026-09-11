import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BankingRepository } from "../../src/banking/application/banking.repository";
import { BankingService } from "../../src/banking/application/banking.service";
import type {
  Account,
  BankTransaction,
  CreateTransferCommand,
  Customer,
  TransactionPage,
  Transfer,
} from "../../src/banking/domain/models";
import { DomainError } from "../../src/shared/domain/domain-error";

const transfer: Transfer = {
  id: "transfer-id",
  sourceAccountId: "source-id",
  destinationAccountId: "destination-id",
  amount: { minorUnits: 100, currency: "PEN" },
  status: "completed",
  createdAt: "2026-09-10T00:00:00.000Z",
};

class FakeBankingRepository implements BankingRepository {
  lastCommand?: CreateTransferCommand;

  getCustomer(_customerId: string): Promise<Customer | null> {
    return Promise.resolve(null);
  }

  listAccounts(_customerId: string): Promise<readonly Account[]> {
    return Promise.resolve([]);
  }

  getAccount(_customerId: string, _accountId: string): Promise<Account | null> {
    return Promise.resolve(null);
  }

  listTransactions(
    _customerId: string,
    _accountId: string,
    _limit: number,
    _cursor?: string,
  ): Promise<TransactionPage | null> {
    return Promise.resolve(null);
  }

  getTransaction(
    _customerId: string,
    _transactionId: string,
  ): Promise<BankTransaction | null> {
    return Promise.resolve(null);
  }

  createTransfer(command: CreateTransferCommand): Promise<Transfer> {
    this.lastCommand = command;
    return Promise.resolve(transfer);
  }

  getTransfer(
    _customerId: string,
    _transferId: string,
  ): Promise<Transfer | null> {
    return Promise.resolve(null);
  }
}

describe("BankingService", () => {
  it("builds a valid transfer command", async () => {
    const repository = new FakeBankingRepository();
    const service = new BankingService(repository);

    const result = await service.createTransfer({
      customerId: "customer-id",
      sourceAccountId: "source-id",
      destinationAccountId: "destination-id",
      minorUnits: 100,
      currency: "PEN",
      reference: "Ahorro",
      idempotencyKey: "key",
    });

    assert.equal(result, transfer);
    assert.equal(repository.lastCommand?.amount.minorUnits, 100);
    assert.equal(repository.lastCommand.reference, "Ahorro");
  });

  it("rejects a transfer to the same account before persistence", () => {
    const service = new BankingService(new FakeBankingRepository());
    assert.throws(
      () =>
        service.createTransfer({
          customerId: "customer-id",
          sourceAccountId: "same-id",
          destinationAccountId: "same-id",
          minorUnits: 100,
          currency: "PEN",
          idempotencyKey: "key",
        }),
      (error: unknown) =>
        error instanceof DomainError && error.code === "validation_error",
    );
  });

  it("hides missing resources behind a stable not-found error", async () => {
    const service = new BankingService(new FakeBankingRepository());
    await assert.rejects(
      service.getAccount("customer-id", "missing-id"),
      (error: unknown) =>
        error instanceof DomainError && error.code === "resource_not_found",
    );
  });
});
