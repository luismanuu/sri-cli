/**
 * Carga de certificados PKCS#12 (.p12/.pfx) para firma XAdES-BES.
 *
 * Portado de XmlSignerService.loadCertificateFromBuffer/importPrivateKey del
 * repo de referencia (open-api-facturacion-sri): mismo uso de node-forge para
 * abrir el P12 y @peculiar/webcrypto para importar la clave RSA con SHA-1
 * (algoritmo que exige el SRI Ecuador).
 */

import { Crypto } from '@peculiar/webcrypto';
import forge from 'node-forge';
import { CertificadoError } from './errors.js';

/** Instancia WebCrypto compartida (Node no expone RSASSA-PKCS1-v1_5/SHA-1 nativo de forma uniforme). */
export const crypto = new Crypto();

export interface CertificadoCargado {
  /** Clave privada lista para firmar (RSASSA-PKCS1-v1_5 / SHA-1). */
  privateKey: CryptoKey;
  /** Certificado de firma en base64 (DER), tal como lo espera xadesjs en `x509`. */
  certificate: string;
  /** Certificados de la cadena (CA) en base64 (DER), si los hubiera. */
  certificateChain: string[];
}

/**
 * Abre un P12 desde un Buffer y extrae la clave privada y el certificado de firma.
 *
 * Replica la heurística de la referencia: el primer certificado que NO es CA es
 * el de firma; los CA forman la cadena.
 */
export async function loadP12FromBuffer(
  p12Buffer: Buffer,
  password: string,
): Promise<CertificadoCargado> {
  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    const p12Der = forge.util.createBuffer(p12Buffer.toString('binary'));
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
  } catch (err) {
    throw new CertificadoError(
      'No se pudo abrir el P12. Verifica que el archivo y la contraseña sean correctos.',
      undefined,
      err instanceof Error ? err : undefined,
    );
  }

  let forgePrivateKey: forge.pki.rsa.PrivateKey | null = null;
  let signingCert: forge.pki.Certificate | null = null;
  const chainCerts: forge.pki.Certificate[] = [];

  for (const safeContent of p12.safeContents) {
    for (const safeBag of safeContent.safeBags) {
      if (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag && safeBag.key) {
        forgePrivateKey = safeBag.key as forge.pki.rsa.PrivateKey;
      } else if (safeBag.type === forge.pki.oids.certBag && safeBag.cert) {
        const cert = safeBag.cert;
        const isCA =
          cert.extensions?.some(
            (ext) => ext.name === 'basicConstraints' && ext.cA === true,
          ) ?? false;
        if (!isCA) {
          signingCert = cert;
        } else {
          chainCerts.push(cert);
        }
      }
    }
  }

  if (!forgePrivateKey || !signingCert) {
    throw new CertificadoError(
      'No se encontró clave privada o certificado de firma en el archivo P12.',
    );
  }

  const privateKeyPem = forge.pki.privateKeyToPem(forgePrivateKey);
  const privateKey = await importPrivateKey(privateKeyPem);

  const certificate = certToBase64(signingCert);
  const certificateChain = chainCerts.map(certToBase64);

  return { privateKey, certificate, certificateChain };
}

function certToBase64(cert: forge.pki.Certificate): string {
  return forge.util.encode64(
    forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes(),
  );
}

/**
 * Importa una clave privada PEM como CryptoKey RSASSA-PKCS1-v1_5/SHA-1.
 *
 * Intenta PKCS#8 directo; si falla (clave en PKCS#1), la envuelve a PKCS#8 con
 * forge y reintenta — igual que la referencia.
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pkcs8FromPem = (input: string): ArrayBuffer => {
    const b = Buffer.from(
      input
        .replace(/-----BEGIN RSA PRIVATE KEY-----/, '')
        .replace(/-----END RSA PRIVATE KEY-----/, '')
        .replace(/-----BEGIN PRIVATE KEY-----/, '')
        .replace(/-----END PRIVATE KEY-----/, '')
        .replace(/\s/g, ''),
      'base64',
    );
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
  };

  const algorithm = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-1' } as const;

  try {
    return await crypto.subtle.importKey(
      'pkcs8',
      pkcs8FromPem(pem),
      algorithm,
      true,
      ['sign'],
    );
  } catch {
    // Clave en PKCS#1: convertir a PKCS#8 y reintentar.
    const privateKey = forge.pki.privateKeyFromPem(pem);
    const pkcs8Pem = forge.pki.privateKeyInfoToPem(
      forge.pki.wrapRsaPrivateKey(forge.pki.privateKeyToAsn1(privateKey)),
    );
    return crypto.subtle.importKey(
      'pkcs8',
      pkcs8FromPem(pkcs8Pem),
      algorithm,
      true,
      ['sign'],
    );
  }
}
