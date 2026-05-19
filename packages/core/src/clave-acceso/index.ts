import { randomInt } from 'node:crypto';
import { ClaveAccesoError } from '../errors/index.js';
import { Ambiente, TipoEmision } from '../types/enums.js';
import { calcularDigitoVerificadorModulo11 } from './utils.js';
import type { ClaveAccesoData, ClaveAccesoParseada } from './types.js';

export * from './utils.js';
export type { ClaveAccesoData, ClaveAccesoParseada } from './types.js';
export { formatearFecha };

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

/**
 * Formatea un `Date` como `ddmmyyyy` interpretado siempre en la zona
 * horaria de Ecuador (America/Guayaquil, UTC-5), independientemente del
 * TZ del runtime (Vercel/Lambda/CI suelen ser UTC).
 *
 * Es crítico para la clave de acceso: usar `getDate()/getMonth()/
 * getFullYear()` produciría un día distinto al esperado por el SRI
 * cuando el proceso corre fuera de Ecuador.
 */
const fechaFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Guayaquil',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function formatearFecha(date: Date): string {
  const parts = fechaFormatter.formatToParts(date);
  const dia = parts.find((p) => p.type === 'day')!.value;
  const mes = parts.find((p) => p.type === 'month')!.value;
  const anio = parts.find((p) => p.type === 'year')!.value;
  return `${dia}${mes}${anio}`;
}

function validarRucBasico(ruc: string): string {
  // Rechazamos input con caracteres no numéricos en vez de hacer strip
  // silencioso: si llega "0924-383-631-001" probablemente sea un bug del
  // caller, no algo a "limpiar" detrás de su espalda.
  if (!/^\d+$/.test(ruc)) {
    throw new ClaveAccesoError('RUC inválido: solo se permiten dígitos');
  }
  if (ruc.length !== 13) {
    throw new ClaveAccesoError('RUC inválido: debe tener 13 dígitos');
  }
  return ruc;
}

function generarCodigoNumerico(): string {
  // Invariante: el codigoNumerico debe ser exactamente 8 dígitos para no
  // romper el layout de 49 dígitos de la clave de acceso. randomInt con
  // bounds [10000000, 100000000) hoy garantiza 8 dígitos, pero el padStart
  // defensivo protege contra cambios futuros de bounds que pudieran
  // introducir un bug silencioso en producción.
  return randomInt(10000000, 100000000).toString().padStart(8, '0');
}
