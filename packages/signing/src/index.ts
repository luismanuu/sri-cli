/**
 * @sri-cli/signing — Firma XAdES-BES de comprobantes del SRI Ecuador.
 *
 * Funciones puras (sin NestJS ni DI): entrada = XML del comprobante + P12 +
 * contraseña, salida = XML firmado compatible con los requerimientos del SRI.
 */

export { loadP12FromBuffer } from './p12.js';
export type { CertificadoCargado } from './p12.js';
export { signFactura, signXmlConCertificado } from './sign.js';
export type { SignOptions } from './sign.js';
export { CertificadoError, FirmaError } from './errors.js';
