/**
 * Servicio de recepción de comprobantes del SRI.
 *
 * Portado de SriSoapClient.validarComprobante (open-api-facturacion-sri),
 * sin NestJS: el XML firmado se envía en base64 a la operación SOAP
 * `validarComprobante` y la respuesta se mapea a un RecepcionResult tipado.
 */

import { SriTransporteError } from './errors.js';
import { asArray, parseMensajes } from './parse.js';
import {
  WSDL_URLS,
  crearClienteSoapPorDefecto,
  type CrearClienteSoap,
} from './soap.js';
import type { Ambiente, RecepcionResult, SriMensaje } from './types.js';

export interface EnviarOptions {
  /** Factory de cliente SOAP. Por defecto usa la librería `soap` sobre el WSDL real. */
  crearCliente?: CrearClienteSoap;
}

/**
 * Envía un comprobante firmado al servicio de recepción del SRI.
 *
 * @param signedXml XML del comprobante ya firmado (XAdES-BES).
 * @param ambiente '1' = pruebas, '2' = producción.
 * @returns Estado RECIBIDA o DEVUELTA con los mensajes del SRI.
 * @throws {SriTransporteError} si falla la red, el SOAP o la respuesta es ilegible.
 */
export async function enviarComprobante(
  signedXml: string,
  ambiente: Ambiente,
  options: EnviarOptions = {},
): Promise<RecepcionResult> {
  const crearCliente = options.crearCliente ?? crearClienteSoapPorDefecto;
  const xmlBase64 = Buffer.from(signedXml, 'utf-8').toString('base64');

  let result: unknown;
  try {
    const client = await crearCliente(WSDL_URLS.recepcion[ambiente]);
    [result] = await client.validarComprobanteAsync({ xml: xmlBase64 });
  } catch (error) {
    throw new SriTransporteError(
      `No se pudo enviar el comprobante al SRI (recepción, ambiente ${ambiente})`,
      undefined,
      error as Error,
    );
  }

  return parseRecepcionResponse(result);
}

/** Mapea la respuesta cruda de `validarComprobante` a un RecepcionResult. */
function parseRecepcionResponse(result: unknown): RecepcionResult {
  const r = result as Record<string, any> | undefined;
  const response = r?.RespuestaRecepcionComprobante ?? r;

  const estadoRaw = response?.estado;
  if (estadoRaw !== 'RECIBIDA' && estadoRaw !== 'DEVUELTA') {
    throw new SriTransporteError(
      'El SRI devolvió una respuesta de recepción sin estado reconocible',
      { response },
    );
  }

  return {
    estado: estadoRaw,
    mensajes: extractMensajesRecepcion(response?.comprobantes),
  };
}

/** Recorre comprobantes[].mensajes[].mensaje y los aplana en un solo arreglo. */
function extractMensajesRecepcion(
  comprobantes: { comprobante?: any } | undefined,
): SriMensaje[] {
  const lista = asArray(comprobantes?.comprobante);
  return lista.flatMap((comp) => parseMensajes(comp?.mensajes));
}
