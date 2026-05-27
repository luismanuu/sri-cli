/**
 * Tipos del cliente SOAP del SRI Ecuador.
 *
 * Portados de las interfaces del repo de referencia (open-api-facturacion-sri,
 * sri-response.interface.ts), recortados a lo que devuelven los servicios de
 * recepción y autorización.
 */

/** Ambiente del SRI: '1' = pruebas (certificación), '2' = producción. */
export type Ambiente = '1' | '2';

/** Mensaje informativo o de error que devuelve el SRI en sus respuestas. */
export interface SriMensaje {
  identificador: string;
  mensaje: string;
  informacionAdicional?: string;
  tipo: 'ERROR' | 'ADVERTENCIA' | 'INFORMATIVO';
}

/**
 * Resultado de enviar un comprobante al servicio de recepción.
 *
 * - `RECIBIDA`: el SRI aceptó el comprobante para procesarlo.
 * - `DEVUELTA`: el SRI lo rechazó; `mensajes` contiene los motivos.
 */
export interface RecepcionResult {
  estado: 'RECIBIDA' | 'DEVUELTA';
  /** Motivos del rechazo (DEVUELTA) o avisos (RECIBIDA). Nunca se ocultan. */
  mensajes: SriMensaje[];
}

/**
 * Resultado de consultar la autorización de un comprobante.
 *
 * - `AUTORIZADO`: el comprobante quedó autorizado; trae número, fecha y el XML.
 * - `NO AUTORIZADO`: el SRI lo rechazó; `mensajes` contiene los motivos.
 * - `EN PROCESO`: el SRI aún no resuelve; conviene reintentar más tarde.
 */
export interface AutorizacionResult {
  estado: 'AUTORIZADO' | 'NO AUTORIZADO' | 'EN PROCESO';
  claveAcceso: string;
  numeroAutorizacion?: string;
  fechaAutorizacion?: string;
  /** XML autorizado (incluye el comprobante firmado), solo cuando AUTORIZADO. */
  comprobante?: string;
  /** Motivos del rechazo o avisos del SRI. Nunca se ocultan. */
  mensajes: SriMensaje[];
}
