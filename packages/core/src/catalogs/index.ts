/**
 * Loader tipado de los catálogos SRI extraídos del repo base
 * (open-api-facturacion-sri) en compilación. Ver scripts/extract-catalogs.ts.
 *
 * Los JSON se incluyen como assets del paquete (ver package.json#files) y
 * se importan vía `with { type: 'json' }` para mantener ESM puro.
 */

import documentosSustentoData from './documentos-sustento.json' with { type: 'json' };
import formasPagoData from './formas-pago.json' with { type: 'json' };
import impuestosData from './impuestos.json' with { type: 'json' };
import motivosTrasladoData from './motivos-traslado.json' with { type: 'json' };
import retencionesData from './retenciones.json' with { type: 'json' };
import tarifasImpuestoData from './tarifas-impuesto.json' with { type: 'json' };
import tiposIdentificacionData from './tipos-identificacion.json' with { type: 'json' };
import metaData from './_meta.json' with { type: 'json' };

export interface DocumentoSustentoCatalogo {
  codigo: string;
  descripcion: string;
}

export interface FormaPagoCatalogo {
  codigo: string;
  descripcion: string;
}

export interface ImpuestoCatalogo {
  codigo: string;
  nombre: string;
  descripcion: string | null;
}

export interface MotivoTrasladoCatalogo {
  codigo: string;
  descripcion: string;
}

export interface RetencionCatalogo {
  tipo: string;
  codigo: string;
  descripcion: string;
  porcentaje: number;
  vigente_desde: string | null;
  vigente_hasta: string | null;
}

export interface TarifaImpuestoCatalogo {
  impuesto_id: string;
  codigo_porcentaje: string;
  descripcion: string;
  porcentaje: number;
  vigente_desde: string | null;
  vigente_hasta: string | null;
}

export interface TipoIdentificacionCatalogo {
  codigo: string;
  descripcion: string;
  longitud: number | null;
  regex_validacion: string | null;
}

export interface CatalogosMeta {
  extracted_at: string;
  source_repo: string;
  source_commit: string;
  total_records: number;
  counts: Record<string, number>;
}

type Row = Record<string, unknown>;

function pick<T extends object>(rows: Row[], keys: (keyof T)[]): T[] {
  return rows.map((row) => {
    const out: Partial<T> = {};
    for (const key of keys) {
      out[key] = row[key as string] as T[keyof T];
    }
    return out as T;
  });
}

export const documentosSustento: readonly DocumentoSustentoCatalogo[] = pick<DocumentoSustentoCatalogo>(
  documentosSustentoData as Row[],
  ['codigo', 'descripcion'],
);

export const formasPago: readonly FormaPagoCatalogo[] = pick<FormaPagoCatalogo>(
  formasPagoData as Row[],
  ['codigo', 'descripcion'],
);

export const impuestos: readonly ImpuestoCatalogo[] = pick<ImpuestoCatalogo>(
  impuestosData as Row[],
  ['codigo', 'nombre', 'descripcion'],
);

export const motivosTraslado: readonly MotivoTrasladoCatalogo[] = pick<MotivoTrasladoCatalogo>(
  motivosTrasladoData as Row[],
  ['codigo', 'descripcion'],
);

export const retenciones: readonly RetencionCatalogo[] = pick<RetencionCatalogo>(
  retencionesData as Row[],
  ['tipo', 'codigo', 'descripcion', 'porcentaje', 'vigente_desde', 'vigente_hasta'],
);

export const tarifasImpuesto: readonly TarifaImpuestoCatalogo[] = pick<TarifaImpuestoCatalogo>(
  tarifasImpuestoData as Row[],
  ['impuesto_id', 'codigo_porcentaje', 'descripcion', 'porcentaje', 'vigente_desde', 'vigente_hasta'],
);

export const tiposIdentificacion: readonly TipoIdentificacionCatalogo[] = pick<TipoIdentificacionCatalogo>(
  tiposIdentificacionData as Row[],
  ['codigo', 'descripcion', 'longitud', 'regex_validacion'],
);

export const meta: CatalogosMeta = metaData as CatalogosMeta;

/**
 * Tarifa de impuesto enriquecida con el código del impuesto padre.
 * Útil para validar contra la combinación (codigoImpuesto, codigoPorcentaje).
 */
export interface TarifaConImpuesto extends TarifaImpuestoCatalogo {
  impuesto_codigo: string;
  impuesto_nombre: string;
}

export const tarifasConImpuesto: readonly TarifaConImpuesto[] = tarifasImpuesto
  .map((t) => {
    const padre = (impuestosData as Row[]).find((r) => r.id === t.impuesto_id);
    if (!padre) return null;
    return {
      ...t,
      impuesto_codigo: padre.codigo as string,
      impuesto_nombre: padre.nombre as string,
    };
  })
  .filter((t): t is TarifaConImpuesto => t !== null);
