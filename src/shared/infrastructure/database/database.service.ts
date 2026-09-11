import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  Pool,
  type PoolClient,
  type QueryResult,
  type QueryResultRow,
} from "pg";

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(@Inject(ConfigService) config: ConfigService) {
    this.pool = new Pool({
      connectionString: config.getOrThrow<string>("DATABASE_URL"),
      max: 10,
      idleTimeoutMillis: 30_000,
    });
  }

  query<Row extends QueryResultRow>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<QueryResult<Row>> {
    return this.pool.query<Row>(text, [...values]);
  }

  connect(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async ping(): Promise<void> {
    await this.pool.query("SELECT 1");
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
