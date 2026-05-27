import { ComprobanteDuplicadoError, ComprobanteNotFoundError } from '@sri-cli/storage';
import type {
  ComprobanteRecord,
  SaveComprobanteInput,
  UpdateComprobanteInput,
} from '@sri-cli/storage';
import type { CrearFacturaDto } from '@sri-cli/core';
import type { StoreLike } from '../src/types.js';

/**
 * Store en memoria que replica el contrato de @sri-cli/storage usado por la
 * orquestación: `get` lanza ComprobanteNotFoundError, `save` lanza
 * ComprobanteDuplicadoError. No toca SQLite.
 */
export class FakeStore implements StoreLike {
  rows = new Map<string, ComprobanteRecord>();
  closed = false;

  get(claveAcceso: string): ComprobanteRecord {
    const row = this.rows.get(claveAcceso);
    if (!row) throw new ComprobanteNotFoundError(claveAcceso);
    return row;
  }

  save(input: SaveComprobanteInput): ComprobanteRecord {
    if (this.rows.has(input.clave_acceso)) {
      throw new ComprobanteDuplicadoError(input.clave_acceso);
    }
    const now = new Date().toISOString();
    const record: ComprobanteRecord = { ...input, created_at: now, updated_at: now };
    this.rows.set(input.clave_acceso, record);
    return record;
  }

  update(claveAcceso: string, data: UpdateComprobanteInput): ComprobanteRecord {
    const existing = this.get(claveAcceso);
    const updated: ComprobanteRecord = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    };
    this.rows.set(claveAcceso, updated);
    return updated;
  }

  close(): void {
    this.closed = true;
  }
}

/** DTO de factura válido y mínimo (consumidor final, IVA 15%). */
export function facturaDtoValida(): CrearFacturaDto {
  return {
    fechaEmision: '15/01/2026',
    secuencial: '000000001',
    emisor: {
      ruc: '1790012345001',
      razonSocial: 'EMPRESA DEMO S.A.',
      dirMatriz: 'Av. Siempre Viva 123',
      establecimiento: '001',
      puntoEmision: '001',
      obligadoContabilidad: 'SI',
    },
    comprador: {
      tipoIdentificacion: '07',
      identificacion: '9999999999999',
      razonSocial: 'CONSUMIDOR FINAL',
      direccion: 'Quito',
      telefono: '0999999999',
      email: 'cliente@demo.ec',
    },
    infoAdicional: [{ nombre: 'observacion', valor: 'Venta de prueba' }],
    detalles: [
      {
        codigoPrincipal: 'P001',
        descripcion: 'Producto de prueba',
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
    pagos: [{ formaPago: '01', total: 115 }],
  };
}
