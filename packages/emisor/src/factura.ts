/**
 * Construcción del objeto `Factura` de @sri-cli/core a partir del DTO validado.
 *
 * Portado de FacturaService.buildFacturaFromDto del repo de referencia
 * (open-api-facturacion-sri), recortado a lo que el CLI necesita: los totales
 * se recalculan con `calcularTotales` de core (Decimal.js) y se reusa el mismo
 * mapeo de infoAdicional (email/telefono/direccion + campos del DTO).
 */

import {
  Ambiente,
  TipoComprobante,
  TipoEmision,
  calcularTotales,
} from '@sri-cli/core';
import type {
  CampoAdicional,
  CrearFacturaDto,
  DetalleFactura,
  Factura,
  InfoFactura,
  InfoTributaria,
} from '@sri-cli/core';

/**
 * Construye el `Factura` listo para `construirFacturaXml`.
 *
 * @param dto DTO ya validado por `crearFacturaSchema`.
 * @param claveAcceso Clave de acceso de 49 dígitos generada para el comprobante.
 * @param ambiente Ambiente del SRI.
 * @param tipoEmision Tipo de emisión (normal/contingencia).
 * @param secuencial Secuencial ya normalizado a 9 dígitos.
 */
export function construirFacturaDesdeDto(
  dto: CrearFacturaDto,
  claveAcceso: string,
  ambiente: Ambiente,
  tipoEmision: TipoEmision,
  secuencial: string,
): Factura {
  const detalles: DetalleFactura[] = dto.detalles.map((d) => ({
    codigoPrincipal: d.codigoPrincipal,
    codigoAuxiliar: d.codigoAuxiliar,
    descripcion: d.descripcion,
    unidadMedida: d.unidadMedida,
    cantidad: d.cantidad,
    precioUnitario: d.precioUnitario,
    descuento: d.descuento,
    precioTotalSinImpuesto: d.precioTotalSinImpuesto,
    detallesAdicionales: d.detallesAdicionales,
    impuestos: d.impuestos,
  }));

  const { totalSinImpuestos, totalDescuento, totalConImpuestos, importeTotal } =
    calcularTotales(detalles);

  const infoTributaria: InfoTributaria = {
    ambiente,
    tipoEmision,
    razonSocial: dto.emisor.razonSocial,
    nombreComercial: dto.emisor.nombreComercial,
    ruc: dto.emisor.ruc,
    claveAcceso,
    codDoc: TipoComprobante.FACTURA,
    estab: dto.emisor.establecimiento.padStart(3, '0'),
    ptoEmi: dto.emisor.puntoEmision.padStart(3, '0'),
    secuencial: secuencial.padStart(9, '0'),
    dirMatriz: dto.emisor.dirMatriz,
    agenteRetencion: dto.emisor.agenteRetencion,
    contribuyenteRimpe: dto.emisor.contribuyenteRimpe,
  };

  const infoFactura: InfoFactura = {
    fechaEmision: dto.fechaEmision,
    dirEstablecimiento: dto.emisor.dirEstablecimiento,
    contribuyenteEspecial: dto.emisor.contribuyenteEspecial,
    obligadoContabilidad: dto.emisor.obligadoContabilidad,
    tipoIdentificacionComprador: dto.comprador.tipoIdentificacion,
    guiaRemision: dto.guiaRemision,
    razonSocialComprador: dto.comprador.razonSocial,
    identificacionComprador: dto.comprador.identificacion,
    direccionComprador: dto.comprador.direccion,
    totalSinImpuestos,
    totalDescuento,
    totalConImpuestos,
    importeTotal,
    moneda: 'DOLAR',
    pagos: dto.pagos,
  };

  const factura: Factura = { infoTributaria, infoFactura, detalles };

  const infoAdicional = construirInfoAdicional(dto);
  if (infoAdicional.length > 0) {
    factura.infoAdicional = infoAdicional;
  }

  return factura;
}

/** Deriva infoAdicional del comprador (email/telefono/direccion) + campos del DTO. */
function construirInfoAdicional(dto: CrearFacturaDto): CampoAdicional[] {
  const campos: CampoAdicional[] = [];

  if (dto.comprador.email) {
    campos.push({ nombre: 'email', valor: dto.comprador.email });
  }
  if (dto.comprador.telefono) {
    campos.push({ nombre: 'telefono', valor: dto.comprador.telefono });
  }
  if (dto.comprador.direccion) {
    campos.push({ nombre: 'direccion', valor: dto.comprador.direccion });
  }
  if (dto.infoAdicional) {
    campos.push(...dto.infoAdicional);
  }

  return campos;
}
