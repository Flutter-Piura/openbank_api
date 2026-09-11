import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableShutdownHooks();
  const config = app.get(ConfigService);
  const port = config.getOrThrow<number>("PORT");
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
