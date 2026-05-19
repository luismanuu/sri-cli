import { describe, expect, it } from 'vitest';
import { construirGuiaRemisionXml } from '../src/xml-builder/guia-remision.js';
import { construirNotaCreditoXml } from '../src/xml-builder/nota-credito.js';
import { construirNotaDebitoXml } from '../src/xml-builder/nota-debito.js';
import { construirRetencionXml } from '../src/xml-builder/retencion.js';
import { ValidacionDtoError } from '../src/errors/index.js';
import type {
  GuiaRemision,
  NotaCredito,
  NotaDebito,
  Retencion,
} from '../src/comprobantes/types.js';
import { Ambiente, TipoComprobante, TipoEmision, TipoIdentificacion } from '../src/types/enums.js';

const infoTributariaBase = {
  ambiente: Ambiente.PRUEBAS,
  tipoEmision: TipoEmision.NORMAL,
  razonSocial: 'EMPRESA EJEMPLO S.A.',
  ruc: '1790016919001',
  claveAcceso: '0702202604179001691900110010010000000010000000016',
  codDoc: TipoComprobante.NOTA_CREDITO,
  estab: '001',
  ptoEmi: '001',
  secuencial: '000000001',
  dirMatriz: 'Av. Amazonas N12-345',
};

describe('construirNotaCreditoXml', () => {
  const notaCredito: NotaCredito = {
    infoTributaria: { ...infoTributariaBase, codDoc: TipoComprobante.NOTA_CREDITO },
    infoNotaCredito: {
      fechaEmision: '10/02/2026',
      tipoIdentificacionComprador: TipoIdentificacion.CEDULA,
      razonSocialComprador: 'JUAN PEREZ',
      identificacionComprador: '0924383631',
      obligadoContabilidad: 'SI',
      codDocModificado: '01',
      numDocModificado: '001-001-000000001',
      fechaEmisionDocSustento: '07/02/2026',
      totalSinImpuestos: 50,
      valorModificacion: 57.5,
      totalConImpuestos: [{ codigo: '2', codigoPorcentaje: '4', baseImponible: 50, valor: 7.5 }],
      motivo: 'Devolución parcial',
    },
    detalles: [
      {
        codigoInterno: 'PROD-001',
        descripcion: 'Producto',
        cantidad: 1,
        precioUnitario: 50,
        descuento: 0,
        precioTotalSinImpuesto: 50,
        impuestos: [{ codigo: '2', codigoPorcentaje: '4', tarifa: 15, baseImponible: 50, valor: 7.5 }],
      },
    ],
    infoAdicional: [{ nombre: 'email', valor: 'x@y.com' }],
  };

  it('genera XML con cabecera version 1.1.0 y el motivo declarado', () => {
    const xml = construirNotaCreditoXml(notaCredito);
    expect(xml).toContain('<notaCredito id="comprobante" version="1.1.0">');
    expect(xml).toContain('<motivo>Devolución parcial</motivo>');
    expect(xml).toContain('<infoAdicional>');
  });
});

describe('construirNotaDebitoXml', () => {
  const notaDebito: NotaDebito = {
    infoTributaria: { ...infoTributariaBase, codDoc: TipoComprobante.NOTA_DEBITO },
    infoNotaDebito: {
      fechaEmision: '10/02/2026',
      tipoIdentificacionComprador: TipoIdentificacion.CEDULA,
      razonSocialComprador: 'JUAN PEREZ',
      identificacionComprador: '0924383631',
      obligadoContabilidad: 'SI',
      codDocModificado: '01',
      numDocModificado: '001-001-000000001',
      fechaEmisionDocSustento: '07/02/2026',
      totalSinImpuestos: 20,
      impuestos: [{ codigo: '2', codigoPorcentaje: '4', baseImponible: 20, tarifa: 15, valor: 3 }],
      valorTotal: 23,
    },
    motivos: [{ razon: 'Interés por mora', valor: 23 }],
  };

  it('emite XML con motivos y valorTotal a 2 decimales', () => {
    const xml = construirNotaDebitoXml(notaDebito);
    expect(xml).toContain('<notaDebito id="comprobante" version="1.0.0">');
    expect(xml).toContain('<razon>Interés por mora</razon>');
    expect(xml).toContain('<valorTotal>23.00</valorTotal>');
  });
});

describe('construirRetencionXml', () => {
  const retencion: Retencion = {
    infoTributaria: { ...infoTributariaBase, codDoc: TipoComprobante.COMPROBANTE_RETENCION },
    infoCompRetencion: {
      fechaEmision: '10/02/2026',
      obligadoContabilidad: 'SI',
      tipoIdentificacionSujetoRetenido: TipoIdentificacion.CEDULA,
      razonSocialSujetoRetenido: 'JUAN PEREZ',
      identificacionSujetoRetenido: '0924383631',
      periodoFiscal: '02/2026',
    },
    impuestos: [
      {
        codigo: '1',
        codigoRetencion: '303',
        baseImponible: 100,
        porcentajeRetener: 10,
        valorRetenido: 10,
        codDocSustento: '01',
        numDocSustento: '001-001-000000001',
        fechaEmisionDocSustento: '07/02/2026',
        totalSinImpuestos: 100,
        importeTotal: 115,
        impuestosDocSustento: [
          { codImpuestoDocSustento: '2', codigoPorcentaje: '4', baseImponible: 100, tarifa: 15, valor: 15 } as never,
        ].map((i) => ({
          codImpuestoDocSustento: i.codImpuestoDocSustento,
          codigoPorcentaje: i.codigoPorcentaje,
          baseImponible: i.baseImponible,
          tarifa: i.tarifa,
          valorImpuesto: 15,
        })),
      },
    ],
  };

  it('agrupa retenciones por documento sustento y emite version 2.0.0', () => {
    const xml = construirRetencionXml(retencion);
    expect(xml).toContain('<comprobanteRetencion id="comprobante" version="2.0.0">');
    expect(xml).toContain('<docsSustento>');
    expect(xml).toContain('<numDocSustento>001001000000001</numDocSustento>');
    expect(xml).toContain('<valorRetenido>10.00</valorRetenido>');
  });

  it('lanza ValidacionDtoError si identificacion=08 sin tipoSujetoRetenido', () => {
    const retencionMala: Retencion = {
      ...retencion,
      infoCompRetencion: {
        ...retencion.infoCompRetencion,
        tipoIdentificacionSujetoRetenido: '08',
      },
    };
    expect(() => construirRetencionXml(retencionMala)).toThrow(ValidacionDtoError);
  });

  it('acepta identificacion=08 cuando tipoSujetoRetenido está provisto', () => {
    const retencionOk: Retencion = {
      ...retencion,
      infoCompRetencion: {
        ...retencion.infoCompRetencion,
        tipoIdentificacionSujetoRetenido: '08',
        tipoSujetoRetenido: '01',
      },
    };
    const xml = construirRetencionXml(retencionOk);
    expect(xml).toContain('<tipoSujetoRetenido>01</tipoSujetoRetenido>');
  });
});

describe('construirGuiaRemisionXml', () => {
  const guia: GuiaRemision = {
    infoTributaria: { ...infoTributariaBase, codDoc: TipoComprobante.GUIA_REMISION },
    infoGuiaRemision: {
      dirPartida: 'Av. Amazonas N12-345',
      razonSocialTransportista: 'TRANSPORTES X',
      tipoIdentificacionTransportista: TipoIdentificacion.RUC,
      rucTransportista: '1790016919001',
      obligadoContabilidad: 'SI',
      fechaIniTransporte: '07/02/2026',
      fechaFinTransporte: '08/02/2026',
      placa: 'ABC-1234',
    },
    destinatarios: [
      {
        tipoIdentificacionDestinatario: '05',
        identificacionDestinatario: '0924383631',
        razonSocialDestinatario: 'JUAN PEREZ',
        dirDestinatario: 'Guayaquil',
        motivoTraslado: 'VENTA',
        detalles: [
          {
            codigoInterno: 'PROD-001',
            descripcion: 'Producto',
            cantidad: 5,
          },
        ],
      },
    ],
  };

  it('emite XML con destinatarios, motivoTraslado y cantidad con 6 decimales', () => {
    const xml = construirGuiaRemisionXml(guia);
    expect(xml).toContain('<guiaRemision id="comprobante" version="1.1.0">');
    expect(xml).toContain('<motivoTraslado>VENTA</motivoTraslado>');
    expect(xml).toContain('<cantidad>5.000000</cantidad>');
  });
});
