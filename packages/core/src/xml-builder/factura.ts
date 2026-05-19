import type {
  DetalleFactura,
  Factura,
  InfoFactura,
} from '../comprobantes/types.js';
import { VERSIONES } from '../types/enums.js';
import {
  construirInfoAdicional,
  construirInfoTributaria,
  crearBuilderXml,
  formatearDecimal,
  sanitizarTextoSri,
} from './shared.js';

/**
 * Construye el XML de una factura electrónica v1.1.0 del SRI.
 */
export function construirFacturaXml(factura: Factura): string {
  const xmlObj: Record<string, unknown> = {
    factura: {
      $: { id: 'comprobante', version: VERSIONES.FACTURA },
      infoTributaria: construirInfoTributaria(factura.infoTributaria),
      infoFactura: construirInfoFactura(factura.infoFactura),
      detalles: {
        detalle: factura.detalles.map((d) => construirDetalleFactura(d)),
      },
    } as Record<string, unknown>,
  };

  const root = xmlObj.factura as Record<string, unknown>;

  if (factura.retenciones && factura.retenciones.length > 0) {
    root.retenciones = {
      retencion: factura.retenciones.map((r) => ({
        codigo: r.codigo,
        codigoPorcentaje: r.codigoPorcentaje,
        tarifa: formatearDecimal(r.tarifa, 2),
        valor: formatearDecimal(r.valor, 2),
      })),
    };
  }

  const infoAdicional = construirInfoAdicional(factura.infoAdicional);
  if (infoAdicional) {
    root.infoAdicional = infoAdicional;
  }

  return crearBuilderXml().buildObject(xmlObj);
}

function construirInfoFactura(info: InfoFactura): Record<string, unknown> {
  const result: Record<string, unknown> = {
    fechaEmision: info.fechaEmision,
  };

  if (info.dirEstablecimiento) result.dirEstablecimiento = sanitizarTextoSri(info.dirEstablecimiento);
  if (info.contribuyenteEspecial) result.contribuyenteEspecial = info.contribuyenteEspecial;

  result.obligadoContabilidad = info.obligadoContabilidad;
  result.tipoIdentificacionComprador = info.tipoIdentificacionComprador;

  if (info.guiaRemision) result.guiaRemision = info.guiaRemision;

  result.razonSocialComprador = sanitizarTextoSri(info.razonSocialComprador);
  result.identificacionComprador = info.identificacionComprador;

  if (info.direccionComprador) result.direccionComprador = sanitizarTextoSri(info.direccionComprador);

  result.totalSinImpuestos = formatearDecimal(info.totalSinImpuestos, 2);
  result.totalDescuento = formatearDecimal(info.totalDescuento, 2);

  result.totalConImpuestos = {
    totalImpuesto: info.totalConImpuestos.map((imp) => {
      const out: Record<string, unknown> = {
        codigo: imp.codigo,
        codigoPorcentaje: imp.codigoPorcentaje,
        baseImponible: formatearDecimal(imp.baseImponible, 2),
      };
      if (imp.tarifa !== undefined) {
        out.tarifa = formatearDecimal(imp.tarifa, 2);
      }
      out.valor = formatearDecimal(imp.valor, 2);
      return out;
    }),
  };

  if (info.propina !== undefined) {
    result.propina = formatearDecimal(info.propina, 2);
  }

  result.importeTotal = formatearDecimal(info.importeTotal, 2);

  if (info.moneda) result.moneda = info.moneda;

  result.pagos = {
    pago: info.pagos.map((p) => {
      const pago: Record<string, unknown> = {
        formaPago: p.formaPago,
        total: formatearDecimal(p.total, 2),
      };
      if (p.plazo !== undefined) {
        pago.plazo = p.plazo;
        pago.unidadTiempo = p.unidadTiempo ?? 'dias';
      }
      return pago;
    }),
  };

  return result;
}

function construirDetalleFactura(detalle: DetalleFactura): Record<string, unknown> {
  const result: Record<string, unknown> = {
    codigoPrincipal: sanitizarTextoSri(detalle.codigoPrincipal),
  };

  if (detalle.codigoAuxiliar) result.codigoAuxiliar = sanitizarTextoSri(detalle.codigoAuxiliar);
  result.descripcion = sanitizarTextoSri(detalle.descripcion);
  if (detalle.unidadMedida) result.unidadMedida = sanitizarTextoSri(detalle.unidadMedida);

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
