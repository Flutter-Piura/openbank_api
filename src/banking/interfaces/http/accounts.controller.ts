import {
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Query,
} from "@nestjs/common";
import { BankingService } from "../../application/banking.service";
import type {
  Account,
  BankTransaction,
  TransactionPage,
} from "../../domain/models";
import { CurrentCustomer } from "../../../shared/interfaces/http/current-customer.decorator";
import { TransactionQueryDto } from "./banking.dto";

@Controller("v1")
export class AccountsController {
  constructor(
    @Inject(BankingService) private readonly banking: BankingService,
  ) {}

  @Get("accounts")
  async listAccounts(
    @CurrentCustomer() customerId: string,
  ): Promise<{ items: readonly Account[] }> {
    return { items: await this.banking.listAccounts(customerId) };
  }

  @Get("accounts/:accountId")
  getAccount(
    @CurrentCustomer() customerId: string,
    @Param("accountId", new ParseUUIDPipe()) accountId: string,
  ): Promise<Account> {
    return this.banking.getAccount(customerId, accountId);
  }

  @Get("accounts/:accountId/transactions")
  listTransactions(
    @CurrentCustomer() customerId: string,
    @Param("accountId", new ParseUUIDPipe()) accountId: string,
    @Query() query: TransactionQueryDto,
  ): Promise<TransactionPage> {
    return this.banking.listTransactions(
      customerId,
      accountId,
      query.limit,
      query.cursor,
    );
  }

  @Get("transactions/:transactionId")
  getTransaction(
    @CurrentCustomer() customerId: string,
    @Param("transactionId", new ParseUUIDPipe()) transactionId: string,
  ): Promise<BankTransaction> {
    return this.banking.getTransaction(customerId, transactionId);
  }
}
