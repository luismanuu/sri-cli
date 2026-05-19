# M1 Done — `@sri-cli/core` v0.0.0

Branch: `feat/m1-core-scaffold`
Source commit del repo base: `87c9ce42e435cde5fc621ab702642bdfb27d5c45`
(open-api-facturacion-sri, AngeloBarzolaVillamar).

## Qué se portó

Lógica pura del SRI Ecuador, sin NestJS / Postgres / BullMQ. Solo funciones,
clases simples y schemas zod.

### Módulos

| Módulo | Source repo base | Cambio |
|---|---|---|
| `clave-acceso/utils.ts` | `modules/sri/utils/clave-acceso.utils.ts` | identifiers en español, errores tipados `ClaveAccesoError` |
| `clave-acceso/index.ts` | `modules/sri/services/clave-acceso.service.ts` | sin `@Injectable`, funciones puras `generarClaveAcceso/validarFormatoClaveAcceso/parsearClaveAcceso` |
| `validators/identificacion.ts` | `modules/sri/services/identificacion-validator.service.ts` | sin DI; dispatch por tipo; cedula módulo 10; RUC natural/privada/pública |
| `validators/catalogo.ts` | `modules/sri/services/catalogo-validator.service.ts` | **refactor crítico**: sin Postgres ni cache TTL; recibe catálogos por parámetro |
| `comprobantes/totales.ts` | `modules/sri/services/factura.service.ts#calculateTotales` | función pura `calcularTotales` con Decimal.js |
| `xml-builder/*.ts` | `modules/sri/services/xml-builder.service.ts` | splitteado en 5 archivos (factura/nota-credito/nota-debito/retencion/guia-remision) + `shared.ts` |
| `dto/*.ts` | `modules/sri/dto/*.ts` | **reescritos** de class-validator a zod |
| `types/enums.ts` | `modules/sri/constants/sri.enums.ts` | copia, agregando `VERSIONES` y `TIPO_COMPROBANTE_DESCRIPCIONES` |
| `errors/index.ts` | n/a | nuevo: `SriCliError` + subclases `ValidacionDtoError/CatalogoError/ClaveAccesoError/IdentificacionError` |

### Catálogos

Extraídos por `scripts/extract-catalogs.ts` desde `database/init.sql`. 7 archivos JSON + `_meta.json`:

| Archivo | Registros |
|---|---|
| `documentos-sustento.json` | 23 |
| `formas-pago.json` | 8 |
| `impuestos.json` | 3 |
| `motivos-traslado.json` | 9 |
| `retenciones.json` | 24 |
| `tarifas-impuesto.json` | 8 |
| `tipos-identificacion.json` | 5 |
| **Total** | **80** |

Re-ejecución: `pnpm exec tsx scripts/extract-catalogs.ts /tmp/sri-base`.

## Métricas

### Tests (vitest)

```
 Test Files  8 passed (8)
      Tests  87 passed (87)
```

Suite:
- `catalogs.test.ts` — 6 tests (loader + cruce tarifas/impuestos)
- `clave-acceso.test.ts` — 16 tests (generate/parse/validate + módulo 11)
- `validators-identificacion.test.ts` — 24 tests (cédula, RUC natural/privada/pública, pasaporte, consumidor final)
- `validators-catalogo.test.ts` — 16 tests
- `totales.test.ts` — 6 tests (portados del `factura-totales.spec.ts` base)
- `xml-builder-factura.test.ts` — 5 tests (snapshot + asserts puntuales)
- `xml-builder-otros.test.ts` — 6 tests (nota crédito/débito, retención, guía)
- `dto-factura.test.ts` — 8 tests (fixtures válidos + casos inválidos con mensajes ES)

### Coverage (v8, thresholds 80/80/80/75)

```
All files            85.03 %  Stmts  | 76.73 %  Branch | 91.48 %  Funcs | 85.03 %  Lines
  clave-acceso       100
  comprobantes       100
  validators         97.38
  xml-builder        94.85
  types              100
  dto                39.93   (común+factura 100; resto sin tests específicos en M1)
```

### Build

```
ESM dist/index.js     67.14 KB
DTS dist/index.d.ts   82.44 KB
```

## Definition of Done

- [x] `pnpm install` sin errores
- [x] `pnpm -F @sri-cli/core build` produce ESM + d.ts válidos
- [x] `pnpm -F @sri-cli/core test` 87/87 verdes
- [x] Cobertura ≥ 80% lines/stmts/funcs
- [x] `pnpm lint:voseo` clean
- [x] `scripts/extract-catalogs.ts` ejecutado, JSONs + `_meta.json` generados
- [x] `.aria/done-m1.md` (este archivo)

## Out of scope (lo que NO se hizo, por spec)

- Storage / SQLite / config — M2
- CLI commands — M2/M3
- MCP server — M7
- SOAP client — M3
- XML signer (XAdES-BES) — M3
- PDF / RIDE — M9
- Discord notifier — M10

## STOP

Esperando review del CEO antes de abrir M2.
