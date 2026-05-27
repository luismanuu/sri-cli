/**
 * @sri-cli/sri-client — Cliente SOAP de recepción y autorización del SRI Ecuador.
 *
 * Funciones puras (sin NestJS ni DI): `enviarComprobante` envía el XML firmado
 * al servicio de recepción y `consultarAutorizacion` consulta el estado de
 * autorización. Las URLs WSDL y las operaciones son las mismas del repo de
 * referencia (open-api-facturacion-sri).
 */

export { enviarComprobante } from './recepcion.js';
export type { EnviarOptions } from './recepcion.js';
export { consultarAutorizacion } from './autorizacion.js';
export type { ConsultarOptions } from './autorizacion.js';
export { SriTransporteError } from './errors.js';
export {
  WSDL_URLS,
  crearClienteSoapPorDefecto,
  type CrearClienteSoap,
  type SoapClientLike,
  type ServicioSri,
} from './soap.js';
export type {
  Ambiente,
  SriMensaje,
  RecepcionResult,
  AutorizacionResult,
} from './types.js';
