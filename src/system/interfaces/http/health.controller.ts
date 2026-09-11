import { Controller, Get, Inject } from "@nestjs/common";
import { DatabaseService } from "../../../shared/infrastructure/database/database.service";
import { Public } from "../../../shared/interfaces/http/public.decorator";

@Controller("health")
export class HealthController {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  @Public()
  @Get()
  async getHealth(): Promise<{ status: "ok"; timestamp: string }> {
    await this.database.ping();
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
