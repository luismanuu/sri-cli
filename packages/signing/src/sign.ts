/**
 * Firma XAdES-BES de comprobantes electrónicos del SRI Ecuador.
 *
 * Portado de XmlSignerService.signXml del repo de referencia
 * (open-api-facturacion-sri). Se conserva la MISMA librería de firma (xadesjs)
 * y exactamente los mismos algoritmos/nodos que exige el SRI:
 *   - Firma RSA-SHA1, digest SHA-1.
 *   - Referencia enveloped + c14n sobre el comprobante (#comprobante).
 *   - SignedProperties con SigningCertificate + SigningTime y rol "Emisor".
 *
 * Única sustitución frente a la referencia: el DOM de Node se provee con
 * @xmldom/xmldom en vez del paquete `xmldom` (0.6.x), porque éste último está
 * deprecado y sin mantenimiento; @xmldom/xmldom es su sucesor con la misma API
 * y serialización equivalente.
 */

import * as xadesjs from 'xadesjs';
import * as xmlCore from 'xml-core';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { crypto, loadP12FromBuffer } from './p12.js';
import type { CertificadoCargado } from './p12.js';
import { FirmaError } from './errors.js';

let engineReady = false;

/** Registra el DOM y el motor de cripto de Node en xadesjs/xml-core (idempotente). */
function ensureEngine(): void {
  if (engineReady) return;
  xmlCore.setNodeDependencies({ DOMParser, XMLSerializer });
  xadesjs.Application.setEngine('NodeJS', crypto);
  engineReady = true;
}

export interface SignOptions {
  /** Momento de firma para SigningTime. Por defecto, la hora actual. */
  signingTime?: Date;
}

/**
 * Firma un XML ya con un certificado cargado.
 *
 * @param xmlString XML del comprobante (factura, nota de crédito, etc.).
 * @param cert Certificado y clave obtenidos de {@link loadP12FromBuffer}.
 * @returns El XML firmado con el nodo ds:Signature dentro del comprobante.
 */
export async function signXmlConCertificado(
  xmlString: string,
  cert: CertificadoCargado,
  options: SignOptions = {},
): Promise<string> {
  ensureEngine();

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

  const rootElement = xmlDoc.documentElement;
  if (!rootElement) {
    throw new FirmaError('El documento XML no tiene un elemento raíz.');
  }

  if (!rootElement.hasAttribute('id') && !rootElement.hasAttribute('Id')) {
    rootElement.setAttribute('Id', 'comprobante');
  }

  const referenceId =
    rootElement.getAttribute('id') ||
    rootElement.getAttribute('Id') ||
    'comprobante';

  let signatureNode: Node | null;
  try {
    const signedXml = new xadesjs.SignedXml();
    const reference = await signedXml.Sign(
      { name: 'RSA-SHA1' },
      cert.privateKey,
      // xadesjs espera un Document del DOM; el de @xmldom/xmldom es compatible.
      xmlDoc as unknown as Document,
      {
        x509: [cert.certificate],
        references: [
          {
            id: 'Reference-' + referenceId,
            uri: '#' + referenceId,
            hash: 'SHA-1',
            transforms: ['enveloped', 'c14n'],
          },
        ],
        // El SRI exige SigningCertificate (con digest SHA-1) dentro de
        // SignedSignatureProperties para una firma XAdES-BES válida. La
        // referencia no lo emitía (solo pasaba x509 en KeyInfo); aquí se añade
        // explícitamente para cumplir el perfil, sin alterar el resto de nodos.
        signingCertificate: {
          certificate: cert.certificate,
          digestAlgorithm: 'SHA-1',
        },
        signerRole: { claimed: ['Emisor'] },
        signingTime: { value: options.signingTime ?? new Date() },
      },
    );
    signatureNode = reference.GetXml();
  } catch (err) {
    throw new FirmaError(
      'Error al generar la firma XAdES-BES del comprobante.',
      undefined,
      err instanceof Error ? err : undefined,
    );
  }

  if (!signatureNode) {
    throw new FirmaError('Error al generar el XML firmado.');
  }

  rootElement.appendChild(signatureNode as unknown as Node);

  return new XMLSerializer().serializeToString(xmlDoc);
}

/**
 * Carga un P12 y firma el comprobante en un solo paso.
 *
 * @param xmlString XML del comprobante a firmar.
 * @param p12Buffer Contenido del certificado .p12/.pfx.
 * @param password Contraseña del P12.
 * @returns El XML firmado con XAdES-BES.
 */
export async function signFactura(
  xmlString: string,
  p12Buffer: Buffer,
  password: string,
  options: SignOptions = {},
): Promise<string> {
  const cert = await loadP12FromBuffer(p12Buffer, password);
  return signXmlConCertificado(xmlString, cert, options);
}
