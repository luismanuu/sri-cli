import { z } from 'zod';
import {
  ambienteSchema,
  campoAdicionalSchema,
  compradorSchema,
  emisorSchema,
  fechaDdMmYyyySchema,
  impuestoDetalleSchema,
  secuencialSchema,
  tipoEmisionSchema,
} from './common.js';

export const detalleNotaCreditoSchema = z.object({
  codigoInterno: z.string().min(1),
  codigoAdicional: z.string().optional(),
  descripcion: z.string().min(1),
  cantidad: z.number().min(0),
  precioUnitario: z.number().min(0),
  descuento: z.number().min(0),
  detallesAdicionales: z
    .array(z.object({ nombre: z.string().min(1), valor: z.string().min(1) }))
    .optional(),
  impuestos: z.array(impuestoDetalleSchema).min(1),
});

export const crearNotaCreditoSchema = z.object({
  ambiente: ambienteSchema.optional(),
  tipoEmision: tipoEmisionSchema.optional(),
  fechaEmision: fechaDdMmYyyySchema,
  secuencial: secuencialSchema.optional(),
  emisor: emisorSchema,
  comprador: compradorSchema,
  codDocModificado: z.string().min(2),
  numDocModificado: z.string().min(1),
  fechaEmisionDocSustento: fechaDdMmYyyySchema,
  motivo: z.string().min(1, { message: 'El motivo de la nota de crédito es requerido' }),
  detalles: z.array(detalleNotaCreditoSchema).min(1),
  infoAdicional: z.array(campoAdicionalSchema).optional(),
});

export type CrearNotaCreditoDto = z.infer<typeof crearNotaCreditoSchema>;
export type DetalleNotaCreditoDto = z.infer<typeof detalleNotaCreditoSchema>;
