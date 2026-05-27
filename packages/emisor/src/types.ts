/**
 * Tipos públicos de @sri-cli/emisor.
 */

import type { Ambiente } from '@sri-cli/core';
import type {
  Ambiente as AmbienteSri,
  AutorizacionResult,
  RecepcionResult,
  SriMensaje,
} from '@sri-cli/sri-client';
import type {
  ComprobanteRecord,
  SaveComprobanteInput,
  UpdateComprobanteInput,
} from '@sri-cli/storage';

/**
 * Estado final del ciclo de emisión, en vocabulario del SRI:
 *
 * - `AUTORIZADO`: el comprobante quedó autorizado; trae número, fecha y XML.
 * - `DEVUELTA`: el SRI rechazó el comprobante en recepción; ver `errores`.
 * - `NO_AUTORIZADO`: el SRI rechazó el comprobante en autorización; ver `errores`.
 * - `EN_PROCESO`: el SRI recibió el comprobante pero aún no lo resuelve;
 *    conviene volver a consultar la autorización más tarde.
 */
export type EstadoEmision =
  | 'AUTORIZADO'
  | 'DEVUELTA'
  | 'NO_AUTORIZADO'
  | 'EN_PROCESO';

/** Resultado tipado de {@link emitirFactura}. */
export interface EmitirFacturaResult {
  estado: EstadoEmision;
  claveAcceso: string;
  numeroAutorizacion?: string;
  fechaAutorizacion?: string;
  /** XML autorizado del comprobante, solo cuando `estado` es `AUTORIZADO`. */
  comprobante?: string;
  /** Mensajes del SRI (motivos del rechazo o avisos). Nunca se ocultan. */
  errores: SriMensaje[];
  /**
   * `true` cuando el comprobante ya estaba AUTORIZADO en el store y se devolvió
   * sin volver a firmar ni a enviar al SRI (idempotencia por clave de acceso).
   */
  yaEmitido?: boolean;
}

/**
 * Subconjunto del store de comprobantes que usa la orquestación. Lo cumple
 * `ComprobanteStore` de @sri-cli/storage; se tipa como interfaz para poder
 * inyectar un doble en las pruebas sin abrir una base SQLite real.
 */
export interface StoreLike {
  get(claveAcceso: string): ComprobanteRecord;
  save(input: SaveComprobanteInput): ComprobanteRecord;
  update(claveAcceso: string, data: UpdateComprobanteInput): ComprobanteRecord;
  close(): void;
}

/**
 * Colaboradores de la orquestación. Tienen implementaciones reales por defecto
 * (firma con P12, SOAP del SRI, SQLite); se inyectan en las pruebas para
 * verificar el flujo sin red ni certificado.
 */
export interface EmisorDeps {
  firmar(xml: string, p12: Buffer, password: string): Promise<string>;
  enviarRecepcion(
    signedXml: string,
    ambiente: AmbienteSri,
  ): Promise<RecepcionResult>;
  consultarAutorizacion(
    claveAcceso: string,
    ambiente: AmbienteSri,
  ): Promise<AutorizacionResult>;
  abrirStore(ruc: string, sriHome?: string): StoreLike;
}

/** Opciones de {@link emitirFactura}. */
export interface EmitirFacturaOptions {
  /** Contenido del certificado .p12/.pfx del emisor. */
  p12: Buffer;
  /** Contraseña del P12. */
  p12Password: string;
  /** Ambiente del SRI: pruebas o producción. */
  ambiente: Ambiente;
  /** Directorio base del store local (por defecto ~/.sri-cli o $SRI_HOME). */
  sriHome?: string;
  /** Colaboradores inyectables (para pruebas). Por defecto, los reales. */
  deps?: Partial<EmisorDeps>;
}
