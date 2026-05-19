import { randomInt } from 'node:crypto';
import { ClaveAccesoError } from '../errors/index.js';
import { Ambiente, TipoEmision } from '../types/enums.js';
import { calcularDigitoVerificadorModulo11 } from './utils.js';
import type { ClaveAccesoData, ClaveAccesoParseada } from './types.js';

export * from './utils.js';
export type { ClaveAccesoData, ClaveAccesoParseada } from './types.js';

/**
 * Genera una clave de acceso de 49 dígitos siguiendo la normativa SRI.
 *
 * Si no se provee `codigoNumerico`, se genera uno aleatorio de 8 dígitos
 * usando crypto.randomInt (seguro contra colisiones razonables).
 */
export function generarClaveAcceso(data: ClaveAccesoData): string {
  const fecha = formatearFecha(data.fechaEmision);
  const tipoComprobante = String(data.tipoComprobante).padStart(2, '0');
  const ruc = validarRucBasico(data.ruc);
  const ambiente = data.ambiente ?? Ambiente.PRUEBAS;
  const establecimiento = data.establecimiento.padStart(3, '0');
  const puntoEmision = data.puntoEmision.padStart(3, '0');
  const secuencial = data.secuencial.padStart(9, '0');
  const codigoNumerico = data.codigoNumerico ?? generarCodigoNumerico();
  const tipoEmision = data.tipoEmision ?? TipoEmision.NORMAL;

  const claveBase =
    fecha +
    tipoComprobante +
    ruc +
    ambiente +
    establecimiento +
    puntoEmision +
    secuencial +
    codigoNumerico +
    tipoEmision;

  const digitoVerificador = calcularDigitoVerificadorModulo11(claveBase);
  return claveBase + digitoVerificador;
}

/**
 * Valida una clave de acceso: longitud 49, todos dígitos y dígito
 * verificador correcto.
 */
export function validarFormatoClaveAcceso(claveAcceso: string): boolean {
  if (claveAcceso.length !== 49) {
    return false;
  }
  if (!/^\d{49}$/.test(claveAcceso)) {
    return false;
  }
  const claveBase = claveAcceso.substring(0, 48);
  const digitoVerificador = claveAcceso.charAt(48);
  const digitoCalculado = calcularDigitoVerificadorModulo11(claveBase);
  return digitoVerificador === digitoCalculado;
}

/**
 * Parsea una clave de acceso y devuelve sus componentes.
 * Retorna null si la clave no pasa la validación de formato.
 */
export function parsearClaveAcceso(claveAcceso: string): ClaveAccesoParseada | null {
  if (!validarFormatoClaveAcceso(claveAcceso)) {
    return null;
  }

  const fechaStr = claveAcceso.substring(0, 8);
  const fecha = new Date(
    parseInt(fechaStr.substring(4, 8), 10),
    parseInt(fechaStr.substring(2, 4), 10) - 1,
    parseInt(fechaStr.substring(0, 2), 10),
  );

  return {
    fechaEmision: fecha,
    tipoComprobante: claveAcceso.substring(8, 10),
    ruc: claveAcceso.substring(10, 23),
    ambiente: claveAcceso.charAt(23) as Ambiente,
    establecimiento: claveAcceso.substring(24, 27),
    puntoEmision: claveAcceso.substring(27, 30),
    secuencial: claveAcceso.substring(30, 39),
    codigoNumerico: claveAcceso.substring(39, 47),
    tipoEmision: claveAcceso.charAt(47) as TipoEmision,
    digitoVerificador: claveAcceso.charAt(48),
  };
}

function formatearFecha(date: Date): string {
  const dia = date.getDate().toString().padStart(2, '0');
  const mes = (date.getMonth() + 1).toString().padStart(2, '0');
  const anio = date.getFullYear().toString();
  return dia + mes + anio;
}

function validarRucBasico(ruc: string): string {
  const rucLimpio = ruc.replace(/\D/g, '');
  if (rucLimpio.length !== 13) {
    throw new ClaveAccesoError('RUC inválido: debe tener 13 dígitos');
  }
  return rucLimpio;
}

function generarCodigoNumerico(): string {
  return randomInt(10000000, 100000000).toString();
}
