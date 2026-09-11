import { Body, Controller, HttpCode, Inject, Post } from "@nestjs/common";
import { IdentityService } from "../../application/identity.service";
import type { AuthSession } from "../../domain/models";
import { CurrentCustomer } from "../../../shared/interfaces/http/current-customer.decorator";
import { Public } from "../../../shared/interfaces/http/public.decorator";
import { LoginRequestDto, RefreshRequestDto } from "./auth.dto";

@Controller("v1/auth")
export class AuthController {
  constructor(
    @Inject(IdentityService) private readonly identity: IdentityService,
  ) {}

  @Public()
  @Post("login")
  @HttpCode(200)
  login(@Body() input: LoginRequestDto): Promise<AuthSession> {
    return this.identity.login(input.email, input.password);
  }

  @Public()
  @Post("refresh")
  @HttpCode(200)
  refresh(@Body() input: RefreshRequestDto): Promise<AuthSession> {
    return this.identity.refresh(input.refreshToken);
  }

  @Post("logout")
  @HttpCode(204)
  logout(@CurrentCustomer() customerId: string): Promise<void> {
    return this.identity.logout(customerId);
  }
}
