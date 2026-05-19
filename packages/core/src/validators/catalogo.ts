/**
 * Validadores de códigos contra los catálogos SRI en memoria.
 *
 * A diferencia del repo base — que consulta Postgres en runtime con cache TTL —
 * acá los catálogos son JSON estáticos cargados en compilación. Por eso las
 * funciones son sincrónicas y no requieren cache.
 *
 * Las funciones aceptan los catálogos por parámetro para mantenerlas puras y
 * testeables; un wrapper en `index.ts` las expone ligadas a los catálogos
 * embebidos del paquete.
 */

import type {
  DocumentoSustentoCatalogo,
  FormaPagoCatalogo,
  MotivoTrasladoCatalogo,
  RetencionCatalogo,
  TarifaConImpuesto,
  TipoIdentificacionCatalogo,
} from '../catalogs/index.js';

export interface ResultadoCatalogo<T> {
  valido: boolean;
  registro?: T;
  error?: string;
}

export interface ResultadoMultiple {
  valido: boolean;
  errores: string[];
}

export function validarTarifaImpuesto(
  codigoImpuesto: string,
  codigoPorcentaje: string,
  tarifas: readonly TarifaConImpuesto[],
): ResultadoCatalogo<TarifaConImpuesto> {
  const tarifa = tarifas.find(
    (t) => t.impuesto_codigo === codigoImpuesto && t.codigo_porcentaje === codigoPorcentaje,
  );
  if (!tarifa) {
    return {
      valido: false,
      error: `Código de impuesto ${codigoImpuesto} con tarifa ${codigoPorcentaje} no encontrado en catálogo`,
    };
  }
  return { valido: true, registro: tarifa };
}

export function validarTarifasImpuesto(
  impuestos: Array<{ codigo: string; codigoPorcentaje: string }>,
  tarifas: readonly TarifaConImpuesto[],
): ResultadoMultiple {
  const errores: string[] = [];
  for (const imp of impuestos) {
    const res = validarTarifaImpuesto(imp.codigo, imp.codigoPorcentaje, tarifas);
    if (!res.valido && res.error) errores.push(res.error);
  }
  return { valido: errores.length === 0, errores };
}

export function validarRetencion(
  tipo: string,
  codigo: string,
  retenciones: readonly RetencionCatalogo[],
): ResultadoCatalogo<RetencionCatalogo> {
  const ret = retenciones.find((r) => r.tipo === tipo && r.codigo === codigo);
  if (!ret) {
    return {
      valido: false,
      error: `Código de retención ${codigo} de tipo ${tipo} no encontrado en catálogo`,
    };
  }
  return { valido: true, registro: ret };
}

export function validarFormaPago(
  codigo: string,
  formasPago: readonly FormaPagoCatalogo[],
): ResultadoCatalogo<FormaPagoCatalogo> {
  const fp = formasPago.find((f) => f.codigo === codigo);
  if (!fp) {
    return {
      valido: false,
      error: `Forma de pago ${codigo} no encontrada en catálogo`,
    };
  }
  return { valido: true, registro: fp };
}

export function validarFormasPago(
  pagos: Array<{ formaPago: string }>,
  formasPago: readonly FormaPagoCatalogo[],
): ResultadoMultiple {
  const errores: string[] = [];
  for (const pago of pagos) {
    const res = validarFormaPago(pago.formaPago, formasPago);
    if (!res.valido && res.error) errores.push(res.error);
  }
  return { valido: errores.length === 0, errores };
}

export function validarTipoIdentificacion(
  codigo: string,
  tipos: readonly TipoIdentificacionCatalogo[],
): ResultadoCatalogo<TipoIdentificacionCatalogo> {
  const tipo = tipos.find((t) => t.codigo === codigo);
  if (!tipo) {
    return {
      valido: false,
      error: `Tipo de identificación ${codigo} no encontrado en catálogo`,
    };
  }
  return { valido: true, registro: tipo };
}

export function validarDocumentoSustento(
  codigo: string,
  docs: readonly DocumentoSustentoCatalogo[],
): ResultadoCatalogo<DocumentoSustentoCatalogo> {
  const doc = docs.find((d) => d.codigo === codigo);
  if (!doc) {
    return {
      valido: false,
      error: `Documento sustento ${codigo} no encontrado en catálogo`,
    };
  }
  return { valido: true, registro: doc };
}

export function validarMotivoTraslado(
  codigo: string,
  motivos: readonly MotivoTrasladoCatalogo[],
): ResultadoCatalogo<MotivoTrasladoCatalogo> {
  const motivo = motivos.find((m) => m.codigo === codigo);
  if (!motivo) {
    return {
      valido: false,
      error: `Motivo de traslado ${codigo} no encontrado en catálogo`,
    };
  }
  return { valido: true, registro: motivo };
}

/**
 * Determina el tipo de retención (RENTA/IVA/ISD) a partir del código.
 * Mantiene la heurística del repo base: 7XX = IVA, 45X = ISD, resto = RENTA.
 */
export function inferirTipoRetencion(codigoRetencion: string): 'RENTA' | 'IVA' | 'ISD' {
  if (codigoRetencion.startsWith('7')) return 'IVA';
  if (codigoRetencion.startsWith('45')) return 'ISD';
  return 'RENTA';
}
