# M1 Spec — `@sri-cli/core` compilando con tests verdes

## Objetivo

Tener el paquete `@sri-cli/core` con toda la lógica pura del SRI Ecuador portada desde [open-api-facturacion-sri](https://github.com/AngeloBarzolaVillamar/open-api-facturacion-sri), sin NestJS, sin Postgres, sin BullMQ. Solo funciones puras + clases simples + zod schemas.

## Scope

### 1. Estructura del paquete

```
packages/core/
  package.json     name: @sri-cli/core, type: module, main: dist/index.js
  tsconfig.json    extends ../../tsconfig.base.json
  src/
    index.ts                       # re-exports públicos
    catalogs/
      _meta.json                   # versión del catálogo (fecha de extracción)
      formas-pago.json
      impuestos.json
      retenciones.json
      tipos-identificacion.json
      documentos-sustento.json
      motivos-traslado.json
      tarifas-impuesto.json
      index.ts                     # loader tipado
    clave-acceso/
      index.ts                     # generación + parsing
      utils.ts                     # módulo 11
      types.ts
    xml-builder/
      factura.ts
      nota-credito.ts
      nota-debito.ts
      retencion.ts
      guia-remision.ts
      shared.ts                    # info-tributaria común
      index.ts
    validators/
      identificacion.ts            # cédula + RUC + módulo 11
      catalogo.ts                  # in-memory lookup contra catalogs/*.json
      index.ts
    comprobantes/
      totales.ts                   # cálculo de subtotal, IVA, total
      types.ts
    dto/
      factura.ts                   # zod schemas
      nota-credito.ts
      nota-debito.ts
      retencion.ts
      guia-remision.ts
      common.ts
      index.ts
    types/
      enums.ts                     # TipoComprobante, Ambiente, TipoEmision
      index.ts
    errors/
      index.ts                     # SriCliError + subclases
  test/
    catalogs.test.ts
    clave-acceso.test.ts
    validators-identificacion.test.ts
    totales.test.ts
    xml-builder-factura.test.ts    # snapshot
    dto-factura.test.ts
  tsup.config.ts                   # build config
```

### 2. Tarea principal del executor

#### 2.1 Clonar el repo base como referencia

```bash
git clone --depth 1 https://github.com/AngeloBarzolaVillamar/open-api-facturacion-sri /tmp/sri-base
```

NO commitearlo. Es solo para leer e identificar la lógica a portar.

#### 2.2 Extraer catálogos desde `init.sql`

Crear `scripts/extract-catalogs.ts` que:

1. Lee `/tmp/sri-base/database/init.sql`
2. Parsea cada `INSERT INTO catalogo_<tipo> (...)` con regex
3. Genera `packages/core/src/catalogs/<tipo>.json` por cada uno
4. Genera `_meta.json` con `{ extracted_at: ISO, source_commit: <sha del repo base>, total_records: N }`

Ejecutarlo una vez al final del M1 para tener los JSON listos. Documentar el comando en README de scripts.

#### 2.3 Portar lógica pura

Por cada módulo del repo base:

| Source (repo base) | Destination (sri-cli) | Cambios |
|---|---|---|
| `src/modules/sri/utils/clave-acceso.utils.ts` | `core/src/clave-acceso/utils.ts` | Copia directa, traducir comentarios al español |
| `src/modules/sri/services/clave-acceso.service.ts` | `core/src/clave-acceso/index.ts` | Quitar `@Injectable`, exportar funciones puras |
| `src/modules/sri/services/xml-builder.service.ts` | `core/src/xml-builder/*.ts` | Splitear por tipo de comprobante, una función por tipo |
| `src/modules/sri/services/identificacion-validator.service.ts` | `core/src/validators/identificacion.ts` | Quitar DI, funciones puras |
| `src/modules/sri/services/catalogo-validator.service.ts` | `core/src/validators/catalogo.ts` | **Cambio crítico**: en vez de consultar Postgres, recibe arrays cargados de `catalogs/*.json` |
| `src/modules/sri/services/factura-totales.spec.ts` + lógica | `core/src/comprobantes/totales.ts` | Lógica + spec porteados |
| `src/modules/sri/dto/*.ts` (class-validator) | `core/src/dto/*.ts` (zod) | **Reescribir** como zod schemas |
| `src/modules/sri/constants/sri.enums.ts` | `core/src/types/enums.ts` | Copia |

**Reglas estrictas para el port**:
- Cero NestJS imports
- Cero decoradores (`@Injectable`, `@OnEvent`, etc.)
- Cero `class-validator` / `class-transformer` — reemplazar por zod
- Cero acceso a DB
- Cero `Logger` injectado — usar `console` o aceptar logger opcional como parámetro
- Comentarios en español neutro
- Identifiers en español neutro (ej: `generarClaveAcceso`, `EmisorContexto`, `firmarXml`)

### 3. Errors

`core/src/errors/index.ts`:

```ts
export class SriCliError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown,
    public cause?: Error,
  ) {
    super(message);
    this.name = 'SriCliError';
  }
  toJSON() {
    return { code: this.code, message: this.message, details: this.details };
  }
}

// Subclases iniciales (más a futuro)
export class ValidacionDtoError extends SriCliError {}
export class CatalogoError extends SriCliError {}
export class ClaveAccesoError extends SriCliError {}
```

### 4. Tests requeridos (vitest)

- `clave-acceso.test.ts`: port del `.spec.ts` del repo base + agregar edge cases del módulo 11
- `totales.test.ts`: port del `factura-totales.spec.ts`
- `validators-identificacion.test.ts`: probar con cédulas y RUCs ecuatorianos conocidos (válidos e inválidos)
- `xml-builder-factura.test.ts`: snapshot del XML generado contra un fixture esperado
- `dto-factura.test.ts`: validar fixtures válidos pasan zod + casos inválidos fallan con mensajes en español

Cobertura objetivo: ≥80% en `core/`.

### 5. Build

`packages/core/tsup.config.ts`:

```ts
import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node20',
});
```

`packages/core/package.json` exporta:
```json
{
  "name": "@sri-cli/core",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" } },
  "files": ["dist", "src/catalogs"],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

### 6. Anti-voseo

NO usar formas voseo en código, comentarios, ni strings de error. El CI workflow ya verifica esto vía `scripts/check-voseo.mjs`.

## Definition of Done

- [ ] `pnpm install` instala todas las deps sin errores
- [ ] `pnpm -F @sri-cli/core build` produce `dist/index.js` + `dist/index.d.ts` válidos
- [ ] `pnpm -F @sri-cli/core test` corre y pasa todos los tests
- [ ] Cobertura ≥ 80% en `packages/core/src/`
- [ ] `pnpm lint:voseo` clean
- [ ] `scripts/extract-catalogs.ts` corrido y los `core/src/catalogs/*.json` generados con `_meta.json`
- [ ] Commit message: `feat(core): scaffold + port pure logic from open-api-facturacion-sri`
- [ ] PR abierto contra `main` con el diff completo + descripción explicando qué se portó

## Out of scope (NO en M1)

- Storage / SQLite / config (eso es M2)
- CLI commands (eso es M2-M3)
- MCP server (eso es M7)
- SOAP client (eso es M3)
- XML signer (eso es M3, requiere certs en runtime)
- PDF / RIDE (eso es M9)
- Discord notifier (eso es M10)

## Operating principles (CEO ruling 2026-04-23, non-negotiable)

El brief incluye verbatim las 4 secciones del prefix en `/home/luis/.aria/prompts/claude-p-prefix.md`. Surgical changes, no refactors adyacentes, no especulación de features futuros. Si algo es ambiguo, parar y preguntar.

## Cuando termines

1. Escribir `.aria/done-m1.md` con resumen de lo que portaste, métricas de tests, % cobertura
2. Push branch + abrir PR contra `main`
3. STOP. No avanzar a M2 sin aprobación CEO.
