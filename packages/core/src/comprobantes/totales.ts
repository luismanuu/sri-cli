/**
 * Cálculo de totales fiscales con Decimal.js para evitar el drift IEEE 754.
 *
 * El SRI valida los totales con redondeo bancario a 2 decimales, por lo
 * tanto cualquier acumulación debe hacerse con tipo Decimal y recién
 * convertirse a number al final con `toDecimalPlaces(2).toNumber()`.
 */

import { Decimal } from 'decimal.js';
import type { DetalleFactura, TotalImpuesto } from './types.js';

export interface TotalesCalculados {
  totalSinImpuestos: number;
  totalDescuento: number;
  totalConImpuestos: TotalImpuesto[];
  importeTotal: number;
}

export function calcularTotales(detalles: DetalleFactura[]): TotalesCalculados {
  let totalSinImpuestos = new Decimal(0);
  let totalDescuento = new Decimal(0);

  const impuestosMap = new Map<
    string,
    {
      codigo: string;
      codigoPorcentaje: string;
      tarifa: number;
      baseImponible: Decimal;
      valor: Decimal;
    }
  >();

  for (const detalle of detalles) {
    totalSinImpuestos = totalSinImpuestos.plus(new Decimal(detalle.precioTotalSinImpuesto));
    totalDescuento = totalDescuento.plus(new Decimal(detalle.descuento));

    for (const imp of detalle.impuestos) {
      const key = `${imp.codigo}-${imp.codigoPorcentaje}`;
      const existing = impuestosMap.get(key);
      if (existing) {
        existing.baseImponible = existing.baseImponible.plus(new Decimal(imp.baseImponible));
        existing.valor = existing.valor.plus(new Decimal(imp.valor));
      } else {
        impuestosMap.set(key, {
          codigo: imp.codigo,
          codigoPorcentaje: imp.codigoPorcentaje,
          tarifa: imp.tarifa,
          baseImponible: new Decimal(imp.baseImponible),
          valor: new Decimal(imp.valor),
        });
      }
    }
  }

  const totalConImpuestos: TotalImpuesto[] = Array.from(impuestosMap.values()).map((imp) => ({
    codigo: imp.codigo,
    codigoPorcentaje: imp.codigoPorcentaje,
    tarifa: imp.tarifa,
    baseImponible: imp.baseImponible.toDecimalPlaces(2).toNumber(),
    valor: imp.valor.toDecimalPlaces(2).toNumber(),
  }));

  // El SRI valida que importeTotal == totalSinImpuestos + Σvalor sobre los
  // valores DISPLAY (los que aparecen en el XML). Por eso sumamos los
  // campos ya redondeados a 2 decimales en Decimal y, recién entonces,
  // convertimos a number. De lo contrario, mezclar el acumulador unrounded
  // de totalSinImpuestos con la suma de valores rounded puede romper la
  // identidad por 1-2 centavos en facturas con muchas líneas o tarifas.
  const totalSinImpuestosFinal = totalSinImpuestos.toDecimalPlaces(2);
  const totalImpuestos = totalConImpuestos.reduce(
    (sum, imp) => sum.plus(new Decimal(imp.valor)),
    new Decimal(0),
  );
  const importeTotal = totalSinImpuestosFinal.plus(totalImpuestos);

  return {
    totalSinImpuestos: totalSinImpuestosFinal.toNumber(),
    totalDescuento: totalDescuento.toDecimalPlaces(2).toNumber(),
    totalConImpuestos,
    importeTotal: importeTotal.toNumber(),
  };
}
