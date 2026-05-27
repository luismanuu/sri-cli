/**
 * Utilidades de parseo de respuestas SOAP del SRI.
 *
 * El SRI devuelve nodos que pueden venir como objeto único o como arreglo
 * según la cantidad de elementos. La referencia normaliza con
 * `Array.isArray(...) ? ... : [...]`; aquí se centraliza esa lógica.
 */

import type { SriMensaje } from './types.js';

/** Devuelve siempre un arreglo: envuelve el valor único o filtra null/undefined. */
export function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

/** Normaliza un nodo `{ mensaje }` del SRI (único o arreglo) a SriMensaje[]. */
export function parseMensajes(
  contenedor: { mensaje?: SriMensaje | SriMensaje[] } | undefined | null,
): SriMensaje[] {
  if (!contenedor) return [];
  return asArray(contenedor.mensaje);
}
