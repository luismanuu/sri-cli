/**
 * Tipos de comprobantes electrónicos del SRI Ecuador.
 */
export enum TipoComprobante {
  FACTURA = '01',
  NOTA_VENTA = '02',
  LIQUIDACION_COMPRA = '03',
  NOTA_CREDITO = '04',
  NOTA_DEBITO = '05',
  GUIA_REMISION = '06',
  COMPROBANTE_RETENCION = '07',
}

/**
 * Ambientes del SRI.
 */
export enum Ambiente {
  PRUEBAS = '1',
  PRODUCCION = '2',
}

/**
 * Tipos de emisión.
 */
export enum TipoEmision {
  NORMAL = '1',
  CONTINGENCIA = '2',
}

/**
 * Tipos de identificación del comprador.
 */
export enum TipoIdentificacion {
  RUC = '04',
  CEDULA = '05',
  PASAPORTE = '06',
  CONSUMIDOR_FINAL = '07',
  IDENTIFICACION_EXTERIOR = '08',
  PLACA = '09',
}

/**
 * Códigos de impuesto.
 */
export enum CodigoImpuesto {
  IVA = '2',
  ICE = '3',
  IRBPNR = '5',
}

/**
 * Códigos de porcentaje IVA.
 */
export enum CodigoPorcentajeIva {
  IVA_0 = '0',
  IVA_12 = '2',
  IVA_14 = '3',
  IVA_NO_OBJETO = '6',
  IVA_EXENTO = '7',
  IVA_15 = '4',
}

/**
 * Formas de pago.
 */
export enum FormaPago {
  SIN_UTILIZACION_SISTEMA_FINANCIERO = '01',
  COMPENSACION_DEUDAS = '15',
  TARJETA_DEBITO = '16',
  DINERO_ELECTRONICO = '17',
  TARJETA_PREPAGO = '18',
  TARJETA_CREDITO = '19',
  OTROS_CON_SISTEMA_FINANCIERO = '20',
  ENDOSO_TITULOS = '21',
}

/**
 * Versiones de los esquemas XSD del SRI.
 */
export const VERSIONES = {
  FACTURA: '1.1.0',
  NOTA_CREDITO: '1.1.0',
  NOTA_DEBITO: '1.0.0',
  COMPROBANTE_RETENCION: '2.0.0',
  GUIA_REMISION: '1.1.0',
} as const;

/**
 * Descripciones legibles de los tipos de comprobante.
 */
export const TIPO_COMPROBANTE_DESCRIPCIONES: Record<string, string> = {
  '01': 'Factura',
  '04': 'Nota de Crédito',
  '05': 'Nota de Débito',
  '06': 'Guía de Remisión',
  '07': 'Comprobante de Retención',
};
