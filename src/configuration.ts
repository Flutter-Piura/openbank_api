interface Environment {
  DATABASE_URL: string;
  JWT_SECRET: string;
  PORT: number;
  ACCESS_TOKEN_TTL_SECONDS: number;
  REFRESH_TOKEN_TTL_SECONDS: number;
}

export function validateEnvironment(
  values: Record<string, unknown>,
): Record<string, unknown> & Environment {
  const databaseUrl = requiredString(values, "DATABASE_URL");
  const jwtSecret = requiredString(values, "JWT_SECRET");
  if (jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  }
  return {
    ...values,
    DATABASE_URL: databaseUrl,
    JWT_SECRET: jwtSecret,
    PORT: integer(values.PORT, 3000, 1, 65_535, "PORT"),
    ACCESS_TOKEN_TTL_SECONDS: integer(
      values.ACCESS_TOKEN_TTL_SECONDS,
      900,
      60,
      86_400,
      "ACCESS_TOKEN_TTL_SECONDS",
    ),
    REFRESH_TOKEN_TTL_SECONDS: integer(
      values.REFRESH_TOKEN_TTL_SECONDS,
      2_592_000,
      3600,
      31_536_000,
      "REFRESH_TOKEN_TTL_SECONDS",
    ),
  };
}

function requiredString(values: Record<string, unknown>, key: string): string {
  const value = values[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} is required.`);
  }
  return value;
}

function integer(
  raw: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
  name: string,
): number {
  const value = raw === undefined || raw === "" ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(
      `${name} must be an integer from ${String(minimum)} to ${String(maximum)}.`,
    );
  }
  return value;
}
