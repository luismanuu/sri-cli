import { SriCliError } from '@sri-cli/core';

export class StorageError extends SriCliError {
  constructor(message: string, details?: unknown, cause?: Error) {
    super('STORAGE', message, details, cause);
    this.name = 'StorageError';
  }
}

export class ComprobanteNotFoundError extends SriCliError {
  constructor(claveAcceso: string) {
    super('COMPROBANTE_NOT_FOUND', `Comprobante no encontrado: ${claveAcceso}`, {
      claveAcceso,
    });
    this.name = 'ComprobanteNotFoundError';
  }
}

export class ComprobanteDuplicadoError extends SriCliError {
  constructor(claveAcceso: string) {
    super('COMPROBANTE_DUPLICADO', `Comprobante ya existe: ${claveAcceso}`, {
      claveAcceso,
    });
    this.name = 'ComprobanteDuplicadoError';
  }
}
