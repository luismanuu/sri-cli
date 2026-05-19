import { z } from 'zod';
import { Ambiente, FormaPago, TipoEmision, TipoIdentificacion } from '../types/enums.js';

/**
 * Schemas zod compartidos por todos los DTOs de comprobantes.
 * Reemplazan los DTOs con class-validator del repo base.
 *
 * Convención: los mensajes de error van en español neutro.
 */

export const ambienteSchema = z.nativeEnum(Ambiente);
export const tipoEmisionSchema = z.nativeEnum(TipoEmision);
export const tipoIdentificacionSchema = z.nativeEnum(TipoIdentificacion);
export const formaPagoSchema = z.nativeEnum(FormaPago);

export const fechaDdMmYyyySchema = z
  .string()
  .regex(/^\d{2}\/\d{2}\/\d{4}$/, { message: 'La fecha debe tener el formato dd/mm/yyyy' });

export const secuencialSchema = z
  .string()
  .regex(/^\d{1,9}$/, { message: 'El secuencial debe ser numérico de hasta 9 dígitos' });

export const claveAccesoSchema = z
  .string()
  .regex(/^\d{49}$/, { message: 'La clave de acceso debe tener exactamente 49 dígitos numéricos' });

export const codigoEstablecimientoSchema = z
  .string()
  .regex(/^\d{3}$/, { message: 'El código debe tener exactamente 3 dígitos numéricos' });

export const rucSchema = z
  .string()
  .regex(/^\d{13}$/, { message: 'El RUC debe tener exactamente 13 dígitos numéricos' });

export const emisorSchema = z.object({
  ruc: rucSchema,
  razonSocial: z.string().min(1, { message: 'La razón social del emisor es requerida' }),
  nombreComercial: z.string().optional(),
  dirMatriz: z.string().min(1, { message: 'La dirección de la matriz es requerida' }),
  dirEstablecimiento: z.string().optional(),
  establecimiento: codigoEstablecimientoSchema,
  puntoEmision: codigoEstablecimientoSchema,
  obligadoContabilidad: z.enum(['SI', 'NO']),
  contribuyenteEspecial: z.string().optional(),
  agenteRetencion: z.string().optional(),
  contribuyenteRimpe: z.literal('CONTRIBUYENTE RÉGIMEN RIMPE').optional(),
});

export const compradorSchema = z.object({
  tipoIdentificacion: tipoIdentificacionSchema,
  identificacion: z.string().min(1, { message: 'La identificación del comprador es requerida' }),
  razonSocial: z.string().min(1, { message: 'La razón social del comprador es requerida' }),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().optional(),
});

export const impuestoDetalleSchema = z.object({
  codigo: z.string().min(1),
  codigoPorcentaje: z.string().min(1),
  tarifa: z
    .number()
    .min(0, { message: 'La tarifa no puede ser negativa' })
    .max(100, { message: 'La tarifa no puede exceder 100%' }),
  baseImponible: z.number().min(0),
  valor: z.number().min(0),
});

export const detalleAdicionalSchema = z.object({
  nombre: z.string().min(1),
  valor: z.string().min(1),
});

export const detalleFacturaSchema = z.object({
  codigoPrincipal: z.string().min(1),
  codigoAuxiliar: z.string().optional(),
  descripcion: z.string().min(1),
  unidadMedida: z.string().optional(),
  cantidad: z.number().min(0),
  precioUnitario: z.number().min(0),
  descuento: z.number().min(0, {
    message: 'El descuento se expresa en valor monetario absoluto y no puede ser negativo',
  }),
  precioTotalSinImpuesto: z.number({
    required_error: 'El precioTotalSinImpuesto es requerido en cada detalle',
    invalid_type_error: 'El precioTotalSinImpuesto debe ser numérico',
  }).min(0, { message: 'El precioTotalSinImpuesto no puede ser negativo' }),
  detallesAdicionales: z.array(detalleAdicionalSchema).optional(),
  impuestos: z.array(impuestoDetalleSchema).min(1, { message: 'Debe declarar al menos un impuesto en el detalle' }),
});

export const pagoSchema = z.object({
  formaPago: formaPagoSchema,
  total: z.number().min(0),
  plazo: z.number().min(0).optional(),
  unidadTiempo: z.enum(['dias', 'meses', 'años']).optional(),
});

export const campoAdicionalSchema = z.object({
  nombre: z.string().min(1),
  valor: z.string().min(1),
});

export type EmisorDto = z.infer<typeof emisorSchema>;
export type CompradorDto = z.infer<typeof compradorSchema>;
export type ImpuestoDetalleDto = z.infer<typeof impuestoDetalleSchema>;
export type DetalleAdicionalDto = z.infer<typeof detalleAdicionalSchema>;
export type DetalleFacturaDto = z.infer<typeof detalleFacturaSchema>;
export type PagoDto = z.infer<typeof pagoSchema>;
export type CampoAdicionalDto = z.infer<typeof campoAdicionalSchema>;
