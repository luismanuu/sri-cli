import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { openStore } from '../src/store.js';
import { ComprobanteNotFoundError, ComprobanteDuplicadoError } from '../src/errors.js';

const RUC = '1234567890001';
const CA = '4901150011012345678920011001001000000001123456761';

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'sri-storage-test-'));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('ComprobanteStore — save / get', () => {
  it('guarda y recupera un comprobante por clave de acceso', () => {
    const store = openStore(RUC, tmpDir);
    const saved = store.save({
      clave_acceso: CA,
      ruc_emisor: RUC,
      tipo: 'FACTURA',
      estado: 'FIRMADO',
      xml_firmado: '<xml/>',
    });
    expect(saved.created_at).toBeDefined();
    expect(saved.updated_at).toBeDefined();

    const fetched = store.get(CA);
    expect(fetched.estado).toBe('FIRMADO');
    expect(fetched.xml_firmado).toBe('<xml/>');
    expect(fetched.ruc_emisor).toBe(RUC);
    store.close();
  });

  it('lanza ComprobanteNotFoundError si la clave no existe', () => {
    const store = openStore(RUC, tmpDir);
    expect(() => store.get('NO_EXISTE')).toThrow(ComprobanteNotFoundError);
    store.close();
  });

  it('lanza ComprobanteDuplicadoError al guardar una clave ya existente', () => {
    const store = openStore(RUC, tmpDir);
    store.save({ clave_acceso: CA, ruc_emisor: RUC, tipo: 'FACTURA', estado: 'GENERADO' });
    expect(() =>
      store.save({ clave_acceso: CA, ruc_emisor: RUC, tipo: 'FACTURA', estado: 'GENERADO' }),
    ).toThrow(ComprobanteDuplicadoError);
    store.close();
  });

  it('persiste campos opcionales como undefined cuando no se proporcionan', () => {
    const store = openStore(RUC, tmpDir);
    store.save({ clave_acceso: CA, ruc_emisor: RUC, tipo: 'FACTURA', estado: 'GENERADO' });
    const row = store.get(CA);
    expect(row.xml_firmado).toBeNull();
    expect(row.xml_autorizado).toBeNull();
    expect(row.numero_autorizacion).toBeNull();
    store.close();
  });
});

describe('ComprobanteStore — update', () => {
  it('actualiza el estado y xml_autorizado', () => {
    const store = openStore(RUC, tmpDir);
    store.save({ clave_acceso: CA, ruc_emisor: RUC, tipo: 'FACTURA', estado: 'FIRMADO' });
    const updated = store.update(CA, {
      estado: 'AUTORIZADO',
      xml_autorizado: '<autXml/>',
      numero_autorizacion: '9999',
      fecha_autorizacion: '2024-01-15T10:00:00',
    });
    expect(updated.estado).toBe('AUTORIZADO');
    expect(updated.xml_autorizado).toBe('<autXml/>');
    expect(updated.numero_autorizacion).toBe('9999');
    expect(updated.fecha_autorizacion).toBe('2024-01-15T10:00:00');

    const refetched = store.get(CA);
    expect(refetched.estado).toBe('AUTORIZADO');
    store.close();
  });

  it('updated_at cambia tras el update', () => {
    const store = openStore(RUC, tmpDir);
    const saved = store.save({ clave_acceso: CA, ruc_emisor: RUC, tipo: 'FACTURA', estado: 'GENERADO' });
    const updated = store.update(CA, { estado: 'FIRMADO' });
    expect(updated.updated_at >= saved.updated_at).toBe(true);
    store.close();
  });

  it('lanza ComprobanteNotFoundError si la clave no existe', () => {
    const store = openStore(RUC, tmpDir);
    expect(() => store.update('NO_EXISTE', { estado: 'AUTORIZADO' })).toThrow(
      ComprobanteNotFoundError,
    );
    store.close();
  });

  it('conserva campos no incluidos en el update', () => {
    const store = openStore(RUC, tmpDir);
    store.save({
      clave_acceso: CA,
      ruc_emisor: RUC,
      tipo: 'FACTURA',
      estado: 'FIRMADO',
      xml_firmado: '<orig/>',
    });
    const updated = store.update(CA, { estado: 'ENVIADO' });
    expect(updated.xml_firmado).toBe('<orig/>');
    store.close();
  });
});

describe('ComprobanteStore — list', () => {
  it('lista todos los comprobantes sin filtros', () => {
    const store = openStore(RUC, tmpDir);
    store.save({ clave_acceso: 'CA1', ruc_emisor: RUC, tipo: 'FACTURA', estado: 'FIRMADO' });
    store.save({ clave_acceso: 'CA2', ruc_emisor: RUC, tipo: 'NOTA_CREDITO', estado: 'AUTORIZADO' });
    expect(store.list()).toHaveLength(2);
    store.close();
  });

  it('filtra por estado', () => {
    const store = openStore(RUC, tmpDir);
    store.save({ clave_acceso: 'CA1', ruc_emisor: RUC, tipo: 'FACTURA', estado: 'FIRMADO' });
    store.save({ clave_acceso: 'CA2', ruc_emisor: RUC, tipo: 'FACTURA', estado: 'AUTORIZADO' });
    const autorizados = store.list({ estado: 'AUTORIZADO' });
    expect(autorizados).toHaveLength(1);
    expect(autorizados[0]!.clave_acceso).toBe('CA2');
    store.close();
  });

  it('filtra por ruc_emisor', () => {
    const store = openStore(RUC, tmpDir);
    store.save({ clave_acceso: 'CA1', ruc_emisor: RUC, tipo: 'FACTURA', estado: 'FIRMADO' });
    store.save({ clave_acceso: 'CA2', ruc_emisor: 'OTRO_RUC', tipo: 'FACTURA', estado: 'FIRMADO' });
    expect(store.list({ ruc_emisor: RUC })).toHaveLength(1);
    expect(store.list({ ruc_emisor: 'OTRO_RUC' })).toHaveLength(1);
    store.close();
  });

  it('filtra combinando ruc_emisor y estado', () => {
    const store = openStore(RUC, tmpDir);
    store.save({ clave_acceso: 'CA1', ruc_emisor: RUC, tipo: 'FACTURA', estado: 'FIRMADO' });
    store.save({ clave_acceso: 'CA2', ruc_emisor: RUC, tipo: 'FACTURA', estado: 'AUTORIZADO' });
    store.save({ clave_acceso: 'CA3', ruc_emisor: 'OTRO', tipo: 'FACTURA', estado: 'FIRMADO' });
    const result = store.list({ ruc_emisor: RUC, estado: 'FIRMADO' });
    expect(result).toHaveLength(1);
    expect(result[0]!.clave_acceso).toBe('CA1');
    store.close();
  });

  it('retorna lista vacía si no hay comprobantes', () => {
    const store = openStore(RUC, tmpDir);
    expect(store.list()).toEqual([]);
    store.close();
  });
});

describe('multi-emisor — aislamiento por RUC', () => {
  it('cada RUC tiene su propia base de datos', () => {
    const ruc1 = '1111111111001';
    const ruc2 = '2222222222001';
    const store1 = openStore(ruc1, tmpDir);
    const store2 = openStore(ruc2, tmpDir);
    store1.save({ clave_acceso: 'CA1', ruc_emisor: ruc1, tipo: 'FACTURA', estado: 'FIRMADO' });
    expect(store1.list()).toHaveLength(1);
    expect(store2.list()).toHaveLength(0);
    store1.close();
    store2.close();
  });

  it('dos emisores pueden tener la misma clave de acceso sin conflicto', () => {
    const ruc1 = '1111111111001';
    const ruc2 = '2222222222001';
    const store1 = openStore(ruc1, tmpDir);
    const store2 = openStore(ruc2, tmpDir);
    store1.save({ clave_acceso: 'CLAVE_COMPARTIDA', ruc_emisor: ruc1, tipo: 'FACTURA', estado: 'GENERADO' });
    expect(() =>
      store2.save({ clave_acceso: 'CLAVE_COMPARTIDA', ruc_emisor: ruc2, tipo: 'FACTURA', estado: 'GENERADO' }),
    ).not.toThrow();
    store1.close();
    store2.close();
  });
});

describe('schema migration — init', () => {
  it('crea la tabla automáticamente en una DB nueva', () => {
    const store = openStore(RUC, tmpDir);
    expect(store.list()).toEqual([]);
    store.close();
  });

  it('reabre la misma DB sin perder datos', () => {
    const store1 = openStore(RUC, tmpDir);
    store1.save({ clave_acceso: CA, ruc_emisor: RUC, tipo: 'FACTURA', estado: 'GENERADO' });
    store1.close();

    const store2 = openStore(RUC, tmpDir);
    expect(store2.list()).toHaveLength(1);
    expect(store2.get(CA).estado).toBe('GENERADO');
    store2.close();
  });
});
