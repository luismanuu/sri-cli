# M1 Fixes — Done

Aplicados los 2 blockers + 5 should-fix + 2 nits del review del PR #1
sobre `feat/m1-core-scaffold`. N3 (.aria/ gitignore) NO aplicado:
opcional y los artefactos PM ya estaban committeados; dejarlo para una
limpieza posterior si se decide.

## Commits (en orden)

| Commit  | Fix | Resumen                                                              |
|---------|-----|----------------------------------------------------------------------|
| 7a7d588 | B1  | `precioTotalSinImpuesto` agregado al `detalleFacturaSchema`           |
| 32a053d | B2  | `formatearFecha` TZ-locked a America/Guayaquil con Intl              |
| 166baff | S1  | `importeTotal` usa `totalSinImpuestos` redondeado para invariante exacto |
| bb17790 | S2  | `sanitizarTextoSri()` aplicado en 5 builders + shared                 |
| 1991950 | S3  | Tests zod para nota-credito, nota-debito, retencion, guia-remision    |
| ee23fba | S4  | Provincia 30 aceptada en `validarCedula` y `validarRuc`               |
| 2702e95 | S5  | `padStart(8,'0')` defensivo en `generarCodigoNumerico`                |
| 301f48f | N1+N2 | tarifa `.max(100)` y `validarRucBasico` rechaza no-dígitos          |

## Métricas

| Métrica               | Antes  | Después | Δ           |
|-----------------------|--------|---------|-------------|
| Tests pasando         | 87     | 114     | +27         |
| Test files            | 8      | 12      | +4          |
| Coverage stmts        | 85.07% | 97.38%  | +12.31 pts  |
| Coverage branch       | 77.18% | 79.22%  | +2.04 pts   |
| Coverage funcs        | 91.48% | 100%    | +8.52 pts   |
| Lint voseo            | clean  | clean   | =           |
| `pnpm build`          | clean  | clean   | =           |

## Tests de regresión clave

- `formatearFecha (timezone-safe, B2)`: 3 tests que aseguran que el día
  formatted en ECT NO depende del TZ del runtime (UTC, NY, Tokyo).
- `detalleFacturaSchema — precioTotalSinImpuesto (B1)`: campo ausente
  rechaza con mensaje, negativo rechaza, detalle parseado pasa a
  `construirFacturaXml` sin crash.
- `calcularTotales` con 12 líneas a tarifas mixtas (0/12/14%) verifica
  invariante `importeTotal == totalSinImpuestos + Σvalor` exacto.
- `xml-builder-factura` con caracteres de control C0/C1: output XML libre
  de chars prohibidos por XSD del SRI.
- `validarCedula/RUC` con provincia 30: acepta sin error.

## Próximos pasos

- Esperar review/approval del CEO sobre PR #1.
- Si aprobado, mergear a `main` y arrancar M2.
- N3 (gitignore `.aria/`) queda como item pendiente de decisión.
