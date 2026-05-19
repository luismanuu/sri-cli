import { z } from 'zod';
import {
  ambienteSchema,
  campoAdicionalSchema,
  compradorSchema,
  detalleFacturaSchema,
  emisorSchema,
  fechaDdMmYyyySchema,
  pagoSchema,
  secuencialSchema,
  tipoEmisionSchema,
} from './common.js';

export const crearFacturaSchema = z.object({
  ambiente: ambienteSchema.optional(),
  tipoEmision: tipoEmisionSchema.optional(),
  fechaEmision: fechaDdMmYyyySchema,
  secuencial: secuencialSchema.optional(),
  emisor: emisorSchema,
  comprador: compradorSchema,
  detalles: z.array(detalleFacturaSchema).min(1, { message: 'La factura debe tener al menos un detalle' }),
  pagos: z.array(pagoSchema).min(1, { message: 'La factura debe tener al menos una forma de pago' }),
  infoAdicional: z.array(campoAdicionalSchema).optional(),
  guiaRemision: z.string().optional(),
});

export type CrearFacturaDto = z.infer<typeof crearFacturaSchema>;
