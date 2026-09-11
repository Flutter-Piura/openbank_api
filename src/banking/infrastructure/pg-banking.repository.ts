import { createHash, randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import type { QueryResult, QueryResultRow } from "pg";
import { DomainError } from "../../shared/domain/domain-error";
import { DatabaseService } from "../../shared/infrastructure/database/database.service";
import type { BankingRepository } from "../application/banking.repository";
import type {
  Account,
  BankTransaction,
  CreateTransferCommand,
  Customer,
  TransactionPage,
  Transfer,
} from "../domain/models";

interface CustomerRow {
  id: string;
  display_name: string;
  email: string;
}

interface AccountRow {
  id: string;
  alias: string;
  masked_number: string;
  status: string;
  currency: string;
  created_at: Date;
  balance_minor: string;
}

interface TransactionRow {
  id: string;
  account_id: string;
  transfer_id: string | null;
  entry_type: string;
  description: string;
  amount_minor: string;
  currency: string;
  occurred_at: Date;
}

interface TransferRow {
  id: string;
  source_account_id: string;
  destination_account_id: string;
  amount_minor: string;
  currency: string;
  reference: string | null;
  status: string;
  rejection_code: string | null;
  created_at: Date;
  completed_at: Date | null;
}

interface LockedAccountRow {
  id: string;
  alias: string;
  status: string;
  currency: string;
}

interface BalanceRow {
  balance_minor: string;
}

interface IdempotencyRow {
  request_hash: string;
  transfer_id: string | null;
}

type QueryRunner = <Row extends QueryResultRow>(
  text: string,
  values: readonly unknown[],
) => Promise<QueryResult<Row>>;

@Injectable()
export class PgBankingRepository implements BankingRepository {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async getCustomer(customerId: string): Promise<Customer | null> {
    const result = await this.database.query<CustomerRow>(
      "SELECT id, display_name, email FROM customers WHERE id = $1",
      [customerId],
    );
    const row = result.rows[0];
    return row
      ? { id: row.id, displayName: row.display_name, email: row.email }
      : null;
  }

  async listAccounts(customerId: string): Promise<readonly Account[]> {
    const result = await this.database.query<AccountRow>(
      `${this.accountSelect()}
       WHERE a.customer_id = $1
       GROUP BY a.id
       ORDER BY a.created_at, a.id`,
      [customerId],
    );
    return result.rows.map((row) => this.mapAccount(row, false));
  }

  async getAccount(
    customerId: string,
    accountId: string,
  ): Promise<Account | null> {
    const result = await this.database.query<AccountRow>(
      `${this.accountSelect()}
       WHERE a.customer_id = $1 AND a.id = $2
       GROUP BY a.id`,
      [customerId, accountId],
    );
    const row = result.rows[0];
    return row ? this.mapAccount(row, true) : null;
  }

  async listTransactions(
    customerId: string,
    accountId: string,
    limit: number,
    cursor?: string,
  ): Promise<TransactionPage | null> {
    const account = await this.database.query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM accounts WHERE id = $1 AND customer_id = $2
       ) AS exists`,
      [accountId, customerId],
    );
    if (!account.rows[0]?.exists) return null;

    const offset = this.decodeCursor(cursor);
    const result = await this.database.query<TransactionRow>(
      `SELECT id, account_id, transfer_id, entry_type, description,
              amount_minor::text, currency, occurred_at
       FROM ledger_entries
       WHERE account_id = $1
       ORDER BY occurred_at DESC, id DESC
       LIMIT $2 OFFSET $3`,
      [accountId, limit + 1, offset],
    );
    const hasNext = result.rows.length > limit;
    const rows = hasNext ? result.rows.slice(0, limit) : result.rows;
    return {
      items: rows.map((row) => this.mapTransaction(row)),
      pagination: {
        nextCursor: hasNext ? this.encodeCursor(offset + limit) : null,
      },
    };
  }

  async getTransaction(
    customerId: string,
    transactionId: string,
  ): Promise<BankTransaction | null> {
    const result = await this.database.query<TransactionRow>(
      `SELECT le.id, le.account_id, le.transfer_id, le.entry_type, le.description,
              le.amount_minor::text, le.currency, le.occurred_at
       FROM ledger_entries le
       JOIN accounts a ON a.id = le.account_id
       WHERE le.id = $1 AND a.customer_id = $2`,
      [transactionId, customerId],
    );
    const row = result.rows[0];
    return row ? this.mapTransaction(row) : null;
  }

  async createTransfer(command: CreateTransferCommand): Promise<Transfer> {
    const client = await this.database.connect();
    try {
      await client.query("BEGIN");
      const requestHash = this.requestHash(command);
      const inserted = await client.query(
        `INSERT INTO idempotency_keys(customer_id, key, request_hash)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [command.customerId, command.idempotencyKey, requestHash],
      );

      if ((inserted.rowCount ?? 0) === 0) {
        const existing = await client.query<IdempotencyRow>(
          `SELECT request_hash, transfer_id
           FROM idempotency_keys
           WHERE customer_id = $1 AND key = $2
           FOR UPDATE`,
          [command.customerId, command.idempotencyKey],
        );
        const row = existing.rows[0];
        if (row?.request_hash !== requestHash || !row.transfer_id) {
          throw new DomainError(
            "idempotency_conflict",
            "La clave de idempotencia fue usada con otra solicitud.",
            409,
          );
        }
        const replay = await this.getTransferWithQuery(
          (text, values) => client.query(text, [...values]),
          command.customerId,
          row.transfer_id,
        );
        if (!replay)
          throw new Error("Idempotency record references a missing transfer.");
        await client.query("COMMIT");
        return replay;
      }

      const accounts = await client.query<LockedAccountRow>(
        `SELECT id, alias, status, currency
         FROM accounts
         WHERE customer_id = $1 AND id = ANY($2::uuid[])
         ORDER BY id
         FOR UPDATE`,
        [
          command.customerId,
          [command.sourceAccountId, command.destinationAccountId],
        ],
      );
      if (accounts.rows.length !== 2) {
        throw new DomainError(
          "resource_not_found",
          "No se encontró una de las cuentas solicitadas.",
          404,
        );
      }
      const source = accounts.rows.find(
        (row) => row.id === command.sourceAccountId,
      );
      const destination = accounts.rows.find(
        (row) => row.id === command.destinationAccountId,
      );
      if (!source || !destination)
        throw new Error("Locked accounts are incomplete.");
      if (source.status !== "active" || destination.status !== "active") {
        throw new DomainError(
          "account_not_active",
          "Ambas cuentas deben estar activas.",
          422,
        );
      }
      if (
        source.currency !== command.amount.currency ||
        destination.currency !== command.amount.currency
      ) {
        throw new DomainError(
          "currency_mismatch",
          "La moneda debe coincidir con ambas cuentas.",
          422,
        );
      }

      const balance = await client.query<BalanceRow>(
        `SELECT COALESCE(SUM(amount_minor), 0)::text AS balance_minor
         FROM ledger_entries WHERE account_id = $1`,
        [source.id],
      );
      const available = BigInt(balance.rows[0]?.balance_minor ?? "0");
      if (available < BigInt(command.amount.minorUnits)) {
        throw new DomainError(
          "insufficient_funds",
          "La cuenta no tiene saldo disponible suficiente.",
          422,
        );
      }

      const transferId = randomUUID();
      const now = new Date();
      await client.query(
        `INSERT INTO transfers(
           id, customer_id, source_account_id, destination_account_id,
           amount_minor, currency, reference, status, created_at, completed_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', $8, $8)`,
        [
          transferId,
          command.customerId,
          source.id,
          destination.id,
          command.amount.minorUnits,
          command.amount.currency,
          command.reference ?? null,
          now,
        ],
      );
      await client.query(
        `INSERT INTO ledger_entries(
           id, account_id, transfer_id, entry_type, description,
           amount_minor, currency, occurred_at
         ) VALUES
           ($1, $2, $3, 'transfer_debit', $4, $5, $6, $7),
           ($8, $9, $3, 'transfer_credit', $10, $11, $6, $7)`,
        [
          randomUUID(),
          source.id,
          transferId,
          `Transferencia a ${destination.alias}`,
          -command.amount.minorUnits,
          command.amount.currency,
          now,
          randomUUID(),
          destination.id,
          `Transferencia desde ${source.alias}`,
          command.amount.minorUnits,
        ],
      );
      await client.query(
        `UPDATE idempotency_keys SET transfer_id = $3
         WHERE customer_id = $1 AND key = $2`,
        [command.customerId, command.idempotencyKey, transferId],
      );
      const transfer = await this.getTransferWithQuery(
        (text, values) => client.query(text, [...values]),
        command.customerId,
        transferId,
      );
      if (!transfer) throw new Error("Created transfer could not be read.");
      await client.query("COMMIT");
      return transfer;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  getTransfer(
    customerId: string,
    transferId: string,
  ): Promise<Transfer | null> {
    return this.getTransferWithQuery(
      (text, values) => this.database.query(text, values),
      customerId,
      transferId,
    );
  }

  private async getTransferWithQuery(
    query: QueryRunner,
    customerId: string,
    transferId: string,
  ): Promise<Transfer | null> {
    const result = await query<TransferRow>(
      `SELECT id, source_account_id, destination_account_id, amount_minor::text,
              currency, reference, status, rejection_code, created_at, completed_at
       FROM transfers
       WHERE id = $1 AND customer_id = $2`,
      [transferId, customerId],
    );
    const row = result.rows[0];
    return row ? this.mapTransfer(row) : null;
  }

  private accountSelect(): string {
    return `SELECT a.id, a.alias, a.masked_number, a.status, a.currency, a.created_at,
                   COALESCE(SUM(le.amount_minor), 0)::text AS balance_minor
            FROM accounts a
            LEFT JOIN ledger_entries le ON le.account_id = a.id`;
  }

  private mapAccount(row: AccountRow, includeCreatedAt: boolean): Account {
    return {
      id: row.id,
      alias: row.alias,
      maskedNumber: row.masked_number,
      status: row.status,
      availableBalance: {
        minorUnits: this.safeInteger(row.balance_minor),
        currency: row.currency,
      },
      ...(includeCreatedAt ? { createdAt: row.created_at.toISOString() } : {}),
    };
  }

  private mapTransaction(row: TransactionRow): BankTransaction {
    return {
      id: row.id,
      accountId: row.account_id,
      transferId: row.transfer_id,
      type: row.entry_type,
      description: row.description,
      amount: {
        minorUnits: this.safeInteger(row.amount_minor),
        currency: row.currency,
      },
      occurredAt: row.occurred_at.toISOString(),
    };
  }

  private mapTransfer(row: TransferRow): Transfer {
    return {
      id: row.id,
      sourceAccountId: row.source_account_id,
      destinationAccountId: row.destination_account_id,
      amount: {
        minorUnits: this.safeInteger(row.amount_minor),
        currency: row.currency,
      },
      reference: row.reference,
      status: row.status,
      rejectionCode: row.rejection_code,
      createdAt: row.created_at.toISOString(),
      completedAt: row.completed_at?.toISOString() ?? null,
    };
  }

  private requestHash(command: CreateTransferCommand): string {
    const canonical = JSON.stringify({
      sourceAccountId: command.sourceAccountId,
      destinationAccountId: command.destinationAccountId,
      minorUnits: command.amount.minorUnits,
      currency: command.amount.currency,
      reference: command.reference ?? null,
    });
    return createHash("sha256").update(canonical).digest("hex");
  }

  private safeInteger(value: string): number {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed))
      throw new Error("Money exceeds JavaScript safe integer.");
    return parsed;
  }

  private encodeCursor(offset: number): string {
    return Buffer.from(JSON.stringify({ offset })).toString("base64url");
  }

  private decodeCursor(cursor?: string): number {
    if (!cursor) return 0;
    try {
      const decoded: unknown = JSON.parse(
        Buffer.from(cursor, "base64url").toString("utf8"),
      );
      if (
        typeof decoded === "object" &&
        decoded !== null &&
        "offset" in decoded &&
        Number.isSafeInteger(decoded.offset) &&
        typeof decoded.offset === "number" &&
        decoded.offset >= 0
      ) {
        return decoded.offset;
      }
    } catch {
      // Convert every malformed cursor into the same safe validation error.
    }
    throw new DomainError("validation_error", "El cursor no es válido.", 400, {
      field: "cursor",
    });
  }
}
