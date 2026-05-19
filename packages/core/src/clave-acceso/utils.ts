import { ClaveAccesoError } from '../errors/index.js';

/**
 * Estructura de la clave de acceso (49 dígitos):
 *   [0-7]   fechaEmision  (ddmmaaaa)
 *   [8-9]   tipoComprobante
 *   [10-22] ruc           (13 dígitos)
 *   [23]    ambiente      (1=pruebas, 2=producción)
 *   [24-26] establecimiento (3 dígitos)
 *   [27-29] puntoEmision  (3 dígitos)
 *   [30-38] secuencial    (9 dígitos)
 *   [39-46] codigoNumerico (8 dígitos)
 *   [47]    tipoEmision   (1=normal, 2=contingencia)
 *   [48]    digitoVerificador (módulo 11)
 */

export function validarClaveAcceso(claveAcceso: string): void {
  if (!claveAcceso) {
    throw new ClaveAccesoError('La clave de acceso no puede ser nula o vacía');
  }
  if (claveAcceso.length !== 49) {
    throw new ClaveAccesoError(
      `Clave de acceso inválida: se esperaban 49 dígitos, se recibieron ${claveAcceso.length}. Valor: "${claveAcceso}"`,
    );
  }
  if (!/^\d{49}$/.test(claveAcceso)) {
    throw new ClaveAccesoError(
      `Clave de acceso inválida: solo se permiten dígitos numéricos. Valor: "${claveAcceso}"`,
    );
  }
}

export function extraerRucDeClaveAcceso(claveAcceso: string): string {
  validarClaveAcceso(claveAcceso);
  return claveAcceso.substring(10, 23);
}

export function extraerAmbienteDeClaveAcceso(claveAcceso: string): string {
  validarClaveAcceso(claveAcceso);
  return claveAcceso.substring(23, 24);
}

export function extraerSecuencialDeClaveAcceso(claveAcceso: string): string {
  validarClaveAcceso(claveAcceso);
  return claveAcceso.substring(30, 39);
}

export function extraerTipoComprobanteDeClaveAcceso(claveAcceso: string): string {
  validarClaveAcceso(claveAcceso);
  return claveAcceso.substring(8, 10);
}

/**
 * Calcula el dígito verificador de una clave de acceso (módulo 11).
 *
 * Recorre la clave base de derecha a izquierda multiplicando cada dígito
 * por los factores cíclicos [2,3,4,5,6,7]. Casos especiales: si el
 * resultado es 11 se devuelve 0; si es 10, se devuelve 1.
 */
export function calcularDigitoVerificadorModulo11(claveBase: string): string {
  const factores = [2, 3, 4, 5, 6, 7];
  let suma = 0;

  for (let i = claveBase.length - 1, j = 0; i >= 0; i--, j++) {
    const digito = parseInt(claveBase.charAt(i), 10);
    const factor = factores[j % factores.length]!;
    suma += digito * factor;
  }

  const modulo = suma % 11;
  let digitoVerificador = 11 - modulo;

  if (digitoVerificador === 11) {
    digitoVerificador = 0;
  } else if (digitoVerificador === 10) {
    digitoVerificador = 1;
  }

  return digitoVerificador.toString();
}
