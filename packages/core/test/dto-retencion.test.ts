import { describe, expect, it } from 'vitest';
import { crearRetencionSchema } from '../src/dto/retencion.js';

const retencionValida = {
  ambiente: '1',
  tipoEmision: '1',
  fechaEmision: '07/02/2026',
  secuencial: '000000001',
  emisor: {
    ruc: '1790016919001',
    razonSocial: 'EMPRESA EJEMPLO S.A.',
    dirMatriz: 'Av. Amazonas N12-345',
    establecimiento: '001',
    puntoEmision: '001',
    obligadoContabilidad: 'SI',
  },
  sujetoRetenido: {
    tipoIdentificacion: '05',
    razonSocial: 'JUAN PEREZ',
    identificacion: '0924383631',
  },
  periodoFiscal: '02/2026',
  impuestos: [
    {
      codigo: '4',
      codigoRetencion: '312',
      baseImponible: 100,
      porcentajeRetener: 1,
      valorRetenido: 1,
      codDocSustento: '01',
      numDocSustento: '001-001-000000001',
      fechaEmisionDocSustento: '01/02/2026',
      totalSinImpuestos: 100,
      importeTotal: 115,
      impuestosDocSustento: [
        {
          codImpuestoDocSustento: '2',
          codigoPorcentaje: '4',
          baseImponible: 100,
          tarifa: 15,
          valorImpuesto: 15,
        },
      ],
    },
  ],
};

describe('crearRetencionSchema (zod)', () => {
  it('acepta un fixture válido', () => {
    const result = crearRetencionSchema.safeParse(retencionValida);
    expect(result.success).toBe(true);
  });

  it('rechaza periodoFiscal con formato distinto a mm/yyyy con mensaje en español', () => {
    const result = crearRetencionSchema.safeParse({
      ...retencionValida,
      periodoFiscal: '2026-02',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message).join('\n');
      expect(msgs).toContain('mm/yyyy');
    }
  });

  it('rechaza retención sin impuestos retenidos', () => {
    const result = crearRetencionSchema.safeParse({
      ...retencionValida,
      impuestos: [],
    });
    expect(result.success).toBe(false);
  });

  it('rechaza pagoLocExt fuera de 01/02', () => {
    const result = crearRetencionSchema.safeParse({
      ...retencionValida,
      impuestos: [{ ...retencionValida.impuestos[0], pagoLocExt: '99' }],
    });
    expect(result.success).toBe(false);
  });
});
