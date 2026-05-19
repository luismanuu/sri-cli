import type { Ambiente, TipoComprobante, TipoEmision } from '../types/enums.js';

/**
 * Datos necesarios para generar una clave de acceso SRI.
 *
 * Estructura final (49 dígitos):
 *   fechaEmision (8 ddmmaaaa) + tipoComprobante (2) + ruc (13) + ambiente (1)
 *   + establecimiento (3) + puntoEmision (3) + secuencial (9) + codigoNumerico (8)
 *   + tipoEmision (1) + digitoVerificador (1)
 */
export interface ClaveAccesoData {
  fechaEmision: Date;
  tipoComprobante: TipoComprobante | string;
  ruc: string;
  ambiente?: Ambiente;
  establecimiento: string;
  puntoEmision: string;
  secuencial: string;
  codigoNumerico?: string;
  tipoEmision?: TipoEmision;
}

/**
 * Componentes parseados de una clave de acceso válida.
 */
export interface ClaveAccesoParseada {
  fechaEmision: Date;
  tipoComprobante: string;
  ruc: string;
  ambiente: Ambiente;
  establecimiento: string;
  puntoEmision: string;
  secuencial: string;
  codigoNumerico: string;
  tipoEmision: TipoEmision;
  digitoVerificador: string;
}
