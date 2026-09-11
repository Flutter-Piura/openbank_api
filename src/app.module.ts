import {
  MiddlewareConsumer,
  Module,
  RequestMethod,
  ValidationPipe,
  type NestModule,
} from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_PIPE } from "@nestjs/core";
import { BankingModule } from "./banking/banking.module";
import { validateEnvironment } from "./configuration";
import { IdentityModule } from "./identity/identity.module";
import { DatabaseModule } from "./shared/infrastructure/database/database.module";
import { AuthGuard } from "./shared/interfaces/http/auth.guard";
import { ProblemDetailsFilter } from "./shared/interfaces/http/problem-details.filter";
import { RequestContextMiddleware } from "./shared/interfaces/http/request-context.middleware";
import { HealthController } from "./system/interfaces/http/health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
    IdentityModule,
    BankingModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes({
      path: "{*path}",
      method: RequestMethod.ALL,
    });
  }
}
