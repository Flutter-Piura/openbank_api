import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from "@nestjs/common";
import { isUUID } from "class-validator";
import type { Response } from "express";
import { BankingService } from "../../application/banking.service";
import type { Transfer } from "../../domain/models";
import { DomainError } from "../../../shared/domain/domain-error";
import { CurrentCustomer } from "../../../shared/interfaces/http/current-customer.decorator";
import { CreateTransferRequestDto } from "./banking.dto";

@Controller("v1/transfers")
export class TransfersController {
  constructor(
    @Inject(BankingService) private readonly banking: BankingService,
  ) {}

  @Post()
  async createTransfer(
    @CurrentCustomer() customerId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() input: CreateTransferRequestDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Transfer> {
    if (!idempotencyKey || !isUUID(idempotencyKey)) {
      throw new DomainError(
        "validation_error",
        "Idempotency-Key debe contener un UUID válido.",
        400,
        { field: "Idempotency-Key" },
      );
    }
    const transfer = await this.banking.createTransfer({
      customerId,
      sourceAccountId: input.sourceAccountId,
      destinationAccountId: input.destinationAccountId,
      minorUnits: input.amount.minorUnits,
      currency: input.amount.currency,
      idempotencyKey,
      ...(input.reference === undefined ? {} : { reference: input.reference }),
    });
    response.setHeader("Location", `/v1/transfers/${transfer.id}`);
    return transfer;
  }

  @Get(":transferId")
  getTransfer(
    @CurrentCustomer() customerId: string,
    @Param("transferId", new ParseUUIDPipe()) transferId: string,
  ): Promise<Transfer> {
    return this.banking.getTransfer(customerId, transferId);
  }
}
