#!/usr/bin/env node
/**
 * Extrae los catálogos SRI desde el init.sql del repo base
 * (open-api-facturacion-sri) y produce los JSON dentro de
 * packages/core/src/catalogs/.
 *
 * Uso:
 *   tsx scripts/extract-catalogs.ts /tmp/sri-base
 *
 * El primer argumento debe apuntar al repo clonado del proyecto base.
 * Si se omite, se asume /tmp/sri-base.
 */

import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_DIR = join(ROOT, 'packages/core/src/catalogs');

interface CatalogSpec {
  table: string;
  outFile: string;
  columns: string[];
}

const CATALOGS: CatalogSpec[] = [
  {
    table: 'catalogo_documentos_sustento',
    outFile: 'documentos-sustento.json',
    columns: ['id', 'codigo', 'descripcion', 'activo', 'created_at'],
  },
  {
    table: 'catalogo_formas_pago',
    outFile: 'formas-pago.json',
    columns: ['id', 'codigo', 'descripcion', 'activo', 'created_at'],
  },
  {
    table: 'catalogo_impuestos',
    outFile: 'impuestos.json',
    columns: ['id', 'codigo', 'nombre', 'descripcion', 'activo', 'created_at', 'updated_at'],
  },
  {
    table: 'catalogo_motivos_traslado',
    outFile: 'motivos-traslado.json',
    columns: ['id', 'codigo', 'descripcion', 'activo', 'created_at'],
  },
  {
    table: 'catalogo_retenciones',
    outFile: 'retenciones.json',
    columns: [
      'id',
      'tipo',
      'codigo',
      'descripcion',
      'porcentaje',
      'vigente_desde',
      'vigente_hasta',
      'activo',
      'created_at',
      'updated_at',
    ],
  },
  {
    table: 'catalogo_tarifas_impuesto',
    outFile: 'tarifas-impuesto.json',
    columns: [
      'id',
      'impuesto_id',
      'codigo_porcentaje',
      'descripcion',
      'porcentaje',
      'vigente_desde',
      'vigente_hasta',
      'activo',
      'created_at',
      'updated_at',
    ],
  },
  {
    table: 'catalogo_tipos_identificacion',
    outFile: 'tipos-identificacion.json',
    columns: ['id', 'codigo', 'descripcion', 'longitud', 'regex_validacion', 'activo', 'created_at'],
  },
];

/**
 * Parsea la lista de valores de un VALUES (...) de Postgres.
 * Maneja strings con comillas simples escapadas ('') y NULL literal.
 */
function parseValuesList(raw: string): unknown[] {
  const values: unknown[] = [];
  let i = 0;
  const n = raw.length;
  while (i < n) {
    while (i < n && /\s/.test(raw[i]!)) i++;
    if (i >= n) break;
    const ch = raw[i]!;
    if (ch === "'") {
      let s = '';
      i++;
      while (i < n) {
        if (raw[i] === "'" && raw[i + 1] === "'") {
          s += "'";
          i += 2;
          continue;
        }
        if (raw[i] === "'") {
          i++;
          break;
        }
        s += raw[i++];
      }
      values.push(s);
    } else {
      let s = '';
      while (i < n && raw[i] !== ',') s += raw[i++];
      const trimmed = s.trim();
      if (trimmed.toUpperCase() === 'NULL') values.push(null);
      else if (trimmed.toUpperCase() === 'TRUE') values.push(true);
      else if (trimmed.toUpperCase() === 'FALSE') values.push(false);
      else if (/^-?\d+(\.\d+)?$/.test(trimmed)) values.push(Number(trimmed));
      else values.push(trimmed);
    }
    while (i < n && /\s/.test(raw[i]!)) i++;
    if (raw[i] === ',') i++;
  }
  return values;
}

function extractRowsFor(sql: string, table: string, columns: string[]): Record<string, unknown>[] {
  const pattern = new RegExp(
    `INSERT INTO public\\.${table}\\s+VALUES\\s*\\(([\\s\\S]*?)\\);`,
    'g',
  );
  const rows: Record<string, unknown>[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sql)) !== null) {
    const valuesRaw = match[1]!;
    const values = parseValuesList(valuesRaw);
    const row: Record<string, unknown> = {};
    columns.forEach((col, idx) => {
      row[col] = values[idx] ?? null;
    });
    rows.push(row);
  }
  return rows;
}

function getSourceCommit(baseRepoPath: string): string {
  try {
    return execSync('git rev-parse HEAD', { cwd: baseRepoPath, encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

function main(): void {
  const baseRepoPath = process.argv[2] ?? '/tmp/sri-base';
  const initSqlPath = join(baseRepoPath, 'database/init.sql');
  const sql = readFileSync(initSqlPath, 'utf-8');

  mkdirSync(OUT_DIR, { recursive: true });

  const totals: Record<string, number> = {};
  for (const cat of CATALOGS) {
    const rows = extractRowsFor(sql, cat.table, cat.columns);
    const outPath = join(OUT_DIR, cat.outFile);
    writeFileSync(outPath, JSON.stringify(rows, null, 2) + '\n', 'utf-8');
    totals[cat.outFile] = rows.length;
    console.log(`  ${cat.outFile.padEnd(28)} ${rows.length} filas`);
  }

  const meta = {
    extracted_at: new Date().toISOString(),
    source_repo: 'https://github.com/AngeloBarzolaVillamar/open-api-facturacion-sri',
    source_commit: getSourceCommit(baseRepoPath),
    total_records: Object.values(totals).reduce((s, n) => s + n, 0),
    counts: totals,
  };
  writeFileSync(join(OUT_DIR, '_meta.json'), JSON.stringify(meta, null, 2) + '\n', 'utf-8');
  console.log(`\n  _meta.json -> commit ${meta.source_commit.substring(0, 7)}, ${meta.total_records} registros totales`);
}

main();
