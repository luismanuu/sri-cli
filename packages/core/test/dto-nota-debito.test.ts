import { describe, expect, it } from 'vitest';
import { crearNotaDebitoSchema } from '../src/dto/nota-debito.js';

const notaDebitoValida = {
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
  comprador: {
    tipoIdentificacion: '05',
    identificacion: '0924383631',
    razonSocial: 'JUAN PEREZ',
  },
  codDocModificado: '01',
  numDocModificado: '001-001-000000001',
  fechaEmisionDocSustento: '01/02/2026',
  motivos: [{ razon: 'Interés por mora', valor: 5 }],
  impuestos: [
    { codigo: '2', codigoPorcentaje: '4', tarifa: 15, baseImponible: 5, valor: 0.75 },
  ],
};

describe('crearNotaDebitoSchema (zod)', () => {
  it('acepta un fixture válido', () => {
    const result = crearNotaDebitoSchema.safeParse(notaDebitoValida);
    expect(result.success).toBe(true);
  });

  it('rechaza nota de débito sin motivos', () => {
    const result = crearNotaDebitoSchema.safeParse({
      ...notaDebitoValida,
      motivos: [],
    });
    expect(result.success).toBe(false);
  });

  it('rechaza motivo con valor negativo', () => {
    const result = crearNotaDebitoSchema.safeParse({
      ...notaDebitoValida,
      motivos: [{ razon: 'Mora', valor: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it('rechaza RUC con longitud distinta de 13 con mensaje en español', () => {
    const result = crearNotaDebitoSchema.safeParse({
      ...notaDebitoValida,
      emisor: { ...notaDebitoValida.emisor, ruc: '12345' },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message).join('\n');
      expect(msgs).toContain('RUC');
    }
  });
});
