export type EstadoComprobante =
  | 'GENERADO'
  | 'FIRMADO'
  | 'ENVIADO'
  | 'AUTORIZADO'
  | 'RECHAZADO';

export interface ComprobanteRecord {
  clave_acceso: string;
  ruc_emisor: string;
  tipo: string;
  estado: EstadoComprobante;
  xml_firmado?: string;
  xml_autorizado?: string;
  numero_autorizacion?: string;
  fecha_autorizacion?: string;
  created_at: string;
  updated_at: string;
}

export interface SaveComprobanteInput {
  clave_acceso: string;
  ruc_emisor: string;
  tipo: string;
  estado: EstadoComprobante;
  xml_firmado?: string;
  xml_autorizado?: string;
  numero_autorizacion?: string;
  fecha_autorizacion?: string;
}

export interface UpdateComprobanteInput {
  estado?: EstadoComprobante;
  xml_firmado?: string;
  xml_autorizado?: string;
  numero_autorizacion?: string;
  fecha_autorizacion?: string;
}

export interface ListFilter {
  ruc_emisor?: string;
  estado?: EstadoComprobante;
}
