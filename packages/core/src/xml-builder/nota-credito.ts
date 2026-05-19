import type {
  DetalleNotaCredito,
  InfoNotaCredito,
  NotaCredito,
} from '../comprobantes/types.js';
import { VERSIONES } from '../types/enums.js';
import {
  construirInfoAdicional,
  construirInfoTributaria,
  crearBuilderXml,
  formatearDecimal,
  sanitizarTextoSri,
} from './shared.js';

export function construirNotaCreditoXml(notaCredito: NotaCredito): string {
  const xmlObj: Record<string, unknown> = {
    notaCredito: {
      $: { id: 'comprobante', version: VERSIONES.NOTA_CREDITO },
      infoTributaria: construirInfoTributaria(notaCredito.infoTributaria),
      infoNotaCredito: construirInfoNotaCredito(notaCredito.infoNotaCredito),
      detalles: {
        detalle: notaCredito.detalles.map((d) => construirDetalleNotaCredito(d)),
      },
    } as Record<string, unknown>,
  };

  const root = xmlObj.notaCredito as Record<string, unknown>;
  const infoAdicional = construirInfoAdicional(notaCredito.infoAdicional);
  if (infoAdicional) {
    root.infoAdicional = infoAdicional;
  }

  return crearBuilderXml().buildObject(xmlObj);
}

function construirInfoNotaCredito(info: InfoNotaCredito): Record<string, unknown> {
  const result: Record<string, unknown> = {
    fechaEmision: info.fechaEmision,
  };

  if (info.dirEstablecimiento) result.dirEstablecimiento = sanitizarTextoSri(info.dirEstablecimiento);

  result.tipoIdentificacionComprador = info.tipoIdentificacionComprador;
  result.razonSocialComprador = sanitizarTextoSri(info.razonSocialComprador);
  result.identificacionComprador = info.identificacionComprador;

  if (info.contribuyenteEspecial) result.contribuyenteEspecial = info.contribuyenteEspecial;
  result.obligadoContabilidad = info.obligadoContabilidad;
  if (info.rise) result.rise = info.rise;

  result.codDocModificado = info.codDocModificado;
  result.numDocModificado = info.numDocModificado;
  result.fechaEmisionDocSustento = info.fechaEmisionDocSustento;
  result.totalSinImpuestos = formatearDecimal(info.totalSinImpuestos, 2);
  result.valorModificacion = formatearDecimal(info.valorModificacion, 2);

  if (info.moneda) result.moneda = info.moneda;

  result.totalConImpuestos = {
    totalImpuesto: info.totalConImpuestos.map((imp) => ({
      codigo: imp.codigo,
      codigoPorcentaje: imp.codigoPorcentaje,
      baseImponible: formatearDecimal(imp.baseImponible, 2),
      valor: formatearDecimal(imp.valor, 2),
    })),
  };

  result.motivo = sanitizarTextoSri(info.motivo);
  return result;
}

function construirDetalleNotaCredito(detalle: DetalleNotaCredito): Record<string, unknown> {
  const result: Record<string, unknown> = {
    codigoInterno: sanitizarTextoSri(detalle.codigoInterno),
  };

  if (detalle.codigoAdicional) result.codigoAdicional = sanitizarTextoSri(detalle.codigoAdicional);

  result.descripcion = sanitizarTextoSri(detalle.descripcion);
  result.cantidad = formatearDecimal(detalle.cantidad, 6);
  result.precioUnitario = formatearDecimal(detalle.precioUnitario, 6);
  result.descuento = formatearDecimal(detalle.descuento, 2);
  result.precioTotalSinImpuesto = formatearDecimal(detalle.precioTotalSinImpuesto, 2);

  if (detalle.detallesAdicionales && detalle.detallesAdicionales.length > 0) {
    result.detallesAdicionales = {
      detAdicional: detalle.detallesAdicionales.map((d) => ({
        $: { nombre: sanitizarTextoSri(d.nombre), valor: sanitizarTextoSri(d.valor) },
      })),
    };
  }

  result.impuestos = {
    impuesto: detalle.impuestos.map((imp) => ({
      codigo: imp.codigo,
      codigoPorcentaje: imp.codigoPorcentaje,
      tarifa: formatearDecimal(imp.tarifa, 2),
      baseImponible: formatearDecimal(imp.baseImponible, 2),
      valor: formatearDecimal(imp.valor, 2),
    })),
  };

  return result;
}
