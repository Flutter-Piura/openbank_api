import { Module } from "@nestjs/common";
import {
  BANKING_REPOSITORY,
  type BankingRepository,
} from "./application/banking.repository";
import { BankingService } from "./application/banking.service";
import { PgBankingRepository } from "./infrastructure/pg-banking.repository";
import { AccountsController } from "./interfaces/http/accounts.controller";
import { ProfileController } from "./interfaces/http/profile.controller";
import { TransfersController } from "./interfaces/http/transfers.controller";

@Module({
  controllers: [AccountsController, ProfileController, TransfersController],
  providers: [
    PgBankingRepository,
    {
      provide: BANKING_REPOSITORY,
      useExisting: PgBankingRepository,
    },
    {
      provide: BankingService,
      inject: [BANKING_REPOSITORY],
      useFactory: (repository: BankingRepository) =>
        new BankingService(repository),
    },
  ],
  exports: [BankingService],
})
export class BankingModule {}
