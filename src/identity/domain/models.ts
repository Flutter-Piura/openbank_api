export interface IdentityCustomer {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
}

export interface AuthSession {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly tokenType: "Bearer";
  readonly expiresInSeconds: number;
}

export interface AuthPrincipal {
  readonly customerId: string;
}
