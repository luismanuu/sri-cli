import type {
  InfoNotaDebito,
  MotivoNotaDebito,
  NotaDebito,
} from '../comprobantes/types.js';
import { VERSIONES } from '../types/enums.js';
import {
  construirInfoAdicional,
  construirInfoTributaria,
  crearBuilderXml,
  formatearDecimal,
  sanitizarTextoSri,
} from './shared.js';

export function construirNotaDebitoXml(notaDebito: NotaDebito): string {
  const xmlObj: Record<string, unknown> = {
    notaDebito: {
      $: { id: 'comprobante', version: VERSIONES.NOTA_DEBITO },
      infoTributaria: construirInfoTributaria(notaDebito.infoTributaria),
      infoNotaDebito: construirInfoNotaDebito(notaDebito.infoNotaDebito),
      motivos: {
        motivo: notaDebito.motivos.map((m) => construirMotivoNotaDebito(m)),
      },
    } as Record<string, unknown>,
  };

  const root = xmlObj.notaDebito as Record<string, unknown>;
  const infoAdicional = construirInfoAdicional(notaDebito.infoAdicional);
  if (infoAdicional) {
    root.infoAdicional = infoAdicional;
  }

  return crearBuilderXml().buildObject(xmlObj);
}

function construirInfoNotaDebito(info: InfoNotaDebito): Record<string, unknown> {
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

  result.impuestos = {
    impuesto: info.impuestos.map((imp) => {
      const out: Record<string, unknown> = {
        codigo: imp.codigo,
        codigoPorcentaje: imp.codigoPorcentaje,
      };
      if (imp.tarifa !== undefined) {
        out.tarifa = formatearDecimal(imp.tarifa, 2);
      }
      out.baseImponible = formatearDecimal(imp.baseImponible, 2);
      out.valor = formatearDecimal(imp.valor, 2);
      return out;
    }),
  };

  result.valorTotal = formatearDecimal(info.valorTotal, 2);
  return result;
}

function construirMotivoNotaDebito(motivo: MotivoNotaDebito): Record<string, unknown> {
  return {
    razon: sanitizarTextoSri(motivo.razon),
    valor: formatearDecimal(motivo.valor, 2),
  };
}
