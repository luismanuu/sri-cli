/**
 * Ciclo de emisión de una factura electrónica del SRI Ecuador.
 *
 * Orquesta los cuatro paquetes del monorepo en un solo flujo, portando la
 * secuencia de FacturaService/SriService del repo de referencia
 * (open-api-facturacion-sri) sin NestJS, Postgres ni colas:
 *
 *   1. validar + construir el XML        (@sri-cli/core)
 *   2. firmar XAdES-BES con el P12        (@sri-cli/signing)
 *   3. persistir como FIRMADO             (@sri-cli/storage)
 *   4. enviar a recepción                 (@sri-cli/sri-client)
 *        → si DEVUELTA, persistir RECHAZADO y devolver los motivos del SRI
 *   5. consultar autorización             (@sri-cli/sri-client)
 *   6. persistir el estado final + XML autorizado y devolver el resultado
 *
 * Idempotente por clave de acceso: si ya hay un comprobante AUTORIZADO en el
 * store con la misma clave, se devuelve sin volver a firmar ni reenviar.
 */

import {
  Ambiente,
  TipoComprobante,
  TipoEmision,
  construirFacturaXml,
  crearFacturaSchema,
  generarClaveAcceso,
  validarIdentificacion,
} from '@sri-cli/core';
import type { CrearFacturaDto } from '@sri-cli/core';
import { signFactura } from '@sri-cli/signing';
import {
  consultarAutorizacion as consultarAutorizacionSri,
  enviarComprobante,
} from '@sri-cli/sri-client';
import type {
  Ambiente as AmbienteSri,
  AutorizacionResult,
} from '@sri-cli/sri-client';
import {
  ComprobanteNotFoundError,
  openStore,
} from '@sri-cli/storage';
import type { ComprobanteRecord } from '@sri-cli/storage';
import { construirFacturaDesdeDto } from './factura.js';
import { EmisionError } from './errors.js';
import type {
  EmisorDeps,
  EmitirFacturaOptions,
  EmitirFacturaResult,
  StoreLike,
} from './types.js';

const TIPO = 'FACTURA';

/** Colaboradores reales por defecto; se sobreescriben en las pruebas. */
const depsPorDefecto: EmisorDeps = {
  firmar: signFactura,
  enviarRecepcion: enviarComprobante,
  consultarAutorizacion: consultarAutorizacionSri,
  abrirStore: openStore,
};

/**
 * Emite una factura electrónica completa.
 *
 * @param input DTO de la factura (se valida con `crearFacturaSchema`).
 * @param options Certificado P12, ambiente, store y colaboradores inyectables.
 * @returns Resultado tipado con el estado, la clave de acceso y los mensajes
 *   del SRI. Una factura DEVUELTA o NO_AUTORIZADA NO lanza error: se devuelve
 *   con sus motivos en `errores`.
 * @throws {EmisionError} si el DTO es inválido, falta el secuencial o la
 *   identificación del comprador no es válida.
 * @throws {FirmaError | SriTransporteError | StorageError} de las capas
 *   inferiores, sin envolver: la orquestación no oculta sus causas.
 */
export async function emitirFactura(
  input: unknown,
  options: EmitirFacturaOptions,
): Promise<EmitirFacturaResult> {
  const deps: EmisorDeps = { ...depsPorDefecto, ...options.deps };

  const dto = validar(input);

  const ambiente = options.ambiente;
  const ambienteSri: AmbienteSri =
    ambiente === Ambiente.PRODUCCION ? '2' : '1';
  const tipoEmision = dto.tipoEmision ?? TipoEmision.NORMAL;
  const secuencial = dto.secuencial!.padStart(9, '0');
  const fechaEmision = parsearFechaEmision(dto.fechaEmision);

  const claveAcceso = generarClaveAcceso({
    fechaEmision,
    tipoComprobante: TipoComprobante.FACTURA,
    ruc: dto.emisor.ruc,
    ambiente,
    establecimiento: dto.emisor.establecimiento,
    puntoEmision: dto.emisor.puntoEmision,
    secuencial,
    // codigoNumerico determinista a partir del secuencial: así la clave de
    // acceso es reproducible entre corridas y la idempotencia por clave
    // funciona aunque el caller no la persista. (generarClaveAcceso usaría un
    // valor aleatorio que rompería la reproducibilidad).
    codigoNumerico: secuencial.slice(-8),
    tipoEmision,
  });

  const store = deps.abrirStore(dto.emisor.ruc, options.sriHome);
  try {
    const existente = buscarExistente(store, claveAcceso);

    // Idempotencia: no se reemite un comprobante ya AUTORIZADO.
    if (existente?.estado === 'AUTORIZADO') {
      return {
        estado: 'AUTORIZADO',
        claveAcceso,
        numeroAutorizacion: existente.numero_autorizacion,
        fechaAutorizacion: existente.fecha_autorizacion,
        comprobante: existente.xml_autorizado,
        errores: [],
        yaEmitido: true,
      };
    }

    // 1–2. construir XML y firmar.
    const factura = construirFacturaDesdeDto(
      dto,
      claveAcceso,
      ambiente,
      tipoEmision,
      secuencial,
    );
    const xml = construirFacturaXml(factura);
    const xmlFirmado = await deps.firmar(xml, options.p12, options.p12Password);

    // 3. persistir como FIRMADO (upsert: el comprobante pudo quedar de un
    //    intento previo DEVUELTA/EN_PROCESO).
    guardarFirmado(store, dto.emisor.ruc, claveAcceso, xmlFirmado, existente);

    // 4. recepción.
    const recepcion = await deps.enviarRecepcion(xmlFirmado, ambienteSri);
    if (recepcion.estado === 'DEVUELTA') {
      store.update(claveAcceso, { estado: 'RECHAZADO' });
      return {
        estado: 'DEVUELTA',
        claveAcceso,
        errores: recepcion.mensajes,
      };
    }
    store.update(claveAcceso, { estado: 'ENVIADO' });

    // 5–6. autorización + persistir estado final.
    const auth = await deps.consultarAutorizacion(claveAcceso, ambienteSri);
    return mapearAutorizacion(auth, store, claveAcceso);
  } finally {
    store.close();
  }
}

/** Valida el DTO con el schema y la identificación del comprador. */
function validar(input: unknown): CrearFacturaDto {
  const parsed = crearFacturaSchema.safeParse(input);
  if (!parsed.success) {
    throw new EmisionError(
      'La factura no pasó la validación de esquema',
      parsed.error.issues,
    );
  }
  const dto = parsed.data;

  if (!dto.secuencial) {
    throw new EmisionError(
      'El secuencial es obligatorio para generar la clave de acceso',
    );
  }

  const idCheck = validarIdentificacion(
    dto.comprador.tipoIdentificacion,
    dto.comprador.identificacion,
  );
  if (!idCheck.valido) {
    throw new EmisionError(
      `Identificación del comprador inválida: ${idCheck.error}`,
    );
  }

  return dto;
}

/** Convierte 'dd/mm/yyyy' a Date (la zona horaria se resuelve en core). */
function parsearFechaEmision(fecha: string): Date {
  const [dia, mes, anio] = fecha.split('/').map((n) => parseInt(n, 10));
  return new Date(anio!, mes! - 1, dia!);
}

/** Devuelve el comprobante guardado o `undefined` si no existe aún. */
function buscarExistente(
  store: StoreLike,
  claveAcceso: string,
): ComprobanteRecord | undefined {
  try {
    return store.get(claveAcceso);
  } catch (error) {
    if (error instanceof ComprobanteNotFoundError) return undefined;
    throw error;
  }
}

/** Inserta el comprobante FIRMADO, o lo actualiza si ya existía. */
function guardarFirmado(
  store: StoreLike,
  ruc: string,
  claveAcceso: string,
  xmlFirmado: string,
  existente: ComprobanteRecord | undefined,
): void {
  if (existente) {
    store.update(claveAcceso, { estado: 'FIRMADO', xml_firmado: xmlFirmado });
  } else {
    store.save({
      clave_acceso: claveAcceso,
      ruc_emisor: ruc,
      tipo: TIPO,
      estado: 'FIRMADO',
      xml_firmado: xmlFirmado,
    });
  }
}

/** Persiste el estado de autorización y devuelve el resultado tipado. */
function mapearAutorizacion(
  auth: AutorizacionResult,
  store: StoreLike,
  claveAcceso: string,
): EmitirFacturaResult {
  switch (auth.estado) {
    case 'AUTORIZADO':
      store.update(claveAcceso, {
        estado: 'AUTORIZADO',
        xml_autorizado: auth.comprobante,
        numero_autorizacion: auth.numeroAutorizacion,
        fecha_autorizacion: auth.fechaAutorizacion,
      });
      return {
        estado: 'AUTORIZADO',
        claveAcceso,
        numeroAutorizacion: auth.numeroAutorizacion,
        fechaAutorizacion: auth.fechaAutorizacion,
        comprobante: auth.comprobante,
        errores: auth.mensajes,
      };

    case 'NO AUTORIZADO':
      store.update(claveAcceso, { estado: 'RECHAZADO' });
      return {
        estado: 'NO_AUTORIZADO',
        claveAcceso,
        errores: auth.mensajes,
      };

    case 'EN PROCESO':
      // El comprobante quedó RECIBIDO en el SRI (estado local ENVIADO); aún no
      // hay resolución. Se conserva ENVIADO para volver a consultar más tarde.
      return {
        estado: 'EN_PROCESO',
        claveAcceso,
        errores: auth.mensajes,
      };
  }
}
