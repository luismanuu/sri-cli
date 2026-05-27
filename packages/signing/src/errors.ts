/**
 * Errores del dominio @sri-cli/signing.
 *
 * Extienden SriCliError de @sri-cli/core para que el caller (CLI, MCP, API)
 * pueda distinguir errores de firma de errores de runtime.
 */

import { SriCliError } from '@sri-cli/core';

/** Error al cargar o interpretar el certificado P12 (.p12/.pfx). */
export class CertificadoError extends SriCliError {
  constructor(message: string, details?: unknown, cause?: Error) {
    super('CERTIFICADO', message, details, cause);
    this.name = 'CertificadoError';
  }
}

/** Error durante la firma XAdES-BES del comprobante. */
export class FirmaError extends SriCliError {
  constructor(message: string, details?: unknown, cause?: Error) {
    super('FIRMA', message, details, cause);
    this.name = 'FirmaError';
  }
}
