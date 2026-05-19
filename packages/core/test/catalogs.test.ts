import { describe, expect, it } from 'vitest';
import {
  documentosSustento,
  formasPago,
  impuestos,
  meta,
  motivosTraslado,
  retenciones,
  tarifasConImpuesto,
  tarifasImpuesto,
  tiposIdentificacion,
} from '../src/catalogs/index.js';

describe('catalogs (loader)', () => {
  it('expone los 7 catálogos con al menos 1 registro cada uno', () => {
    expect(documentosSustento.length).toBeGreaterThan(0);
    expect(formasPago.length).toBeGreaterThan(0);
    expect(impuestos.length).toBeGreaterThan(0);
    expect(motivosTraslado.length).toBeGreaterThan(0);
    expect(retenciones.length).toBeGreaterThan(0);
    expect(tarifasImpuesto.length).toBeGreaterThan(0);
    expect(tiposIdentificacion.length).toBeGreaterThan(0);
  });

  it('el meta declara source_commit y total_records consistentes', () => {
    expect(meta.source_commit).toMatch(/^[0-9a-f]{40}$/);
    const suma =
      documentosSustento.length +
      formasPago.length +
      impuestos.length +
      motivosTraslado.length +
      retenciones.length +
      tarifasImpuesto.length +
      tiposIdentificacion.length;
    expect(meta.total_records).toBe(suma);
  });

  it('formas de pago contiene los códigos canónicos del SRI', () => {
    const codigos = formasPago.map((f) => f.codigo);
    expect(codigos).toContain('01');
    expect(codigos).toContain('19');
  });

  it('impuestos incluye IVA con código "2"', () => {
    const iva = impuestos.find((i) => i.codigo === '2');
    expect(iva).toBeDefined();
    expect(iva!.nombre).toBe('IVA');
  });

  it('tarifasConImpuesto cruza correctamente impuesto_id con impuestos.id', () => {
    const tarifaIva15 = tarifasConImpuesto.find(
      (t) => t.impuesto_codigo === '2' && t.codigo_porcentaje === '4',
    );
    expect(tarifaIva15).toBeDefined();
    expect(tarifaIva15!.porcentaje).toBe(15);
    expect(tarifaIva15!.impuesto_nombre).toBe('IVA');
  });

  it('tipos_identificacion preserva el regex_validacion sin perder el backslash', () => {
    const ruc = tiposIdentificacion.find((t) => t.codigo === '04');
    expect(ruc?.regex_validacion).toBe('^\\d{13}$');
  });
});
