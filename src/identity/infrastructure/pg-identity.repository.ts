import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { compare } from "bcryptjs";
import type { PoolClient } from "pg";
import { DatabaseService } from "../../shared/infrastructure/database/database.service";
import {
  ACCESS_TOKEN_SERVICE,
  type AccessTokenService,
} from "../application/access-token.service";
import type { IdentityRepository } from "../application/identity.repository";
import type { AuthSession, IdentityCustomer } from "../domain/models";

interface CustomerRow {
  id: string;
  email: string;
  password_hash: string;
}

interface RefreshRow {
  customer_id: string;
}

@Injectable()
export class PgIdentityRepository implements IdentityRepository {
  private readonly accessTtl: number;
  private readonly refreshTtl: number;

  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
    @Inject(ACCESS_TOKEN_SERVICE)
    private readonly accessTokens: AccessTokenService,
    @Inject(ConfigService) config: ConfigService,
  ) {
    this.accessTtl = config.getOrThrow<number>("ACCESS_TOKEN_TTL_SECONDS");
    this.refreshTtl = config.getOrThrow<number>("REFRESH_TOKEN_TTL_SECONDS");
  }

  async findByEmail(email: string): Promise<IdentityCustomer | null> {
    const result = await this.database.query<CustomerRow>(
      "SELECT id, email, password_hash FROM customers WHERE email = $1",
      [email],
    );
    const row = result.rows[0];
    return row
      ? { id: row.id, email: row.email, passwordHash: row.password_hash }
      : null;
  }

  verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    return compare(password, passwordHash);
  }

  async createSession(customerId: string): Promise<AuthSession> {
    const client = await this.database.connect();
    try {
      await client.query("BEGIN");
      const refreshToken = await this.insertRefreshSession(client, customerId);
      await client.query("COMMIT");
      return await this.session(customerId, refreshToken);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async rotateSession(refreshToken: string): Promise<AuthSession | null> {
    const client = await this.database.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query<RefreshRow>(
        `SELECT customer_id
         FROM refresh_sessions
         WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
         FOR UPDATE`,
        [this.hash(refreshToken)],
      );
      const row = existing.rows[0];
      if (!row) {
        await client.query("ROLLBACK");
        return null;
      }
      await client.query(
        "UPDATE refresh_sessions SET revoked_at = now() WHERE token_hash = $1",
        [this.hash(refreshToken)],
      );
      const nextRefreshToken = await this.insertRefreshSession(
        client,
        row.customer_id,
      );
      await client.query("COMMIT");
      return await this.session(row.customer_id, nextRefreshToken);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async revokeSessions(customerId: string): Promise<void> {
    await this.database.query(
      "UPDATE refresh_sessions SET revoked_at = now() WHERE customer_id = $1 AND revoked_at IS NULL",
      [customerId],
    );
  }

  private async insertRefreshSession(
    client: PoolClient,
    customerId: string,
  ): Promise<string> {
    const raw = randomBytes(32).toString("base64url");
    await client.query(
      `INSERT INTO refresh_sessions(id, customer_id, token_hash, expires_at)
       VALUES ($1, $2, $3, now() + ($4 * interval '1 second'))`,
      [randomUUID(), customerId, this.hash(raw), this.refreshTtl],
    );
    return raw;
  }

  private async session(
    customerId: string,
    refreshToken: string,
  ): Promise<AuthSession> {
    return {
      accessToken: await this.accessTokens.issue(customerId),
      refreshToken,
      tokenType: "Bearer",
      expiresInSeconds: this.accessTtl,
    };
  }

  private hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }
}
