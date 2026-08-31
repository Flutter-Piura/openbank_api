# OpenBank API

Backend autoritativo de OpenBank, plataforma bancaria educativa de Flutter Piura.

> Solo admite usuarios, cuentas y dinero ficticios. No debe operar información ni fondos reales.

## Estado

Fundación del repositorio. La implementación prevista es un monolito modular con NestJS, TypeScript y PostgreSQL, aplicando Clean Architecture.

Módulos iniciales: identity, customers, accounts, ledger, transactions y transfers.

Consulta el [plan maestro](https://github.com/Flutter-Piura/openbank_docs/blob/main/PLAN_MAESTRO.md) y [ADR-0001](https://github.com/Flutter-Piura/openbank_docs/blob/main/adr/0001-clean-architecture-contract-first.md).

## Principios

- El dominio no depende de NestJS ni de PostgreSQL.
- Los cambios HTTP comienzan en `openbank_contracts`.
- Los importes usan unidades menores enteras.
- Las transferencias son atómicas e idempotentes.
- El ledger usa asientos inmutables y balanceados.

## Contribuir

Consulta [CONTRIBUTING.md](CONTRIBUTING.md) y reporta vulnerabilidades mediante [SECURITY.md](SECURITY.md).

## Licencia

[MIT](LICENSE).
