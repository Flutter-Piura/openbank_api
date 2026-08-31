# Contribuir a OpenBank API

1. Revisa el plan maestro, ADR y contrato vigente.
2. Busca o crea un issue antes de cambios grandes.
3. Crea una rama corta desde `main`.
4. No uses datos, credenciales o integraciones financieras reales.

Usa Conventional Commits:

```text
feat(ledger): record balanced entries
fix(transfers): enforce idempotency
test(accounts): cover inactive account
```

Todo PR debe incluir pruebas, impacto en OpenAPI, migraciones y compatibilidad. El dominio no puede importar NestJS, ORM, HTTP o drivers de base de datos.

Los comandos de validación se añadirán con el scaffold de la API. Hasta entonces, ejecuta el workflow de higiene y `git diff --check`.

Al participar aceptas el [Código de conducta](CODE_OF_CONDUCT.md).
