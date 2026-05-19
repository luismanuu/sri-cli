import { describe, expect, it } from 'vitest';
import {
  validarCedula,
  validarConsumidorFinal,
  validarIdentificacion,
  validarPasaporte,
  validarRuc,
} from '../src/validators/identificacion.js';

// Cédulas y RUCs ecuatorianos reales (públicos) usados como referencia en el
// repo base de Angelo Barzola Villamar.
const CEDULAS_VALIDAS = ['0924383631', '1710034065'];
const CEDULAS_INVALIDAS = ['1234567890', '0000000000'];

const RUCS_NATURAL = ['0924383631001', '1710034065001'];
const RUCS_PRIVADA = ['1790016919001']; // RUC privada con DV verificado por módulo 11
const RUCS_PUBLICA = ['1760001550001']; // Banco Central del Ecuador

describe('validarCedula', () => {
  for (const c of CEDULAS_VALIDAS) {
    it(`acepta cédula real ${c}`, () => {
      expect(validarCedula(c).valido).toBe(true);
    });
  }

  for (const c of CEDULAS_INVALIDAS) {
    it(`rechaza cédula inválida ${c}`, () => {
      expect(validarCedula(c).valido).toBe(false);
    });
  }

  it('rechaza longitud distinta de 10', () => {
    expect(validarCedula('123').valido).toBe(false);
    expect(validarCedula('').valido).toBe(false);
  });

  it('rechaza provincia inválida (00 o > 24 distinta de 30)', () => {
    expect(validarCedula('0024383631').valido).toBe(false);
    expect(validarCedula('2524383631').valido).toBe(false);
    expect(validarCedula('3124383631').valido).toBe(false);
  });

  it('acepta provincia 30 (servicio exterior / consulares) — S4', () => {
    // Cédula con provincia 30, tercer dígito 0, DV calculado vía módulo 10
    expect(validarCedula('3001234560').valido).toBe(true);
  });

  it('rechaza tercer dígito > 5', () => {
    expect(validarCedula('0964383631').valido).toBe(false);
  });

  it('rechaza dígito verificador incorrecto', () => {
    expect(validarCedula('0924383632').valido).toBe(false);
  });
});

describe('validarRuc', () => {
  for (const r of RUCS_NATURAL) {
    it(`acepta RUC persona natural ${r}`, () => {
      expect(validarRuc(r).valido).toBe(true);
    });
  }

  for (const r of RUCS_PRIVADA) {
    it(`acepta RUC sociedad privada ${r}`, () => {
      expect(validarRuc(r).valido).toBe(true);
    });
  }

  for (const r of RUCS_PUBLICA) {
    it(`acepta RUC sociedad pública ${r}`, () => {
      expect(validarRuc(r).valido).toBe(true);
    });
  }

  it('rechaza longitud distinta de 13', () => {
    expect(validarRuc('12345').valido).toBe(false);
  });

  it('rechaza tercer dígito inválido (7 ó 8)', () => {
    expect(validarRuc('0974383631001').valido).toBe(false);
    expect(validarRuc('0984383631001').valido).toBe(false);
  });

  it('rechaza RUC persona natural con establecimiento 000', () => {
    expect(validarRuc('0924383631000').valido).toBe(false);
  });

  it('rechaza RUC privada que no termina en 001', () => {
    expect(validarRuc('1790016919002').valido).toBe(false);
  });

  it('rechaza RUC pública que no termina en 0001', () => {
    expect(validarRuc('1760001550002').valido).toBe(false);
  });

  it('rechaza dígito verificador incorrecto en privada', () => {
    expect(validarRuc('1790016910001').valido).toBe(false);
  });

  it('rechaza provincia inválida', () => {
    expect(validarRuc('9990016919001').valido).toBe(false);
  });

  it('acepta provincia 30 en RUC (servicio exterior / consulares) — S4', () => {
    // RUC sociedad privada con provincia 30, DV calculado vía módulo 11
    expect(validarRuc('3099999992001').valido).toBe(true);
  });
});

describe('validarPasaporte', () => {
  it('acepta longitudes razonables', () => {
    expect(validarPasaporte('AB12345').valido).toBe(true);
  });

  it('rechaza demasiado corto o demasiado largo', () => {
    expect(validarPasaporte('A1').valido).toBe(false);
    expect(validarPasaporte('A'.repeat(21)).valido).toBe(false);
  });
});

describe('validarConsumidorFinal', () => {
  it('acepta solo 9999999999999', () => {
    expect(validarConsumidorFinal('9999999999999').valido).toBe(true);
    expect(validarConsumidorFinal('1234567890123').valido).toBe(false);
  });
});

describe('validarIdentificacion (dispatch por tipo)', () => {
  it('despacha al validador correcto', () => {
    expect(validarIdentificacion('04', '0924383631001').valido).toBe(true);
    expect(validarIdentificacion('05', '0924383631').valido).toBe(true);
    expect(validarIdentificacion('06', 'AB12345').valido).toBe(true);
    expect(validarIdentificacion('07', '9999999999999').valido).toBe(true);
    expect(validarIdentificacion('08', 'cualquier-cosa-12345').valido).toBe(true);
  });

  it('rechaza tipos desconocidos', () => {
    expect(validarIdentificacion('99', 'x').valido).toBe(false);
  });
});
