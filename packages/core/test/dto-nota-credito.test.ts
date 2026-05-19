import { describe, expect, it } from 'vitest';
import { crearNotaCreditoSchema } from '../src/dto/nota-credito.js';

const notaCreditoValida = {
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
  motivo: 'Devolución parcial',
  detalles: [
    {
      codigoInterno: 'PROD-001',
      descripcion: 'Producto a devolver',
      cantidad: 1,
      precioUnitario: 100,
      descuento: 0,
      impuestos: [
        { codigo: '2', codigoPorcentaje: '4', tarifa: 15, baseImponible: 100, valor: 15 },
      ],
    },
  ],
};

describe('crearNotaCreditoSchema (zod)', () => {
  it('acepta un fixture válido', () => {
    const result = crearNotaCreditoSchema.safeParse(notaCreditoValida);
    expect(result.success).toBe(true);
  });

  it('rechaza fecha con formato distinto a dd/mm/yyyy con mensaje en español', () => {
    const result = crearNotaCreditoSchema.safeParse({
      ...notaCreditoValida,
      fechaEmision: '2026-02-07',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message).join('\n');
      expect(msgs).toContain('dd/mm/yyyy');
    }
  });

  it('rechaza nota de crédito sin motivo con mensaje en español', () => {
    const result = crearNotaCreditoSchema.safeParse({
      ...notaCreditoValida,
      motivo: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message).join('\n');
      expect(msgs).toContain('motivo de la nota de crédito');
    }
  });

  it('rechaza nota de crédito sin detalles', () => {
    const result = crearNotaCreditoSchema.safeParse({
      ...notaCreditoValida,
      detalles: [],
    });
    expect(result.success).toBe(false);
  });
});
