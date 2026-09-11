# OpenBank API

Backend autoritativo de OpenBank, plataforma bancaria educativa de Flutter Piura.

> Solo admite usuarios, cuentas y dinero ficticios. No debe operar información ni fondos reales.

## Funcionalidad

API NestJS y PostgreSQL lista para desarrollo local: sesión JWT con refresh token rotatorio, perfil, cuentas, movimientos paginados y transferencias internas atómicas e idempotentes. Implementa el contrato `openbank_contracts` 0.1.0.

Credenciales exclusivamente de demostración:

```text
demo@openbank.local
OpenBankDemo!2026
```

## Ejecutar localmente

La experiencia recomendada está en `openbank_infrastructure` y levanta base de datos, migraciones y API con un solo comando. Para trabajar solo en este repositorio:

```bash
cp .env.example .env
npm ci
docker run --name openbank-postgres --rm \
  -e POSTGRES_DB=openbank -e POSTGRES_USER=openbank -e POSTGRES_PASSWORD=openbank \
  -p 5432:5432 postgres:17.6-alpine
npm run db:migrate
npm run start:dev
```

La API queda disponible en `http://127.0.0.1:3000`; `GET /health` comprueba también PostgreSQL.

## Verificación

```bash
npm run quality
npm run db:migrate
npm run test:e2e
npm audit --audit-level=high
docker build -t openbank-api .
```

Las pruebas E2E requieren PostgreSQL migrado y las variables de `.env.example`.

## Arquitectura

Cada módulo sigue `domain → application → infrastructure/interfaces`. Dominio y casos de uso no importan NestJS ni PostgreSQL; los módulos Nest conectan puertos con adaptadores mediante tokens de inyección.

```text
src/
├── identity/       # login, refresh, logout y JWT
├── banking/        # perfil, cuentas, ledger y transferencias
├── shared/         # base de datos, guard, correlación y errores
└── system/         # health check
```

Consulta el [plan maestro](https://github.com/Flutter-Piura/openbank_docs/blob/main/PLAN_MAESTRO.md) y [ADR-0001](https://github.com/Flutter-Piura/openbank_docs/blob/main/adr/0001-clean-architecture-contract-first.md).

## Principios

- El dominio no depende de NestJS ni de PostgreSQL.
- Los cambios HTTP comienzan en `openbank_contracts`.
- Los importes usan unidades menores enteras.
- Las transferencias son atómicas e idempotentes.
- El ledger usa asientos inmutables y balanceados.
- Cada intención de transferencia reutiliza un UUID en `Idempotency-Key`.
- Los errores públicos siguen `ProblemDetails` y nunca filtran detalles internos.

## Contribuir

Consulta [CONTRIBUTING.md](CONTRIBUTING.md) y reporta vulnerabilidades mediante [SECURITY.md](SECURITY.md).

## Licencia

[MIT](LICENSE).
