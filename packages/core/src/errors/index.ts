/**
 * Errores del dominio @sri-cli/core.
 *
 * Todos los errores extienden SriCliError para que el caller (CLI, MCP, API)
 * pueda distinguir errores propios del módulo de errores de runtime.
 */

export class SriCliError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'SriCliError';
  }

  toJSON(): { code: string; message: string; details?: unknown } {
    return { code: this.code, message: this.message, details: this.details };
  }
}

export class ValidacionDtoError extends SriCliError {
  constructor(message: string, details?: unknown) {
    super('VALIDACION_DTO', message, details);
    this.name = 'ValidacionDtoError';
  }
}

export class CatalogoError extends SriCliError {
  constructor(message: string, details?: unknown) {
    super('CATALOGO', message, details);
    this.name = 'CatalogoError';
  }
}

export class ClaveAccesoError extends SriCliError {
  constructor(message: string, details?: unknown) {
    super('CLAVE_ACCESO', message, details);
    this.name = 'ClaveAccesoError';
  }
}

export class IdentificacionError extends SriCliError {
  constructor(message: string, details?: unknown) {
    super('IDENTIFICACION', message, details);
    this.name = 'IdentificacionError';
  }
}
