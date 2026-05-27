/**
 * Errores del dominio @sri-cli/sri-client.
 *
 * Extienden SriCliError de @sri-cli/core para que el caller (CLI, MCP, API)
 * pueda distinguir errores de transporte de errores de runtime.
 */

import { SriCliError } from '@sri-cli/core';

/**
 * Error de transporte al comunicarse con el SRI: red caída, timeout, DNS,
 * SOAP fault o respuesta sin el cuerpo esperado. Distinto de una respuesta
 * válida con estado DEVUELTA / NO AUTORIZADO, que no es un error sino un
 * resultado del negocio.
 */
export class SriTransporteError extends SriCliError {
  constructor(message: string, details?: unknown, cause?: Error) {
    super('TRANSPORTE', message, details, cause);
    this.name = 'SriTransporteError';
  }
}
