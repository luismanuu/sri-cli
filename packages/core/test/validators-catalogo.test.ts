import { describe, expect, it } from 'vitest';
import {
  documentosSustento,
  formasPago,
  motivosTraslado,
  retenciones,
  tarifasConImpuesto,
  tiposIdentificacion,
} from '../src/catalogs/index.js';
import {
  inferirTipoRetencion,
  validarDocumentoSustento,
  validarFormaPago,
  validarFormasPago,
  validarMotivoTraslado,
  validarRetencion,
  validarTarifaImpuesto,
  validarTarifasImpuesto,
  validarTipoIdentificacion,
} from '../src/validators/catalogo.js';

describe('validarTarifaImpuesto', () => {
  it('acepta la tarifa IVA 15% (codigo=2, codigoPorcentaje=4)', () => {
    const res = validarTarifaImpuesto('2', '4', tarifasConImpuesto);
    expect(res.valido).toBe(true);
    expect(res.registro?.porcentaje).toBe(15);
  });

  it('rechaza combinación inexistente con mensaje útil', () => {
    const res = validarTarifaImpuesto('99', '99', tarifasConImpuesto);
    expect(res.valido).toBe(false);
    expect(res.error).toContain('99');
  });
});

describe('validarTarifasImpuesto (batch)', () => {
  it('reporta solo los inválidos', () => {
    const res = validarTarifasImpuesto(
      [
        { codigo: '2', codigoPorcentaje: '4' },
        { codigo: '99', codigoPorcentaje: '99' },
      ],
      tarifasConImpuesto,
    );
    expect(res.valido).toBe(false);
    expect(res.errores).toHaveLength(1);
  });

  it('valida lote enteramente válido', () => {
    const res = validarTarifasImpuesto(
      [{ codigo: '2', codigoPorcentaje: '4' }],
      tarifasConImpuesto,
    );
    expect(res.valido).toBe(true);
    expect(res.errores).toHaveLength(0);
  });
});

describe('validarRetencion', () => {
  it('acepta retención RENTA 303 (honorarios profesionales)', () => {
    const res = validarRetencion('RENTA', '303', retenciones);
    expect(res.valido).toBe(true);
  });

  it('rechaza tipo/código fuera de catálogo', () => {
    const res = validarRetencion('RENTA', 'no-existe', retenciones);
    expect(res.valido).toBe(false);
  });
});

describe('validarFormaPago / validarFormasPago', () => {
  it('acepta forma de pago 01 (sin sistema financiero)', () => {
    expect(validarFormaPago('01', formasPago).valido).toBe(true);
  });

  it('rechaza forma de pago inexistente', () => {
    expect(validarFormaPago('99', formasPago).valido).toBe(false);
  });

  it('valida y reporta lotes mixtos', () => {
    const res = validarFormasPago(
      [{ formaPago: '01' }, { formaPago: '99' }],
      formasPago,
    );
    expect(res.valido).toBe(false);
    expect(res.errores).toHaveLength(1);
  });
});

describe('validarTipoIdentificacion', () => {
  it('acepta tipo cédula', () => {
    expect(validarTipoIdentificacion('05', tiposIdentificacion).valido).toBe(true);
  });

  it('rechaza tipo desconocido', () => {
    expect(validarTipoIdentificacion('99', tiposIdentificacion).valido).toBe(false);
  });
});

describe('validarDocumentoSustento', () => {
  it('acepta documento sustento 01 (Factura)', () => {
    expect(validarDocumentoSustento('01', documentosSustento).valido).toBe(true);
  });

  it('rechaza código fuera de catálogo', () => {
    expect(validarDocumentoSustento('99', documentosSustento).valido).toBe(false);
  });
});

describe('validarMotivoTraslado', () => {
  it('acepta motivo "VENTA" (código 01)', () => {
    expect(validarMotivoTraslado('01', motivosTraslado).valido).toBe(true);
  });

  it('rechaza código fuera de catálogo', () => {
    expect(validarMotivoTraslado('99', motivosTraslado).valido).toBe(false);
  });
});

describe('inferirTipoRetencion', () => {
  it('clasifica IVA (códigos 7XX), ISD (45X) y RENTA por defecto', () => {
    expect(inferirTipoRetencion('721')).toBe('IVA');
    expect(inferirTipoRetencion('453')).toBe('ISD');
    expect(inferirTipoRetencion('303')).toBe('RENTA');
  });
});
