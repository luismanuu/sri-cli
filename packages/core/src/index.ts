/**
 * @sri-cli/core — Lógica pura de comprobantes electrónicos del SRI Ecuador.
 *
 * Sin NestJS, sin Postgres, sin BullMQ: solo funciones puras, schemas zod y
 * los catálogos SRI embebidos como JSON.
 */

export * from './errors/index.js';
export * from './types/index.js';
export * from './clave-acceso/index.js';
export * from './validators/index.js';
export * from './comprobantes/index.js';
export * from './xml-builder/index.js';
export * from './dto/index.js';
export * as catalogos from './catalogs/index.js';
