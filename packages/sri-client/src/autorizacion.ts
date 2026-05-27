/**
 * Servicio de autorización de comprobantes del SRI.
 *
 * Portado de SriSoapClient.autorizarComprobante (open-api-facturacion-sri),
 * sin NestJS: se consulta la operación SOAP `autorizacionComprobante` con la
 * clave de acceso y se mapea la respuesta a un AutorizacionResult tipado.
 */

import { ClaveAccesoError } from '@sri-cli/core';
import { SriTransporteError } from './errors.js';
import { asArray, parseMensajes } from './parse.js';
import {
  WSDL_URLS,
  crearClienteSoapPorDefecto,
  type CrearClienteSoap,
} from './soap.js';
import type { Ambiente, AutorizacionResult } from './types.js';

export interface ConsultarOptions {
  /** Factory de cliente SOAP. Por defecto usa la librería `soap` sobre el WSDL real. */
  crearCliente?: CrearClienteSoap;
}

/**
 * Consulta la autorización de un comprobante por su clave de acceso.
 *
 * @param claveAcceso Clave de acceso de 49 dígitos del comprobante.
 * @param ambiente '1' = pruebas, '2' = producción.
 * @returns Estado AUTORIZADO, NO AUTORIZADO o EN PROCESO con los mensajes del SRI.
 * @throws {ClaveAccesoError} si la clave no tiene 49 dígitos.
 * @throws {SriTransporteError} si falla la red, el SOAP o la respuesta es ilegible.
 */
export async function consultarAutorizacion(
  claveAcceso: string,
  ambiente: Ambiente,
  options: ConsultarOptions = {},
): Promise<AutorizacionResult> {
  if (claveAcceso.length !== 49) {
    throw new ClaveAccesoError('La clave de acceso debe tener 49 dígitos', {
      longitud: claveAcceso.length,
    });
  }

  const crearCliente = options.crearCliente ?? crearClienteSoapPorDefecto;

  let result: unknown;
  try {
    const client = await crearCliente(WSDL_URLS.autorizacion[ambiente]);
    [result] = await client.autorizacionComprobanteAsync({
      claveAccesoComprobante: claveAcceso,
    });
  } catch (error) {
    throw new SriTransporteError(
      `No se pudo consultar la autorización en el SRI (ambiente ${ambiente})`,
      undefined,
      error as Error,
    );
  }

  return parseAutorizacionResponse(result, claveAcceso);
}

/** Mapea la respuesta cruda de `autorizacionComprobante` a un AutorizacionResult. */
function parseAutorizacionResponse(
  result: unknown,
  claveAcceso: string,
): AutorizacionResult {
  const r = result as Record<string, any> | undefined;
  const response = r?.RespuestaAutorizacionComprobante ?? r;

  if (response === undefined || response === null) {
    throw new SriTransporteError(
      'El SRI devolvió una respuesta de autorización vacía',
      { response: result },
    );
  }

  const autorizaciones = asArray(response?.autorizaciones?.autorizacion);
  // Sin nodo de autorización el SRI todavía no resolvió: EN PROCESO.
  if (autorizaciones.length === 0) {
    return { estado: 'EN PROCESO', claveAcceso, mensajes: [] };
  }

  const auth = autorizaciones[0];
  const estadoRaw = auth?.estado;
  if (
    estadoRaw !== 'AUTORIZADO' &&
    estadoRaw !== 'NO AUTORIZADO' &&
    estadoRaw !== 'EN PROCESO'
  ) {
    throw new SriTransporteError(
      'El SRI devolvió una autorización sin estado reconocible',
      { auth },
    );
  }

  return {
    estado: estadoRaw,
    claveAcceso,
    numeroAutorizacion: auth?.numeroAutorizacion,
    fechaAutorizacion: auth?.fechaAutorizacion,
    comprobante: estadoRaw === 'AUTORIZADO' ? auth?.comprobante : undefined,
    mensajes: parseMensajes(auth?.mensajes),
  };
}
