import { describe, expect, it } from 'vitest';
import { crearFacturaSchema } from '../src/dto/factura.js';

const facturaValida = {
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
  detalles: [
    {
      codigoPrincipal: 'PROD-001',
      descripcion: 'Producto de ejemplo',
      cantidad: 1,
      precioUnitario: 100,
      descuento: 0,
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
  pagos: [{ formaPago: '01', total: 115 }],
};

describe('crearFacturaSchema (zod)', () => {
  it('acepta un fixture válido', () => {
    const result = crearFacturaSchema.safeParse(facturaValida);
    expect(result.success).toBe(true);
  });

  it('rechaza fecha con formato distinto a dd/mm/yyyy', () => {
    const result = crearFacturaSchema.safeParse({
      ...facturaValida,
      fechaEmision: '2026-02-07',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs.join('\n')).toContain('dd/mm/yyyy');
    }
  });

  it('rechaza RUC con longitud distinta de 13', () => {
    const result = crearFacturaSchema.safeParse({
      ...facturaValida,
      emisor: { ...facturaValida.emisor, ruc: '123' },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message).join('\n');
      expect(msgs).toContain('RUC');
    }
  });

  it('rechaza factura sin detalles', () => {
    const result = crearFacturaSchema.safeParse({
      ...facturaValida,
      detalles: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message).join('\n');
      expect(msgs).toContain('al menos un detalle');
    }
  });

  it('rechaza factura sin formas de pago', () => {
    const result = crearFacturaSchema.safeParse({
      ...facturaValida,
      pagos: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message).join('\n');
      expect(msgs).toContain('al menos una forma de pago');
    }
  });

  it('rechaza forma de pago no listada en el enum FormaPago', () => {
    const result = crearFacturaSchema.safeParse({
      ...facturaValida,
      pagos: [{ formaPago: '99', total: 115 }],
    });
    expect(result.success).toBe(false);
  });

  it('rechaza secuencial con más de 9 dígitos', () => {
    const result = crearFacturaSchema.safeParse({
      ...facturaValida,
      secuencial: '1234567890',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza tipoIdentificacion fuera del catálogo SRI', () => {
    const result = crearFacturaSchema.safeParse({
      ...facturaValida,
      comprador: { ...facturaValida.comprador, tipoIdentificacion: '99' },
    });
    expect(result.success).toBe(false);
  });
});
