import { describe, expect, it } from 'vitest';
import { crearGuiaRemisionSchema } from '../src/dto/guia-remision.js';

const guiaValida = {
  ambiente: '1',
  tipoEmision: '1',
  fechaIniTransporte: '07/02/2026',
  fechaFinTransporte: '08/02/2026',
  secuencial: '000000001',
  emisor: {
    ruc: '1790016919001',
    razonSocial: 'EMPRESA EJEMPLO S.A.',
    dirMatriz: 'Av. Amazonas N12-345',
    establecimiento: '001',
    puntoEmision: '001',
    obligadoContabilidad: 'SI',
  },
  transportista: {
    tipoIdentificacion: '04',
    ruc: '0924383631001',
    razonSocial: 'TRANSPORTES SA',
    placa: 'PXY-1234',
  },
  dirPartida: 'Bodega 1',
  destinatarios: [
    {
      tipoIdentificacionDestinatario: '05',
      identificacionDestinatario: '0924383631',
      razonSocialDestinatario: 'JUAN PEREZ',
      dirDestinatario: 'Av. 9 de Octubre',
      motivoTraslado: 'Venta',
      detalles: [
        { codigoInterno: 'PROD-001', descripcion: 'Producto', cantidad: 1 },
      ],
    },
  ],
};

describe('crearGuiaRemisionSchema (zod)', () => {
  it('acepta un fixture válido', () => {
    const result = crearGuiaRemisionSchema.safeParse(guiaValida);
    expect(result.success).toBe(true);
  });

  it('rechaza fechas con formato distinto a dd/mm/yyyy con mensaje en español', () => {
    const result = crearGuiaRemisionSchema.safeParse({
      ...guiaValida,
      fechaIniTransporte: '2026-02-07',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message).join('\n');
      expect(msgs).toContain('dd/mm/yyyy');
    }
  });

  it('rechaza guía sin destinatarios', () => {
    const result = crearGuiaRemisionSchema.safeParse({
      ...guiaValida,
      destinatarios: [],
    });
    expect(result.success).toBe(false);
  });

  it('rechaza destinatario sin detalles', () => {
    const result = crearGuiaRemisionSchema.safeParse({
      ...guiaValida,
      destinatarios: [{ ...guiaValida.destinatarios[0], detalles: [] }],
    });
    expect(result.success).toBe(false);
  });
});
