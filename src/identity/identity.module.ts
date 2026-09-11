import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ACCESS_TOKEN_SERVICE } from "./application/access-token.service";
import {
  IDENTITY_REPOSITORY,
  type IdentityRepository,
} from "./application/identity.repository";
import { IdentityService } from "./application/identity.service";
import { JwtAccessTokenService } from "./infrastructure/jwt-access-token.service";
import { PgIdentityRepository } from "./infrastructure/pg-identity.repository";
import { AuthController } from "./interfaces/http/auth.controller";

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtAccessTokenService,
    {
      provide: ACCESS_TOKEN_SERVICE,
      useExisting: JwtAccessTokenService,
    },
    PgIdentityRepository,
    {
      provide: IDENTITY_REPOSITORY,
      useExisting: PgIdentityRepository,
    },
    {
      provide: IdentityService,
      inject: [IDENTITY_REPOSITORY],
      useFactory: (repository: IdentityRepository) =>
        new IdentityService(repository),
    },
  ],
  exports: [ACCESS_TOKEN_SERVICE, IdentityService],
})
export class IdentityModule {}
