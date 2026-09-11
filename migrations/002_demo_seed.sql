INSERT INTO customers (id, display_name, email, password_hash, created_at)
VALUES (
  '4a004784-e2ba-4892-986d-ce8cc3761c7e',
  'Cliente Demo',
  'demo@openbank.local',
  '$2b$12$DVHBuZ7u4g/M5MHilGZhtuzDH32Iz1P59jWfgEpO35TUjBa.aSzi.',
  '2026-01-15T14:00:00Z'
);

INSERT INTO accounts (id, customer_id, alias, masked_number, status, currency, created_at)
VALUES
  (
    '1b27fb57-13d2-4931-861c-c903f7e44c5f',
    '4a004784-e2ba-4892-986d-ce8cc3761c7e',
    'Cuenta principal',
    '****4821',
    'active',
    'PEN',
    '2026-01-15T14:30:00Z'
  ),
  (
    '93ed95bf-37e0-4119-809f-23b30153017d',
    '4a004784-e2ba-4892-986d-ce8cc3761c7e',
    'Cuenta de ahorro',
    '****9134',
    'active',
    'PEN',
    '2026-01-15T14:31:00Z'
  );

INSERT INTO transfers (
  id,
  customer_id,
  source_account_id,
  destination_account_id,
  amount_minor,
  currency,
  reference,
  status,
  created_at,
  completed_at
)
VALUES (
  'a88ee2f2-27b8-43a0-b6c4-3d846e724983',
  '4a004784-e2ba-4892-986d-ce8cc3761c7e',
  '1b27fb57-13d2-4931-861c-c903f7e44c5f',
  '93ed95bf-37e0-4119-809f-23b30153017d',
  10000,
  'PEN',
  'Ahorro mensual',
  'completed',
  '2026-08-30T20:15:00Z',
  '2026-08-30T20:15:01Z'
);

INSERT INTO ledger_entries (
  id, account_id, transfer_id, entry_type, description, amount_minor, currency, occurred_at
)
VALUES
  (
    '31aa4f35-7b9c-4c8d-a218-168b48f4f25b',
    '1b27fb57-13d2-4931-861c-c903f7e44c5f',
    NULL,
    'opening_balance',
    'Saldo inicial de demostración',
    85050,
    'PEN',
    '2026-01-15T14:30:00Z'
  ),
  (
    '56fb078a-7963-4146-8a94-2347cc1a536e',
    '1b27fb57-13d2-4931-861c-c903f7e44c5f',
    NULL,
    'deposit',
    'Depósito de demostración',
    50000,
    'PEN',
    '2026-08-28T15:00:00Z'
  ),
  (
    'c3bf7c60-432a-4245-952e-c303553542c4',
    '1b27fb57-13d2-4931-861c-c903f7e44c5f',
    'a88ee2f2-27b8-43a0-b6c4-3d846e724983',
    'transfer_debit',
    'Transferencia a cuenta de ahorro',
    -10000,
    'PEN',
    '2026-08-30T20:15:00Z'
  ),
  (
    '8d36b606-018c-46c1-badc-2e755fef091e',
    '93ed95bf-37e0-4119-809f-23b30153017d',
    NULL,
    'opening_balance',
    'Saldo inicial de demostración',
    440000,
    'PEN',
    '2026-01-15T14:31:00Z'
  ),
  (
    '748928c2-b7b9-4af9-8e50-51db81642c57',
    '93ed95bf-37e0-4119-809f-23b30153017d',
    'a88ee2f2-27b8-43a0-b6c4-3d846e724983',
    'transfer_credit',
    'Transferencia desde cuenta principal',
    10000,
    'PEN',
    '2026-08-30T20:15:00Z'
  );
