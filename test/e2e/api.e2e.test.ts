import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../../src/app.module";

interface AuthSessionBody {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresInSeconds: number;
}

interface AccountsBody {
  items: { id: string; availableBalance: { minorUnits: number } }[];
}

interface TransferBody {
  id: string;
  status: string;
  amount: { minorUnits: number; currency: string };
}

interface ProblemBody {
  code: string;
  correlationId: string;
}

describe("OpenBank API", () => {
  let app: INestApplication;

  before(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  after(async () => {
    await app.close();
  });

  it("executes the authenticated banking flow with atomic idempotency", async () => {
    const health = await request(app.getHttpServer())
      .get("/health")
      .expect(200);
    assert.equal((health.body as { status: string }).status, "ok");

    const denied = await request(app.getHttpServer())
      .get("/v1/accounts")
      .expect(401);
    const deniedProblem = denied.body as ProblemBody;
    assert.equal(deniedProblem.code, "unauthorized");
    assert.ok(deniedProblem.correlationId.length > 0);
    assert.match(
      denied.headers["content-type"] ?? "",
      /application\/problem\+json/,
    );

    const login = await request(app.getHttpServer())
      .post("/v1/auth/login")
      .send({
        email: "demo@openbank.local",
        password: "OpenBankDemo!2026",
      })
      .expect(200);
    const session = login.body as AuthSessionBody;
    assert.equal(session.tokenType, "Bearer");
    assert.ok(session.accessToken.length > 16);
    assert.ok(session.refreshToken.length > 16);

    const authorization = `Bearer ${session.accessToken}`;
    const profile = await request(app.getHttpServer())
      .get("/v1/me")
      .set("Authorization", authorization)
      .expect(200);
    assert.equal(
      (profile.body as { email: string }).email,
      "demo@openbank.local",
    );

    const accountsResponse = await request(app.getHttpServer())
      .get("/v1/accounts")
      .set("Authorization", authorization)
      .expect(200);
    const accounts = accountsResponse.body as AccountsBody;
    assert.equal(accounts.items.length, 2);
    const source = accounts.items[0];
    const destination = accounts.items[1];
    assert.ok(source);
    assert.ok(destination);

    const transactions = await request(app.getHttpServer())
      .get(`/v1/accounts/${source.id}/transactions?limit=1`)
      .set("Authorization", authorization)
      .expect(200);
    assert.equal((transactions.body as { items: unknown[] }).items.length, 1);

    const idempotencyKey = randomUUID();
    const payload = {
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      amount: { minorUnits: 100, currency: "PEN" },
      reference: "Prueba E2E",
    };
    const created = await request(app.getHttpServer())
      .post("/v1/transfers")
      .set("Authorization", authorization)
      .set("Idempotency-Key", idempotencyKey)
      .send(payload)
      .expect(201);
    const transfer = created.body as TransferBody;
    assert.equal(transfer.status, "completed");
    assert.equal(transfer.amount.minorUnits, 100);
    assert.equal(created.headers.location, `/v1/transfers/${transfer.id}`);

    const replay = await request(app.getHttpServer())
      .post("/v1/transfers")
      .set("Authorization", authorization)
      .set("Idempotency-Key", idempotencyKey)
      .send(payload)
      .expect(201);
    assert.equal((replay.body as TransferBody).id, transfer.id);

    const conflict = await request(app.getHttpServer())
      .post("/v1/transfers")
      .set("Authorization", authorization)
      .set("Idempotency-Key", idempotencyKey)
      .send({
        ...payload,
        amount: { minorUnits: 101, currency: "PEN" },
      })
      .expect(409);
    assert.equal((conflict.body as ProblemBody).code, "idempotency_conflict");

    await request(app.getHttpServer())
      .get(`/v1/transfers/${transfer.id}`)
      .set("Authorization", authorization)
      .expect(200);

    const refresh = await request(app.getHttpServer())
      .post("/v1/auth/refresh")
      .send({ refreshToken: session.refreshToken })
      .expect(200);
    const rotated = refresh.body as AuthSessionBody;
    assert.notEqual(rotated.refreshToken, session.refreshToken);

    await request(app.getHttpServer())
      .post("/v1/auth/refresh")
      .send({ refreshToken: session.refreshToken })
      .expect(401);
    await request(app.getHttpServer())
      .post("/v1/auth/logout")
      .set("Authorization", `Bearer ${rotated.accessToken}`)
      .expect(204);
    await request(app.getHttpServer())
      .post("/v1/auth/refresh")
      .send({ refreshToken: rotated.refreshToken })
      .expect(401);
  });
});
