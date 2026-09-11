import { Controller, Get, Inject } from "@nestjs/common";
import { BankingService } from "../../application/banking.service";
import type { Customer } from "../../domain/models";
import { CurrentCustomer } from "../../../shared/interfaces/http/current-customer.decorator";

@Controller("v1/me")
export class ProfileController {
  constructor(
    @Inject(BankingService) private readonly banking: BankingService,
  ) {}

  @Get()
  getCurrentCustomer(@CurrentCustomer() customerId: string): Promise<Customer> {
    return this.banking.getCustomer(customerId);
  }
}
