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

export const detalleGuiaRemisionSchema = z.object({
  codigoInterno: z.string().min(1),
  codigoAdicional: z.string().optional(),
  descripcion: z.string().min(1),
  cantidad: z.number().min(0),
  detallesAdicionales: z
    .array(z.object({ nombre: z.string().min(1), valor: z.string().min(1) }))
    .optional(),
});

export const destinatarioGuiaRemisionSchema = z.object({
  tipoIdentificacionDestinatario: z.string().min(2),
  identificacionDestinatario: z.string().min(1),
  razonSocialDestinatario: z.string().min(1),
  dirDestinatario: z.string().min(1),
  emailDestinatario: z.string().optional(),
  motivoTraslado: z.string().min(1),
  docAduaneroUnico: z.string().optional(),
  codEstabDestino: z.string().optional(),
  ruta: z.string().optional(),
  codDocSustento: z.string().optional(),
  numDocSustento: z.string().optional(),
  numAutDocSustento: z.string().optional(),
  fechaEmisionDocSustento: fechaDdMmYyyySchema.optional(),
  detalles: z.array(detalleGuiaRemisionSchema).min(1),
});

export const crearGuiaRemisionSchema = z.object({
  ambiente: ambienteSchema.optional(),
  tipoEmision: tipoEmisionSchema.optional(),
  fechaIniTransporte: fechaDdMmYyyySchema,
  fechaFinTransporte: fechaDdMmYyyySchema,
  secuencial: secuencialSchema.optional(),
  emisor: emisorSchema,
  transportista: z.object({
    tipoIdentificacion: tipoIdentificacionSchema,
    ruc: z.string().min(1),
    razonSocial: z.string().min(1),
    rise: z.string().optional(),
    placa: z.string().min(1),
  }),
  dirPartida: z.string().min(1),
  destinatarios: z.array(destinatarioGuiaRemisionSchema).min(1),
  infoAdicional: z.array(campoAdicionalSchema).optional(),
});

export type CrearGuiaRemisionDto = z.infer<typeof crearGuiaRemisionSchema>;
export type DestinatarioGuiaRemisionDto = z.infer<typeof destinatarioGuiaRemisionSchema>;
export type DetalleGuiaRemisionDto = z.infer<typeof detalleGuiaRemisionSchema>;
