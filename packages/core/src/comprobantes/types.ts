import type { Ambiente, FormaPago, TipoComprobante, TipoEmision, TipoIdentificacion } from '../types/enums.js';

/**
 * Información tributaria común a todos los comprobantes electrónicos.
 */
export interface InfoTributaria {
  ambiente: Ambiente;
  tipoEmision: TipoEmision;
  razonSocial: string;
  nombreComercial?: string;
  ruc: string;
  claveAcceso?: string;
  codDoc: TipoComprobante | string;
  estab: string;
  ptoEmi: string;
  secuencial: string;
  dirMatriz: string;
  agenteRetencion?: string;
  contribuyenteRimpe?: 'CONTRIBUYENTE RÉGIMEN RIMPE';
}

export interface ImpuestoDetalle {
  codigo: string;
  codigoPorcentaje: string;
  tarifa: number;
  baseImponible: number;
  valor: number;
}

export interface TotalImpuesto {
  codigo: string;
  codigoPorcentaje: string;
  descuentoAdicional?: number;
  baseImponible: number;
  tarifa?: number;
  valor: number;
  valorDevolucionIva?: number;
}

export interface DetalleAdicional {
  nombre: string;
  valor: string;
}

export interface CampoAdicional {
  nombre: string;
  valor: string;
}

export interface DetalleFactura {
  codigoPrincipal: string;
  codigoAuxiliar?: string;
  descripcion: string;
  unidadMedida?: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  precioTotalSinImpuesto: number;
  detallesAdicionales?: DetalleAdicional[];
  impuestos: ImpuestoDetalle[];
}

export interface Pago {
  formaPago: FormaPago | string;
  total: number;
  plazo?: number;
  unidadTiempo?: 'dias' | 'meses' | 'años';
}

export interface InfoFactura {
  fechaEmision: string;
  dirEstablecimiento?: string;
  contribuyenteEspecial?: string;
  obligadoContabilidad: 'SI' | 'NO';
  tipoIdentificacionComprador: TipoIdentificacion | string;
  guiaRemision?: string;
  razonSocialComprador: string;
  identificacionComprador: string;
  direccionComprador?: string;
  totalSinImpuestos: number;
  totalDescuento: number;
  totalConImpuestos: TotalImpuesto[];
  propina?: number;
  importeTotal: number;
  moneda?: string;
  pagos: Pago[];
}

export interface RetencionFactura {
  codigo: string;
  codigoPorcentaje: string;
  tarifa: number;
  valor: number;
}

export interface Factura {
  infoTributaria: InfoTributaria;
  infoFactura: InfoFactura;
  detalles: DetalleFactura[];
  infoAdicional?: CampoAdicional[];
  retenciones?: RetencionFactura[];
}

// ===== Nota de Crédito =====

export interface InfoNotaCredito {
  fechaEmision: string;
  dirEstablecimiento?: string;
  tipoIdentificacionComprador: TipoIdentificacion | string;
  razonSocialComprador: string;
  identificacionComprador: string;
  contribuyenteEspecial?: string;
  obligadoContabilidad: 'SI' | 'NO';
  rise?: string;
  codDocModificado: string;
  numDocModificado: string;
  fechaEmisionDocSustento: string;
  totalSinImpuestos: number;
  valorModificacion: number;
  moneda?: string;
  totalConImpuestos: TotalImpuesto[];
  motivo: string;
}

export interface DetalleNotaCredito {
  codigoInterno: string;
  codigoAdicional?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  precioTotalSinImpuesto: number;
  detallesAdicionales?: DetalleAdicional[];
  impuestos: ImpuestoDetalle[];
}

export interface NotaCredito {
  infoTributaria: InfoTributaria;
  infoNotaCredito: InfoNotaCredito;
  detalles: DetalleNotaCredito[];
  infoAdicional?: CampoAdicional[];
}

// ===== Nota de Débito =====

export interface InfoNotaDebito {
  fechaEmision: string;
  dirEstablecimiento?: string;
  tipoIdentificacionComprador: TipoIdentificacion | string;
  razonSocialComprador: string;
  identificacionComprador: string;
  contribuyenteEspecial?: string;
  obligadoContabilidad: 'SI' | 'NO';
  rise?: string;
  codDocModificado: string;
  numDocModificado: string;
  fechaEmisionDocSustento: string;
  totalSinImpuestos: number;
  impuestos: TotalImpuesto[];
  valorTotal: number;
}

export interface MotivoNotaDebito {
  razon: string;
  valor: number;
}

export interface NotaDebito {
  infoTributaria: InfoTributaria;
  infoNotaDebito: InfoNotaDebito;
  motivos: MotivoNotaDebito[];
  infoAdicional?: CampoAdicional[];
}

// ===== Comprobante de Retención v2.0.0 =====

export interface InfoRetencion {
  fechaEmision: string;
  dirEstablecimiento?: string;
  contribuyenteEspecial?: string;
  obligadoContabilidad: 'SI' | 'NO';
  tipoIdentificacionSujetoRetenido: TipoIdentificacion | string;
  tipoSujetoRetenido?: '01' | '02';
  parteRel?: 'SI' | 'NO';
  razonSocialSujetoRetenido: string;
  identificacionSujetoRetenido: string;
  periodoFiscal: string;
}

export interface ImpuestoDocSustento {
  codImpuestoDocSustento: string;
  codigoPorcentaje: string;
  baseImponible: number;
  tarifa: number;
  valorImpuesto: number;
}

export interface ImpuestoRetenido {
  codigo: string;
  codigoRetencion: string;
  baseImponible: number;
  porcentajeRetener: number;
  valorRetenido: number;
  codDocSustento: string;
  codSustento?: string;
  numDocSustento: string;
  fechaEmisionDocSustento: string;
  totalSinImpuestos: number;
  importeTotal: number;
  pagoLocExt?: '01' | '02';
  formaPago?: string;
  impuestosDocSustento: ImpuestoDocSustento[];
}

export interface Retencion {
  infoTributaria: InfoTributaria;
  infoCompRetencion: InfoRetencion;
  impuestos: ImpuestoRetenido[];
  infoAdicional?: CampoAdicional[];
}

// ===== Guía de Remisión =====

export interface InfoGuiaRemision {
  dirEstablecimiento?: string;
  dirPartida: string;
  razonSocialTransportista: string;
  tipoIdentificacionTransportista: TipoIdentificacion | string;
  rucTransportista: string;
  rise?: string;
  obligadoContabilidad: 'SI' | 'NO';
  contribuyenteEspecial?: string;
  fechaIniTransporte: string;
  fechaFinTransporte: string;
  placa: string;
}

export interface DetalleGuiaRemision {
  codigoInterno: string;
  codigoAdicional?: string;
  descripcion: string;
  cantidad: number;
  detallesAdicionales?: DetalleAdicional[];
}

export interface DestinatarioGuiaRemision {
  tipoIdentificacionDestinatario: string;
  identificacionDestinatario: string;
  razonSocialDestinatario: string;
  dirDestinatario: string;
  emailDestinatario?: string;
  motivoTraslado: string;
  docAduaneroUnico?: string;
  codEstabDestino?: string;
  ruta?: string;
  codDocSustento?: string;
  numDocSustento?: string;
  numAutDocSustento?: string;
  fechaEmisionDocSustento?: string;
  detalles: DetalleGuiaRemision[];
}

export interface GuiaRemision {
  infoTributaria: InfoTributaria;
  infoGuiaRemision: InfoGuiaRemision;
  destinatarios: DestinatarioGuiaRemision[];
  infoAdicional?: CampoAdicional[];
}
