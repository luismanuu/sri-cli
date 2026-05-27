/**
 * Helpers de prueba: genera un P12 autofirmado en memoria (sin tocar disco)
 * para ejercitar la firma sin un certificado real del SRI.
 */

import forge from 'node-forge';

export interface P12Generado {
  buffer: Buffer;
  password: string;
}

/** Crea un certificado RSA autofirmado y lo empaqueta como P12 protegido por contraseña. */
export function generarP12Autofirmado(password = 'test-password'): P12Generado {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();

  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  const attrs = [
    { name: 'commonName', value: 'SRI CLI Test' },
    { name: 'countryName', value: 'EC' },
    { name: 'organizationName', value: 'SRI CLI' },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  // Sin basicConstraints cA=true: se interpreta como certificado de firma (no CA).
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
    keys.privateKey,
    [cert],
    password,
    { algorithm: '3des' },
  );
  const der = forge.asn1.toDer(p12Asn1).getBytes();

  return { buffer: Buffer.from(der, 'binary'), password };
}

/** Factura mínima de ejemplo (estructura, no contenido real válido del SRI). */
export const FACTURA_XML = `<?xml version="1.0" encoding="UTF-8"?>
<factura id="comprobante" version="1.0.0">
  <infoTributaria>
    <ambiente>1</ambiente>
    <razonSocial>EMPRESA DE PRUEBA</razonSocial>
    <ruc>1790012345001</ruc>
  </infoTributaria>
  <infoFactura>
    <fechaEmision>26/05/2026</fechaEmision>
    <importeTotal>10.00</importeTotal>
  </infoFactura>
</factura>`;
