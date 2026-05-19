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

export const motivoNotaDebitoSchema = z.object({
  razon: z.string().min(1),
  valor: z.number().min(0),
});

export const crearNotaDebitoSchema = z.object({
  ambiente: ambienteSchema.optional(),
  tipoEmision: tipoEmisionSchema.optional(),
  fechaEmision: fechaDdMmYyyySchema,
  secuencial: secuencialSchema.optional(),
  emisor: emisorSchema,
  comprador: compradorSchema,
  codDocModificado: z.string().min(2),
  numDocModificado: z.string().min(1),
  fechaEmisionDocSustento: fechaDdMmYyyySchema,
  motivos: z.array(motivoNotaDebitoSchema).min(1),
  impuestos: z.array(impuestoDetalleSchema).min(1),
  infoAdicional: z.array(campoAdicionalSchema).optional(),
});

export type CrearNotaDebitoDto = z.infer<typeof crearNotaDebitoSchema>;
export type MotivoNotaDebitoDto = z.infer<typeof motivoNotaDebitoSchema>;
