/**
 * Validadores de identificaciones ecuatorianas (Cédula, RUC, Pasaporte,
 * Consumidor Final, Identificación del Exterior).
 *
 * Funciones puras: dado un string, devuelven `{ valido, error? }`.
 */

export interface ResultadoValidacion {
  valido: boolean;
  error?: string;
}

function esProvinciaValida(provincia: number): boolean {
  return (provincia >= 1 && provincia <= 24) || provincia === 30;
}

/**
 * Dispatch por tipo SRI:
 *   '04' RUC          — validarRuc
 *   '05' CÉDULA       — validarCedula
 *   '06' PASAPORTE    — validarPasaporte
 *   '07' CONSUMIDOR FINAL — validarConsumidorFinal
 *   '08' EXTERIOR     — no se valida estructura
 */
export function validarIdentificacion(
  tipoIdentificacion: string,
  identificacion: string,
): ResultadoValidacion {
  switch (tipoIdentificacion) {
    case '04':
      return validarRuc(identificacion);
    case '05':
      return validarCedula(identificacion);
    case '06':
      return validarPasaporte(identificacion);
    case '07':
      return validarConsumidorFinal(identificacion);
    case '08':
      return { valido: true };
    default:
      return {
        valido: false,
        error: `Tipo de identificación ${tipoIdentificacion} no reconocido`,
      };
  }
}

/**
 * Valida cédula ecuatoriana usando el algoritmo Módulo 10.
 */
export function validarCedula(cedula: string): ResultadoValidacion {
  if (!cedula || !/^\d{10}$/.test(cedula)) {
    return {
      valido: false,
      error: 'La cédula debe tener exactamente 10 dígitos numéricos',
    };
  }

  // Provincias válidas: 01-24 (territorio nacional) y 30 (servicio exterior /
  // consulares — cédulas emitidas fuera de Ecuador).
  const provincia = parseInt(cedula.substring(0, 2), 10);
  if (!esProvinciaValida(provincia)) {
    return {
      valido: false,
      error: `Código de provincia ${provincia} inválido (debe ser 01-24 o 30)`,
    };
  }

  const tercerDigito = parseInt(cedula.charAt(2), 10);
  if (tercerDigito > 5) {
    return {
      valido: false,
      error: 'El tercer dígito de la cédula debe ser menor o igual a 5',
    };
  }

  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let valor = parseInt(cedula.charAt(i), 10) * coeficientes[i]!;
    if (valor > 9) {
      valor -= 9;
    }
    suma += valor;
  }

  const residuo = suma % 10;
  const digitoVerificadorCalculado = residuo === 0 ? 0 : 10 - residuo;
  const digitoVerificador = parseInt(cedula.charAt(9), 10);

  if (digitoVerificadorCalculado !== digitoVerificador) {
    return {
      valido: false,
      error: `Dígito verificador incorrecto. Esperado: ${digitoVerificadorCalculado}, recibido: ${digitoVerificador}`,
    };
  }

  return { valido: true };
}

/**
 * Valida RUC ecuatoriano. Dispatch por tercer dígito:
 *   - 0..5 = persona natural (cédula + 001)
 *   - 6    = sociedad pública (módulo 11 con 8 coeficientes, termina en 0001)
 *   - 9    = sociedad privada (módulo 11 con 9 coeficientes, termina en 001)
 */
export function validarRuc(ruc: string): ResultadoValidacion {
  if (!ruc || !/^\d{13}$/.test(ruc)) {
    return {
      valido: false,
      error: 'El RUC debe tener exactamente 13 dígitos numéricos',
    };
  }

  const provincia = parseInt(ruc.substring(0, 2), 10);
  if (!esProvinciaValida(provincia)) {
    return {
      valido: false,
      error: `Código de provincia ${provincia} inválido (debe ser 01-24 o 30)`,
    };
  }

  const tercerDigito = parseInt(ruc.charAt(2), 10);

  if (tercerDigito >= 0 && tercerDigito <= 5) {
    return validarRucPersonaNatural(ruc);
  }
  if (tercerDigito === 6) {
    return validarRucSociedadPublica(ruc);
  }
  if (tercerDigito === 9) {
    return validarRucSociedadPrivada(ruc);
  }

  return { valido: false, error: 'Tercer dígito del RUC inválido' };
}

function validarRucPersonaNatural(ruc: string): ResultadoValidacion {
  const cedula = ruc.substring(0, 10);
  const establecimiento = ruc.substring(10, 13);

  const codEstab = parseInt(establecimiento, 10);
  if (codEstab < 1) {
    return {
      valido: false,
      error: 'Código de establecimiento del RUC inválido',
    };
  }

  const validacionCedula = validarCedula(cedula);
  if (!validacionCedula.valido) {
    return {
      valido: false,
      error: `RUC persona natural: ${validacionCedula.error}`,
    };
  }

  return { valido: true };
}

function validarRucSociedadPrivada(ruc: string): ResultadoValidacion {
  const coeficientes = [4, 3, 2, 7, 6, 5, 4, 3, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    suma += parseInt(ruc.charAt(i), 10) * coeficientes[i]!;
  }

  const residuo = suma % 11;
  const digitoVerificadorCalculado = residuo === 0 ? 0 : 11 - residuo;
  const digitoVerificador = parseInt(ruc.charAt(9), 10);

  if (digitoVerificadorCalculado !== digitoVerificador) {
    return {
      valido: false,
      error: 'RUC sociedad privada: dígito verificador incorrecto',
    };
  }

  if (ruc.substring(10, 13) !== '001') {
    return {
      valido: false,
      error: 'RUC sociedad privada debe terminar en 001',
    };
  }

  return { valido: true };
}

function validarRucSociedadPublica(ruc: string): ResultadoValidacion {
  const coeficientes = [3, 2, 7, 6, 5, 4, 3, 2];
  let suma = 0;
  for (let i = 0; i < 8; i++) {
    suma += parseInt(ruc.charAt(i), 10) * coeficientes[i]!;
  }

  const residuo = suma % 11;
  const digitoVerificadorCalculado = residuo === 0 ? 0 : 11 - residuo;
  const digitoVerificador = parseInt(ruc.charAt(8), 10);

  if (digitoVerificadorCalculado !== digitoVerificador) {
    return {
      valido: false,
      error: 'RUC sociedad pública: dígito verificador incorrecto',
    };
  }

  if (ruc.substring(9, 13) !== '0001') {
    return {
      valido: false,
      error: 'RUC sociedad pública debe terminar en 0001',
    };
  }

  return { valido: true };
}

export function validarPasaporte(pasaporte: string): ResultadoValidacion {
  if (!pasaporte || pasaporte.length < 5 || pasaporte.length > 20) {
    return {
      valido: false,
      error: 'El pasaporte debe tener entre 5 y 20 caracteres',
    };
  }
  return { valido: true };
}

export function validarConsumidorFinal(identificacion: string): ResultadoValidacion {
  if (identificacion !== '9999999999999') {
    return {
      valido: false,
      error: 'Consumidor final debe usar identificación 9999999999999',
    };
  }
  return { valido: true };
}
