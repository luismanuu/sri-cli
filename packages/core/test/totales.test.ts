import { describe, expect, it } from 'vitest';
import { calcularTotales } from '../src/comprobantes/totales.js';
import type { DetalleFactura } from '../src/comprobantes/types.js';

/**
 * Estos tests están portados desde factura-totales.spec.ts del repo base
 * (open-api-facturacion-sri), adaptados a la función pura calcularTotales.
 */

function detalle(opts: {
  precio: number;
  descuento?: number;
  baseImponible: number;
  valor: number;
  codigoPorcentaje?: string;
  tarifa?: number;
}): DetalleFactura {
  return {
    codigoPrincipal: 'X',
    descripcion: 'X',
    cantidad: 1,
    precioUnitario: opts.precio,
    descuento: opts.descuento ?? 0,
    precioTotalSinImpuesto: opts.precio,
    impuestos: [
      {
        codigo: '2',
        codigoPorcentaje: opts.codigoPorcentaje ?? '4',
        tarifa: opts.tarifa ?? 15,
        baseImponible: opts.baseImponible,
        valor: opts.valor,
      },
    ],
  };
}

describe('calcularTotales', () => {
  it('suma totales sin pérdida de precisión IEEE 754', () => {
    const detalles = [
      detalle({ precio: 0.1, baseImponible: 0.1, valor: 0.015 }),
      detalle({ precio: 0.2, baseImponible: 0.2, valor: 0.03 }),
    ];
    const result = calcularTotales(detalles);
    expect(result.totalSinImpuestos).toBe(0.3);
    expect(result.totalDescuento).toBe(0);
  });

  it('acumula impuestos por código correctamente', () => {
    const detalles = [
      detalle({ precio: 10, baseImponible: 10, valor: 1.5 }),
      detalle({ precio: 20, baseImponible: 20, valor: 3.0 }),
    ];
    const result = calcularTotales(detalles);
    expect(result.totalSinImpuestos).toBe(30);
    expect(result.totalConImpuestos).toHaveLength(1);
    expect(result.totalConImpuestos[0]!.baseImponible).toBe(30);
    expect(result.totalConImpuestos[0]!.valor).toBe(4.5);
    expect(result.importeTotal).toBe(34.5);
  });

  it('separa múltiples tarifas de impuesto', () => {
    const detalles = [
      detalle({ precio: 100, baseImponible: 100, valor: 15 }),
      detalle({
        precio: 50,
        baseImponible: 50,
        valor: 0,
        codigoPorcentaje: '0',
        tarifa: 0,
      }),
    ];
    const result = calcularTotales(detalles);
    expect(result.totalSinImpuestos).toBe(150);
    expect(result.totalConImpuestos).toHaveLength(2);
    expect(result.importeTotal).toBe(165);
  });

  it('redondea importeTotal a 2 decimales', () => {
    const detalles = [
      detalle({ precio: 0.17, baseImponible: 0.17, valor: 0.03 }),
      detalle({ precio: 0.19, baseImponible: 0.19, valor: 0.03 }),
    ];
    const result = calcularTotales(detalles);
    expect(result.totalSinImpuestos).toBe(0.36);
    expect(result.totalConImpuestos[0]!.valor).toBe(0.06);
    expect(result.importeTotal).toBe(0.42);
  });

  it('acumula descuentos correctamente', () => {
    const detalles = [
      detalle({ precio: 8, descuento: 2, baseImponible: 8, valor: 1.2 }),
      detalle({ precio: 15, descuento: 5, baseImponible: 15, valor: 2.25 }),
    ];
    const result = calcularTotales(detalles);
    expect(result.totalDescuento).toBe(7);
    expect(result.totalSinImpuestos).toBe(23);
    expect(result.importeTotal).toBe(26.45);
  });

  it('maneja un único detalle con IVA 0%', () => {
    const detalles = [
      detalle({
        precio: 100,
        baseImponible: 100,
        valor: 0,
        codigoPorcentaje: '0',
        tarifa: 0,
      }),
    ];
    const result = calcularTotales(detalles);
    expect(result.totalSinImpuestos).toBe(100);
    expect(result.importeTotal).toBe(100);
  });
});
