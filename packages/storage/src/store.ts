import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type {
  ComprobanteRecord,
  SaveComprobanteInput,
  UpdateComprobanteInput,
  ListFilter,
} from './types.js';
import {
  ComprobanteNotFoundError,
  ComprobanteDuplicadoError,
  StorageError,
} from './errors.js';

const DEFAULT_SRI_HOME = join(homedir(), '.sri-cli');

function resolvedSriHome(sriHome?: string): string {
  return sriHome ?? process.env['SRI_HOME'] ?? DEFAULT_SRI_HOME;
}

function resolveDbPath(ruc: string, sriHome?: string): string {
  const base = resolvedSriHome(sriHome);
  const dir = join(base, ruc);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, 'comprobantes.db');
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS comprobantes (
    clave_acceso        TEXT PRIMARY KEY,
    ruc_emisor          TEXT NOT NULL,
    tipo                TEXT NOT NULL,
    estado              TEXT NOT NULL,
    xml_firmado         TEXT,
    xml_autorizado      TEXT,
    numero_autorizacion TEXT,
    fecha_autorizacion  TEXT,
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_ruc_estado ON comprobantes (ruc_emisor, estado);
`;

export class ComprobanteStore {
  private readonly db: Database.Database;

  constructor(ruc: string, sriHome?: string) {
    try {
      this.db = new Database(resolveDbPath(ruc, sriHome));
      this.db.exec(SCHEMA);
    } catch (e) {
      throw new StorageError('Error al abrir la base de datos', { ruc }, e as Error);
    }
  }

  save(input: SaveComprobanteInput): ComprobanteRecord {
    const now = new Date().toISOString();
    const record: ComprobanteRecord = {
      ...input,
      created_at: now,
      updated_at: now,
    };
    // better-sqlite3 rejects undefined — coerce optional fields to null
    const row = {
      clave_acceso: record.clave_acceso,
      ruc_emisor: record.ruc_emisor,
      tipo: record.tipo,
      estado: record.estado,
      xml_firmado: record.xml_firmado ?? null,
      xml_autorizado: record.xml_autorizado ?? null,
      numero_autorizacion: record.numero_autorizacion ?? null,
      fecha_autorizacion: record.fecha_autorizacion ?? null,
      created_at: record.created_at,
      updated_at: record.updated_at,
    };
    try {
      this.db
        .prepare(
          `INSERT INTO comprobantes
             (clave_acceso, ruc_emisor, tipo, estado, xml_firmado, xml_autorizado,
              numero_autorizacion, fecha_autorizacion, created_at, updated_at)
           VALUES
             (@clave_acceso, @ruc_emisor, @tipo, @estado, @xml_firmado, @xml_autorizado,
              @numero_autorizacion, @fecha_autorizacion, @created_at, @updated_at)`,
        )
        .run(row);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('UNIQUE constraint failed')) {
        throw new ComprobanteDuplicadoError(input.clave_acceso);
      }
      throw new StorageError('Error al guardar comprobante', { clave_acceso: input.clave_acceso }, e as Error);
    }
    return record;
  }

  get(claveAcceso: string): ComprobanteRecord {
    const row = this.db
      .prepare('SELECT * FROM comprobantes WHERE clave_acceso = ?')
      .get(claveAcceso) as ComprobanteRecord | undefined;
    if (!row) throw new ComprobanteNotFoundError(claveAcceso);
    return row;
  }

  update(claveAcceso: string, data: UpdateComprobanteInput): ComprobanteRecord {
    const existing = this.get(claveAcceso);
    const updated: ComprobanteRecord = {
      ...existing,
      ...(data.estado !== undefined && { estado: data.estado }),
      ...(data.xml_firmado !== undefined && { xml_firmado: data.xml_firmado }),
      ...(data.xml_autorizado !== undefined && { xml_autorizado: data.xml_autorizado }),
      ...(data.numero_autorizacion !== undefined && { numero_autorizacion: data.numero_autorizacion }),
      ...(data.fecha_autorizacion !== undefined && { fecha_autorizacion: data.fecha_autorizacion }),
      updated_at: new Date().toISOString(),
    };
    const updateRow = {
      clave_acceso: updated.clave_acceso,
      estado: updated.estado,
      xml_firmado: updated.xml_firmado ?? null,
      xml_autorizado: updated.xml_autorizado ?? null,
      numero_autorizacion: updated.numero_autorizacion ?? null,
      fecha_autorizacion: updated.fecha_autorizacion ?? null,
      updated_at: updated.updated_at,
    };
    this.db
      .prepare(
        `UPDATE comprobantes
         SET estado = @estado, xml_firmado = @xml_firmado, xml_autorizado = @xml_autorizado,
             numero_autorizacion = @numero_autorizacion, fecha_autorizacion = @fecha_autorizacion,
             updated_at = @updated_at
         WHERE clave_acceso = @clave_acceso`,
      )
      .run(updateRow);
    return updated;
  }

  list(filter: ListFilter = {}): ComprobanteRecord[] {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter.ruc_emisor !== undefined) {
      conditions.push('ruc_emisor = ?');
      params.push(filter.ruc_emisor);
    }
    if (filter.estado !== undefined) {
      conditions.push('estado = ?');
      params.push(filter.estado);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const stmt = this.db.prepare(
      `SELECT * FROM comprobantes ${where} ORDER BY created_at DESC`,
    );
    return (params.length > 0 ? stmt.all(...params) : stmt.all()) as ComprobanteRecord[];
  }

  close(): void {
    this.db.close();
  }
}

export function openStore(ruc: string, sriHome?: string): ComprobanteStore {
  return new ComprobanteStore(ruc, sriHome);
}
