/**
 * @sri-cli/emisor — Orquestación del ciclo de emisión de facturas del SRI.
 *
 * Ata @sri-cli/core, @sri-cli/signing, @sri-cli/sri-client y @sri-cli/storage
 * en un solo flujo: `emitirFactura` construye, firma, envía, autoriza y
 * persiste una factura electrónica, devolviendo un resultado tipado con los
 * mensajes del SRI. Solo factura por ahora (NC/ND/retención/guía más adelante).
 */

export { emitirFactura } from './emitir.js';
export { construirFacturaDesdeDto } from './factura.js';
export { EmisionError } from './errors.js';
export type {
  EstadoEmision,
  EmitirFacturaResult,
  EmitirFacturaOptions,
  EmisorDeps,
  StoreLike,
} from './types.js';
