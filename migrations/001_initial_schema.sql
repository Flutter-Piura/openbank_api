CREATE TABLE customers (
  id uuid PRIMARY KEY,
  display_name varchar(120) NOT NULL,
  email varchar(254) NOT NULL UNIQUE,
  password_hash varchar(100) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE accounts (
  id uuid PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES customers(id),
  alias varchar(80) NOT NULL,
  masked_number varchar(8) NOT NULL CHECK (masked_number ~ '^\*{4}[0-9]{4}$'),
  status varchar(24) NOT NULL CHECK (status IN ('active', 'blocked', 'closed')),
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX accounts_customer_id_idx ON accounts(customer_id);

CREATE TABLE transfers (
  id uuid PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES customers(id),
  source_account_id uuid NOT NULL REFERENCES accounts(id),
  destination_account_id uuid NOT NULL REFERENCES accounts(id),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  reference varchar(80),
  status varchar(24) NOT NULL CHECK (status IN ('pending', 'completed', 'rejected', 'failed')),
  rejection_code varchar(80),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK (source_account_id <> destination_account_id)
);

CREATE INDEX transfers_customer_id_idx ON transfers(customer_id, created_at DESC);

CREATE TABLE ledger_entries (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id),
  transfer_id uuid REFERENCES transfers(id),
  entry_type varchar(40) NOT NULL,
  description varchar(160) NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor <> 0),
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ledger_entries_account_page_idx
  ON ledger_entries(account_id, occurred_at DESC, id DESC);
CREATE INDEX ledger_entries_transfer_id_idx ON ledger_entries(transfer_id);

CREATE FUNCTION prevent_ledger_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ledger entries are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_entries_immutable
  BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

CREATE TABLE idempotency_keys (
  customer_id uuid NOT NULL REFERENCES customers(id),
  key uuid NOT NULL,
  request_hash char(64) NOT NULL,
  transfer_id uuid REFERENCES transfers(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, key)
);

CREATE TABLE refresh_sessions (
  id uuid PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES customers(id),
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX refresh_sessions_customer_id_idx
  ON refresh_sessions(customer_id, expires_at DESC);
