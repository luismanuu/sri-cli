import { ValidacionDtoError } from '../errors/index.js';
import type { InfoRetencion, Retencion } from '../comprobantes/types.js';
import { VERSIONES } from '../types/enums.js';
import {
  construirInfoAdicional,
  construirInfoTributaria,
  crearBuilderXml,
  formatearDecimal,
} from './shared.js';

/**
 * Construye el XML del Comprobante de Retención v2.0.0.
 *
 * Las retenciones se agrupan por documento sustento (codDocSustento+numDocSustento)
 * para alinearse con el esquema del SRI, que espera `docsSustento -> docSustento[] -> retenciones`.
 */
export function construirRetencionXml(retencion: Retencion): string {
  const docsMap = new Map<
    string,
    {
      codSustento: string;
      codDocSustento: string;
      numDocSustento: string;
      fechaEmisionDocSustento: string;
      pagoLocExt: string;
      totalSinImpuestos: number;
      importeTotal: number;
      formaPago: string;
      impuestosDocSustento: Retencion['impuestos'][number]['impuestosDocSustento'];
      retenciones: Array<{
        codigo: string;
        codigoRetencion: string;
        baseImponible: string;
        porcentajeRetener: string;
        valorRetenido: string;
      }>;
    }
  >();

  for (const imp of retencion.impuestos) {
    const key = `${imp.codDocSustento}-${imp.numDocSustento}`;
    if (!docsMap.has(key)) {
      docsMap.set(key, {
        codSustento: imp.codSustento ?? imp.codDocSustento,
        codDocSustento: imp.codDocSustento,
        numDocSustento: imp.numDocSustento,
        fechaEmisionDocSustento: imp.fechaEmisionDocSustento,
        pagoLocExt: imp.pagoLocExt ?? '01',
        totalSinImpuestos: imp.totalSinImpuestos,
        importeTotal: imp.importeTotal,
        formaPago: imp.formaPago ?? '01',
        impuestosDocSustento: imp.impuestosDocSustento,
        retenciones: [],
      });
    }

    const doc = docsMap.get(key)!;
    doc.retenciones.push({
      codigo: imp.codigo,
      codigoRetencion: imp.codigoRetencion,
      baseImponible: formatearDecimal(imp.baseImponible, 2),
      porcentajeRetener: formatearDecimal(imp.porcentajeRetener, 2),
      valorRetenido: formatearDecimal(imp.valorRetenido, 2),
    });
  }

  const docsSustento = Array.from(docsMap.values()).map((doc) => ({
    codSustento: doc.codSustento,
    codDocSustento: doc.codDocSustento,
    numDocSustento: doc.numDocSustento.replace(/-/g, ''),
    fechaEmisionDocSustento: doc.fechaEmisionDocSustento,
    pagoLocExt: doc.pagoLocExt,
    totalSinImpuestos: formatearDecimal(doc.totalSinImpuestos, 2),
    importeTotal: formatearDecimal(doc.importeTotal, 2),
    impuestosDocSustento: {
      impuestoDocSustento: doc.impuestosDocSustento.map((impDoc) => ({
        codImpuestoDocSustento: impDoc.codImpuestoDocSustento,
        codigoPorcentaje: impDoc.codigoPorcentaje,
        baseImponible: formatearDecimal(impDoc.baseImponible, 2),
        tarifa: formatearDecimal(impDoc.tarifa, 2),
        valorImpuesto: formatearDecimal(impDoc.valorImpuesto, 2),
      })),
    },
    retenciones: { retencion: doc.retenciones },
    pagos: {
      pago: {
        formaPago: doc.formaPago,
        total: formatearDecimal(doc.importeTotal, 2),
      },
    },
  }));

  const xmlObj: Record<string, unknown> = {
    comprobanteRetencion: {
      $: { id: 'comprobante', version: VERSIONES.COMPROBANTE_RETENCION },
      infoTributaria: construirInfoTributaria(retencion.infoTributaria),
      infoCompRetencion: construirInfoRetencion(retencion.infoCompRetencion),
      docsSustento: { docSustento: docsSustento },
    } as Record<string, unknown>,
  };

  const root = xmlObj.comprobanteRetencion as Record<string, unknown>;
  const infoAdicional = construirInfoAdicional(retencion.infoAdicional);
  if (infoAdicional) {
    root.infoAdicional = infoAdicional;
  }

  return crearBuilderXml().buildObject(xmlObj);
}

function construirInfoRetencion(info: InfoRetencion): Record<string, unknown> {
  const result: Record<string, unknown> = {
    fechaEmision: info.fechaEmision,
  };

  if (info.dirEstablecimiento) result.dirEstablecimiento = info.dirEstablecimiento;
  if (info.contribuyenteEspecial) result.contribuyenteEspecial = info.contribuyenteEspecial;

  result.obligadoContabilidad = info.obligadoContabilidad;
  result.tipoIdentificacionSujetoRetenido = info.tipoIdentificacionSujetoRetenido;

  // Regla SRI: tipoSujetoRetenido SOLO se incluye cuando el sujeto tiene
  // identificación del exterior ('08'). Para evitar XML inválidos lanzamos
  // un error temprano si falta el campo requerido.
  if (String(info.tipoIdentificacionSujetoRetenido) === '08') {
    if (!info.tipoSujetoRetenido) {
      throw new ValidacionDtoError(
        'tipoSujetoRetenido es requerido para sujetos con identificación del exterior (08). Use "01" para Persona Natural o "02" para Sociedad.',
      );
    }
    result.tipoSujetoRetenido = info.tipoSujetoRetenido;
  }

  result.parteRel = info.parteRel ?? 'NO';
  result.razonSocialSujetoRetenido = info.razonSocialSujetoRetenido;
  result.identificacionSujetoRetenido = info.identificacionSujetoRetenido;
  result.periodoFiscal = info.periodoFiscal;

  return result;
}
