import { Builder } from 'xml2js';
import type { InfoTributaria } from '../comprobantes/types.js';

/**
 * Builder XML compartido por todos los comprobantes.
 * Configuración alineada con los XSD del SRI:
 *   - cabecera <?xml version="1.0" encoding="UTF-8"?>
 *   - indentación de 2 espacios
 *   - sin atributos por defecto
 */
export function crearBuilderXml(): Builder {
  return new Builder({
    xmldec: { version: '1.0', encoding: 'UTF-8' },
    renderOpts: { pretty: true, indent: '  ' },
    headless: false,
  });
}

/**
 * Formatea un número como string con N decimales fijos (estilo SRI).
 */
export function formatearDecimal(valor: number, decimales: number): string {
  return valor.toFixed(decimales);
}

/**
 * Sanitiza texto para inclusión en XML del SRI.
 *
 * Elimina caracteres de control C0 (excepto \t y \n), C1 (incluye NEL
 * U+0085), y separadores Unicode U+2028/U+2029. xml2js los escapaba como
 * `&#NN;` pero los XSDs del SRI no aceptan esas entidades y rechazan el
 * comprobante con error de validación. Estos caracteres pueden colarse
 * fácilmente desde input copiado de PDFs, Word, o sistemas legacy.
 */
// eslint-disable-next-line no-control-regex
const RE_CHARS_PROHIBIDOS_SRI = /[\x00-\x08\x0B-\x1F\x7F-\x9F\u2028\u2029]/g;

export function sanitizarTextoSri(s: string | undefined | null): string {
  if (s == null) return '';
  return s.replace(RE_CHARS_PROHIBIDOS_SRI, '');
}

/**
 * Construye el bloque `infoTributaria` común a todos los comprobantes.
 * El orden de las claves importa porque xml2js respeta el orden de
 * iteración del objeto.
 */
export function construirInfoTributaria(info: InfoTributaria): Record<string, unknown> {
  const result: Record<string, unknown> = {
    ambiente: info.ambiente,
    tipoEmision: info.tipoEmision,
    razonSocial: sanitizarTextoSri(info.razonSocial),
  };

  if (info.nombreComercial) {
    result.nombreComercial = sanitizarTextoSri(info.nombreComercial);
  }

  result.ruc = info.ruc;
  result.claveAcceso = info.claveAcceso;
  result.codDoc = info.codDoc;
  result.estab = info.estab;
  result.ptoEmi = info.ptoEmi;
  result.secuencial = info.secuencial;
  result.dirMatriz = sanitizarTextoSri(info.dirMatriz);

  if (info.agenteRetencion) {
    result.agenteRetencion = sanitizarTextoSri(info.agenteRetencion);
  }
  if (info.contribuyenteRimpe) {
    result.contribuyenteRimpe = info.contribuyenteRimpe;
  }

  return result;
}

/**
 * Construye el bloque `infoAdicional` (campoAdicional[]) común a todos los
 * comprobantes. Devuelve null si no hay campos.
 */
export function construirInfoAdicional(
  campos: { nombre: string; valor: string }[] | undefined,
): { campoAdicional: Array<{ $: { nombre: string }; _: string }> } | null {
  if (!campos || campos.length === 0) return null;
  return {
    campoAdicional: campos.map((campo) => ({
      $: { nombre: sanitizarTextoSri(campo.nombre) },
      _: sanitizarTextoSri(campo.valor),
    })),
  };
}
