/**
 * Errores del dominio @sri-cli/emisor.
 *
 * Extienden SriCliError de @sri-cli/core para que el caller (CLI, MCP, API)
 * pueda distinguir errores de orquestación de errores de runtime. Los errores
 * de las capas inferiores (FirmaError, SriTransporteError, StorageError) se
 * propagan tal cual: la orquestación no los envuelve ni los oculta.
 */

import { SriCliError } from '@sri-cli/core';

/**
 * Error de validación previo a la emisión: el DTO no pasó el schema, falta el
 * secuencial o la identificación del comprador es inválida. No es un rechazo
 * del SRI (eso es un resultado DEVUELTA/NO_AUTORIZADO, no un error).
 */
export class EmisionError extends SriCliError {
  constructor(message: string, details?: unknown, cause?: Error) {
    super('EMISION', message, details, cause);
    this.name = 'EmisionError';
  }
}
