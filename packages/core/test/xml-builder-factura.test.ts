import { describe, expect, it } from 'vitest';
import { construirFacturaXml } from '../src/xml-builder/factura.js';
import type { Factura } from '../src/comprobantes/types.js';
import { Ambiente, TipoComprobante, TipoEmision, TipoIdentificacion } from '../src/types/enums.js';

const facturaFixture: Factura = {
  infoTributaria: {
    ambiente: Ambiente.PRUEBAS,
    tipoEmision: TipoEmision.NORMAL,
    razonSocial: 'EMPRESA EJEMPLO S.A.',
    nombreComercial: 'EJEMPLO',
    ruc: '1790016919001',
    claveAcceso: '0702202601179001691900110010010000000010000000019',
    codDoc: TipoComprobante.FACTURA,
    estab: '001',
    ptoEmi: '001',
    secuencial: '000000001',
    dirMatriz: 'Av. Amazonas N12-345',
  },
  infoFactura: {
    fechaEmision: '07/02/2026',
    dirEstablecimiento: 'Av. Amazonas N12-345',
    obligadoContabilidad: 'SI',
    tipoIdentificacionComprador: TipoIdentificacion.CEDULA,
    razonSocialComprador: 'JUAN PEREZ',
    identificacionComprador: '0924383631',
    direccionComprador: 'Guayaquil',
    totalSinImpuestos: 100,
    totalDescuento: 0,
    totalConImpuestos: [
      {
        codigo: '2',
        codigoPorcentaje: '4',
        baseImponible: 100,
        tarifa: 15,
        valor: 15,
      },
    ],
    importeTotal: 115,
    moneda: 'DOLAR',
    pagos: [{ formaPago: '01', total: 115 }],
  },
  detalles: [
    {
      codigoPrincipal: 'PROD-001',
      descripcion: 'Producto de ejemplo',
      cantidad: 1,
      precioUnitario: 100,
      descuento: 0,
      precioTotalSinImpuesto: 100,
      impuestos: [
        {
          codigo: '2',
          codigoPorcentaje: '4',
          tarifa: 15,
          baseImponible: 100,
          valor: 15,
        },
      ],
    },
  ],
  infoAdicional: [{ nombre: 'email', valor: 'comprador@ejemplo.com' }],
};

describe('construirFacturaXml', () => {
  it('genera XML estable de una factura mínima (snapshot)', () => {
    const xml = construirFacturaXml(facturaFixture);
    expect(xml).toMatchSnapshot();
  });

  it('declara la cabecera UTF-8 y el atributo version=1.1.0', () => {
    const xml = construirFacturaXml(facturaFixture);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<factura id="comprobante" version="1.1.0">');
  });

  it('formatea cantidad con 6 decimales y precioTotalSinImpuesto con 2', () => {
    const xml = construirFacturaXml(facturaFixture);
    expect(xml).toContain('<cantidad>1.000000</cantidad>');
    expect(xml).toContain('<precioTotalSinImpuesto>100.00</precioTotalSinImpuesto>');
  });

  it('omite nombreComercial cuando no se provee', () => {
    const sinNombre: Factura = {
      ...facturaFixture,
      infoTributaria: { ...facturaFixture.infoTributaria, nombreComercial: undefined },
    };
    const xml = construirFacturaXml(sinNombre);
    expect(xml).not.toContain('<nombreComercial>');
  });

  it('sanitiza caracteres de control en campos texto user-supplied (S2)', () => {
    // razonSocial con NEL (U+0085), separator (U+2028) y BEL (\x07)
    const sucio: Factura = {
      ...facturaFixture,
      infoTributaria: {
        ...facturaFixture.infoTributaria,
        razonSocial: 'JUAN\x07 PEREZ SA\u2028',
        dirMatriz: 'Av.\u2029 Amazonas\x01',
      },
      infoFactura: {
        ...facturaFixture.infoFactura,
        razonSocialComprador: 'COMPRADOR X',
        direccionComprador: 'GYE\x02',
      },
      detalles: [
        {
          ...facturaFixture.detalles[0]!,
          descripcion: 'Producto\u2028 con basura\x1F',
        },
      ],
      infoAdicional: [{ nombre: 'note\x08', valor: 'value' }],
    };
    const xml = construirFacturaXml(sucio);
    // Ningún char de control prohibido debe quedar en el XML emitido
    expect(xml).not.toMatch(/[\x00-\x08\x0B-\x1F\x7F-\x9F\u2028\u2029]/);
    // Y los textos legibles quedan intactos
    expect(xml).toContain('JUAN PEREZ SA');
    expect(xml).toContain('Av. Amazonas');
    expect(xml).toContain('COMPRADOR X');
    expect(xml).toContain('Producto con basura');
  });

  it('emite <retenciones> cuando hay retenciones declaradas', () => {
    const conRetencion: Factura = {
      ...facturaFixture,
      retenciones: [
        { codigo: '4', codigoPorcentaje: '327', tarifa: 1, valor: 1.15 },
      ],
    };
    const xml = construirFacturaXml(conRetencion);
    expect(xml).toContain('<retenciones>');
    expect(xml).toContain('<tarifa>1.00</tarifa>');
    expect(xml).toContain('<valor>1.15</valor>');
  });
});
