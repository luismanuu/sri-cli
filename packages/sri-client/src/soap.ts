/**
 * Capa SOAP: endpoints del SRI y creación de clientes.
 *
 * Las URLs WSDL y los nombres de operación se mantienen idénticos al repo de
 * referencia (sri-soap-factory.service.ts). El factory de clientes es
 * inyectable para poder probar el build de la petición y el parseo de la
 * respuesta sin tocar la red.
 */

import type { Ambiente } from './types.js';

/** Servicio SOAP del SRI. */
export type ServicioSri = 'recepcion' | 'autorizacion';

/**
 * URLs WSDL del SRI por servicio y ambiente.
 * '1' = pruebas (celcer), '2' = producción (cel). Idénticas a la referencia.
 */
export const WSDL_URLS: Record<ServicioSri, Record<Ambiente, string>> = {
  recepcion: {
    '1': 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
    '2': 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
  },
  autorizacion: {
    '1': 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl',
    '2': 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl',
  },
};

/**
 * Cliente SOAP mínimo que usan recepción y autorización. La librería `soap`
 * expone estas operaciones de forma dinámica a partir del WSDL; aquí solo se
 * tipan las dos que se utilizan.
 */
export interface SoapClientLike {
  validarComprobanteAsync(args: { xml: string }): Promise<[unknown]>;
  autorizacionComprobanteAsync(args: {
    claveAccesoComprobante: string;
  }): Promise<[unknown]>;
}

/** Crea un cliente SOAP a partir de una URL WSDL. */
export type CrearClienteSoap = (wsdlUrl: string) => Promise<SoapClientLike>;

/**
 * Factory por defecto: usa la librería `soap` (igual que la referencia).
 * Se importa de forma diferida para que las pruebas con cliente inyectado no
 * carguen la dependencia.
 */
export const crearClienteSoapPorDefecto: CrearClienteSoap = async (wsdlUrl) => {
  const soap = await import('soap');
  return (await soap.createClientAsync(wsdlUrl)) as unknown as SoapClientLike;
};
