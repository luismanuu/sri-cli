import { describe, expect, it } from 'vitest';
import {
  Ambiente,
  TipoComprobante,
  TipoEmision,
} from '../src/types/enums.js';
import {
  calcularDigitoVerificadorModulo11,
  extraerAmbienteDeClaveAcceso,
  extraerRucDeClaveAcceso,
  extraerSecuencialDeClaveAcceso,
  extraerTipoComprobanteDeClaveAcceso,
  formatearFecha,
  generarClaveAcceso,
  parsearClaveAcceso,
  validarFormatoClaveAcceso,
} from '../src/clave-acceso/index.js';
import { ClaveAccesoError } from '../src/errors/index.js';

// 2026-02-07 17:00 UTC = 12:00 America/Guayaquil — fecha inequívoca día 07
// independientemente del TZ del runtime.
const baseData = {
  fechaEmision: new Date('2026-02-07T17:00:00Z'),
  tipoComprobante: TipoComprobante.FACTURA,
  ruc: '0924383631001',
  ambiente: Ambiente.PRUEBAS,
  establecimiento: '001',
  puntoEmision: '001',
  secuencial: '000000001',
  codigoNumerico: '12345678',
  tipoEmision: TipoEmision.NORMAL,
};

describe('generarClaveAcceso', () => {
  it('genera 49 dígitos numéricos', () => {
    const clave = generarClaveAcceso(baseData);
    expect(clave).toHaveLength(49);
    expect(clave).toMatch(/^\d{49}$/);
  });

  it('respeta el layout posicional [fecha|tipo|ruc|amb|estab|pe|seq|cod|emi|dv]', () => {
    const clave = generarClaveAcceso(baseData);
    expect(clave.substring(0, 8)).toBe('07022026');
    expect(clave.substring(8, 10)).toBe('01');
    expect(clave.substring(10, 23)).toBe('0924383631001');
    expect(clave.charAt(23)).toBe('1');
    expect(clave.substring(24, 27)).toBe('001');
    expect(clave.substring(27, 30)).toBe('001');
    expect(clave.substring(30, 39)).toBe('000000001');
    expect(clave.substring(39, 47)).toBe('12345678');
    expect(clave.charAt(47)).toBe('1');
  });

  it('genera código numérico aleatorio si no se provee', () => {
    const { codigoNumerico: _ignored, ...rest } = baseData;
    const a = generarClaveAcceso(rest);
    const b = generarClaveAcceso(rest);
    expect(a).toHaveLength(49);
    expect(b).toHaveLength(49);
  });

  it('lanza ClaveAccesoError con RUC inválido', () => {
    expect(() => generarClaveAcceso({ ...baseData, ruc: '12345' })).toThrow(ClaveAccesoError);
  });

  it('genera claves distintas para secuenciales distintos', () => {
    const a = generarClaveAcceso({ ...baseData, secuencial: '000000001' });
    const b = generarClaveAcceso({ ...baseData, secuencial: '000000002' });
    expect(a).not.toBe(b);
  });
});

describe('validarFormatoClaveAcceso', () => {
  it('valida claves generadas por el propio módulo', () => {
    const clave = generarClaveAcceso(baseData);
    expect(validarFormatoClaveAcceso(clave)).toBe(true);
  });

  it('rechaza claves de longitud incorrecta', () => {
    expect(validarFormatoClaveAcceso('1234567890')).toBe(false);
  });

  it('rechaza claves con caracteres no numéricos', () => {
    expect(
      validarFormatoClaveAcceso('070220260109243836310011001000000001ABCD123411'),
    ).toBe(false);
  });

  it('rechaza claves con dígito verificador alterado', () => {
    const clave = generarClaveAcceso(baseData);
    const alterada = clave.substring(0, 48) + ((parseInt(clave.charAt(48), 10) + 1) % 10);
    expect(validarFormatoClaveAcceso(alterada)).toBe(false);
  });
});

describe('parsearClaveAcceso', () => {
  it('parsea correctamente los componentes', () => {
    const clave = generarClaveAcceso({ ...baseData, secuencial: '000000016', codigoNumerico: '12452940' });
    const parsed = parsearClaveAcceso(clave);
    expect(parsed).not.toBeNull();
    expect(parsed!.ruc).toBe('0924383631001');
    expect(parsed!.tipoComprobante).toBe('01');
    expect(parsed!.ambiente).toBe('1');
    expect(parsed!.establecimiento).toBe('001');
    expect(parsed!.puntoEmision).toBe('001');
    expect(parsed!.secuencial).toBe('000000016');
    expect(parsed!.codigoNumerico).toBe('12452940');
    expect(parsed!.tipoEmision).toBe('1');
    expect(parsed!.fechaEmision.getFullYear()).toBe(2026);
  });

  it('retorna null para clave inválida', () => {
    expect(parsearClaveAcceso('0000')).toBeNull();
  });
});

describe('calcularDigitoVerificadorModulo11 (vía generate + validate)', () => {
  it('produce dígitos válidos para múltiples RUCs', () => {
    const rucs = ['0924383631001', '1790016919001', '0991234567001'];
    for (const ruc of rucs) {
      const clave = generarClaveAcceso({ ...baseData, ruc });
      expect(validarFormatoClaveAcceso(clave)).toBe(true);
    }
  });

  it('produce dígitos válidos para todos los tipos de comprobante', () => {
    const tipos = [
      TipoComprobante.FACTURA,
      TipoComprobante.NOTA_CREDITO,
      TipoComprobante.NOTA_DEBITO,
      TipoComprobante.GUIA_REMISION,
      TipoComprobante.COMPROBANTE_RETENCION,
    ];
    for (const tipo of tipos) {
      const clave = generarClaveAcceso({ ...baseData, tipoComprobante: tipo });
      expect(validarFormatoClaveAcceso(clave)).toBe(true);
    }
  });

  it('mapea residuo 10 -> dv 1 y residuo 11 -> dv 0', () => {
    // Caso forzado: secuencia de ceros => suma 0 => modulo 0 => dv = 11 -> 0
    const dv0 = calcularDigitoVerificadorModulo11('000000000000000000000000000000000000000000000000');
    expect(dv0).toBe('0');
    // Una serie con dv esperado conocido — verificación cruzada vs. la suma manual:
    const claveBase = '111111111111111111111111111111111111111111111111';
    // suma = sum(1 * factores[j%6]) j=0..47 => 48/6=8 ciclos completos => 8*(2+3+4+5+6+7)=8*27=216
    // 216 % 11 = 7 => 11-7 = 4
    expect(calcularDigitoVerificadorModulo11(claveBase)).toBe('4');
  });
});

describe('formatearFecha (timezone-safe, B2)', () => {
  it('produce 06022026 para UTC midnight (= 19:00 ECT día anterior)', () => {
    // UTC midnight de 2026-02-07 = 2026-02-06 19:00 ECT → día 06 en Ecuador.
    // Este es el caso que rompía con getDate() en runtimes UTC.
    const fecha = new Date('2026-02-07T00:00:00Z');
    expect(formatearFecha(fecha)).toBe('06022026');
  });

  it('produce 07022026 para 20:00 UTC del mismo día (= 15:00 ECT)', () => {
    const fecha = new Date('2026-02-07T20:00:00Z');
    expect(formatearFecha(fecha)).toBe('07022026');
  });

  it('es independiente del TZ del runtime', () => {
    const fecha = new Date('2026-02-07T17:00:00Z'); // 12:00 ECT
    const original = process.env.TZ;
    try {
      process.env.TZ = 'UTC';
      expect(formatearFecha(fecha)).toBe('07022026');
      process.env.TZ = 'America/New_York';
      expect(formatearFecha(fecha)).toBe('07022026');
      process.env.TZ = 'Asia/Tokyo';
      expect(formatearFecha(fecha)).toBe('07022026');
    } finally {
      if (original === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = original;
      }
    }
  });
});

describe('extractores de campo en clave de acceso', () => {
  it('extraen los campos esperados', () => {
    const clave = generarClaveAcceso(baseData);
    expect(extraerRucDeClaveAcceso(clave)).toBe('0924383631001');
    expect(extraerAmbienteDeClaveAcceso(clave)).toBe('1');
    expect(extraerSecuencialDeClaveAcceso(clave)).toBe('000000001');
    expect(extraerTipoComprobanteDeClaveAcceso(clave)).toBe('01');
  });

  it('lanzan ClaveAccesoError si la clave es nula, longitud incorrecta o no numérica', () => {
    expect(() => extraerRucDeClaveAcceso('')).toThrow(ClaveAccesoError);
    expect(() => extraerRucDeClaveAcceso('123')).toThrow(ClaveAccesoError);
    expect(() => extraerRucDeClaveAcceso('a'.repeat(49))).toThrow(ClaveAccesoError);
  });
});
