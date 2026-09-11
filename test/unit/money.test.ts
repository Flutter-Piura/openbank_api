import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Money } from "../../src/banking/domain/models";
import { DomainError } from "../../src/shared/domain/domain-error";

describe("Money", () => {
  it("creates a positive amount in minor units", () => {
    const money = Money.positive(125_050, "PEN");
    assert.equal(money.minorUnits, 125_050);
    assert.equal(money.currency, "PEN");
  });

  it("rejects zero, decimals and invalid currencies", () => {
    for (const input of [0, -1, 10.5, Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(() => Money.positive(input, "PEN"), DomainError);
    }
    assert.throws(() => Money.positive(100, "pen"), DomainError);
  });
});
