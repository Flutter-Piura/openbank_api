import type {
  Account,
  BankTransaction,
  CreateTransferCommand,
  Customer,
  TransactionPage,
  Transfer,
} from "../domain/models";

export const BANKING_REPOSITORY = Symbol("BANKING_REPOSITORY");

export interface BankingRepository {
  getCustomer(customerId: string): Promise<Customer | null>;
  listAccounts(customerId: string): Promise<readonly Account[]>;
  getAccount(customerId: string, accountId: string): Promise<Account | null>;
  listTransactions(
    customerId: string,
    accountId: string,
    limit: number,
    cursor?: string,
  ): Promise<TransactionPage | null>;
  getTransaction(
    customerId: string,
    transactionId: string,
  ): Promise<BankTransaction | null>;
  createTransfer(command: CreateTransferCommand): Promise<Transfer>;
  getTransfer(customerId: string, transferId: string): Promise<Transfer | null>;
}
