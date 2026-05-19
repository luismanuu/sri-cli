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
 * Construye el bloque `infoTributaria` común a todos los comprobantes.
 * El orden de las claves importa porque xml2js respeta el orden de
 * iteración del objeto.
 */
export function construirInfoTributaria(info: InfoTributaria): Record<string, unknown> {
  const result: Record<string, unknown> = {
    ambiente: info.ambiente,
    tipoEmision: info.tipoEmision,
    razonSocial: info.razonSocial,
  };

  if (info.nombreComercial) {
    result.nombreComercial = info.nombreComercial;
  }

  result.ruc = info.ruc;
  result.claveAcceso = info.claveAcceso;
  result.codDoc = info.codDoc;
  result.estab = info.estab;
  result.ptoEmi = info.ptoEmi;
  result.secuencial = info.secuencial;
  result.dirMatriz = info.dirMatriz;

  if (info.agenteRetencion) {
    result.agenteRetencion = info.agenteRetencion;
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
      $: { nombre: campo.nombre },
      _: campo.valor,
    })),
  };
}
