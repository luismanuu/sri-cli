import type {
  DestinatarioGuiaRemision,
  DetalleGuiaRemision,
  GuiaRemision,
  InfoGuiaRemision,
} from '../comprobantes/types.js';
import { VERSIONES } from '../types/enums.js';
import {
  construirInfoAdicional,
  construirInfoTributaria,
  crearBuilderXml,
  formatearDecimal,
} from './shared.js';

export function construirGuiaRemisionXml(guia: GuiaRemision): string {
  const xmlObj: Record<string, unknown> = {
    guiaRemision: {
      $: { id: 'comprobante', version: VERSIONES.GUIA_REMISION },
      infoTributaria: construirInfoTributaria(guia.infoTributaria),
      infoGuiaRemision: construirInfoGuiaRemision(guia.infoGuiaRemision),
      destinatarios: {
        destinatario: guia.destinatarios.map((d) => construirDestinatario(d)),
      },
    } as Record<string, unknown>,
  };

  const root = xmlObj.guiaRemision as Record<string, unknown>;
  const infoAdicional = construirInfoAdicional(guia.infoAdicional);
  if (infoAdicional) {
    root.infoAdicional = infoAdicional;
  }

  return crearBuilderXml().buildObject(xmlObj);
}

function construirInfoGuiaRemision(info: InfoGuiaRemision): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (info.dirEstablecimiento) result.dirEstablecimiento = info.dirEstablecimiento;

  result.dirPartida = info.dirPartida;
  result.razonSocialTransportista = info.razonSocialTransportista;
  result.tipoIdentificacionTransportista = info.tipoIdentificacionTransportista;
  result.rucTransportista = info.rucTransportista;

  if (info.rise) result.rise = info.rise;

  result.obligadoContabilidad = info.obligadoContabilidad;
  if (info.contribuyenteEspecial) result.contribuyenteEspecial = info.contribuyenteEspecial;

  result.fechaIniTransporte = info.fechaIniTransporte;
  result.fechaFinTransporte = info.fechaFinTransporte;
  result.placa = info.placa;

  return result;
}

function construirDestinatario(dest: DestinatarioGuiaRemision): Record<string, unknown> {
  const result: Record<string, unknown> = {
    tipoIdentificacionDestinatario: dest.tipoIdentificacionDestinatario,
    identificacionDestinatario: dest.identificacionDestinatario,
    razonSocialDestinatario: dest.razonSocialDestinatario,
    dirDestinatario: dest.dirDestinatario,
    motivoTraslado: dest.motivoTraslado,
  };

  if (dest.docAduaneroUnico) result.docAduaneroUnico = dest.docAduaneroUnico;
  if (dest.codEstabDestino) result.codEstabDestino = dest.codEstabDestino;
  if (dest.ruta) result.ruta = dest.ruta;
  if (dest.codDocSustento) result.codDocSustento = dest.codDocSustento;
  if (dest.numDocSustento) result.numDocSustento = dest.numDocSustento;
  if (dest.numAutDocSustento) result.numAutDocSustento = dest.numAutDocSustento;
  if (dest.fechaEmisionDocSustento) result.fechaEmisionDocSustento = dest.fechaEmisionDocSustento;

  result.detalles = {
    detalle: dest.detalles.map((det) => construirDetalleGuiaRemision(det)),
  };

  return result;
}

function construirDetalleGuiaRemision(detalle: DetalleGuiaRemision): Record<string, unknown> {
  const result: Record<string, unknown> = {
    codigoInterno: detalle.codigoInterno,
  };

  if (detalle.codigoAdicional) result.codigoAdicional = detalle.codigoAdicional;

  result.descripcion = detalle.descripcion;
  result.cantidad = formatearDecimal(detalle.cantidad, 6);

  if (detalle.detallesAdicionales && detalle.detallesAdicionales.length > 0) {
    result.detallesAdicionales = {
      detAdicional: detalle.detallesAdicionales.map((d) => ({
        $: { nombre: d.nombre, valor: d.valor },
      })),
    };
  }

  return result;
}
