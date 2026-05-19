import { z } from 'zod';
import {
  ambienteSchema,
  campoAdicionalSchema,
  emisorSchema,
  fechaDdMmYyyySchema,
  secuencialSchema,
  tipoEmisionSchema,
  tipoIdentificacionSchema,
} from './common.js';

export const impuestoDocSustentoSchema = z.object({
  codImpuestoDocSustento: z.string().min(1),
  codigoPorcentaje: z.string().min(1),
  baseImponible: z.number().min(0),
  tarifa: z.number().min(0),
  valorImpuesto: z.number().min(0),
});

export const impuestoRetenidoSchema = z.object({
  codigo: z.string().min(1),
  codigoRetencion: z.string().min(1),
  baseImponible: z.number().min(0),
  porcentajeRetener: z.number().min(0),
  valorRetenido: z.number().min(0),
  codDocSustento: z.string().min(2),
  codSustento: z.string().optional(),
  numDocSustento: z.string().min(1),
  fechaEmisionDocSustento: fechaDdMmYyyySchema,
  totalSinImpuestos: z.number().min(0),
  importeTotal: z.number().min(0),
  pagoLocExt: z.enum(['01', '02']).optional(),
  formaPago: z.string().optional(),
  impuestosDocSustento: z.array(impuestoDocSustentoSchema).min(1),
});

export const sujetoRetenidoSchema = z.object({
  tipoIdentificacion: tipoIdentificacionSchema,
  tipoSujetoRetenido: z.enum(['01', '02']).optional(),
  parteRel: z.enum(['SI', 'NO']).optional(),
  razonSocial: z.string().min(1),
  identificacion: z.string().min(1),
});

export const crearRetencionSchema = z.object({
  ambiente: ambienteSchema.optional(),
  tipoEmision: tipoEmisionSchema.optional(),
  fechaEmision: fechaDdMmYyyySchema,
  secuencial: secuencialSchema.optional(),
  emisor: emisorSchema,
  sujetoRetenido: sujetoRetenidoSchema,
  periodoFiscal: z.string().regex(/^(0[1-9]|1[0-2])\/\d{4}$/, {
    message: 'El período fiscal debe tener el formato mm/yyyy',
  }),
  impuestos: z.array(impuestoRetenidoSchema).min(1),
  infoAdicional: z.array(campoAdicionalSchema).optional(),
});

export type CrearRetencionDto = z.infer<typeof crearRetencionSchema>;
export type ImpuestoRetenidoDto = z.infer<typeof impuestoRetenidoSchema>;
export type ImpuestoDocSustentoDto = z.infer<typeof impuestoDocSustentoSchema>;
