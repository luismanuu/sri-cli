import { beforeAll, describe, expect, it } from 'vitest';
import * as xadesjs from 'xadesjs';
import { DOMParser } from '@xmldom/xmldom';
import {
  CertificadoError,
  FirmaError,
  loadP12FromBuffer,
  signFactura,
  signXmlConCertificado,
} from '../src/index.js';
import { SriCliError } from '@sri-cli/core';
import { FACTURA_XML, generarP12Autofirmado } from './helpers.js';

const { buffer: p12Buffer, password } = generarP12Autofirmado();

/** Cuenta apariciones de un nodo por nombre local (cualquier prefijo de espacio de nombres). */
function tieneNodo(xml: string, localName: string): boolean {
  return new RegExp(`<([a-zA-Z]+:)?${localName}[\\s>]`).test(xml);
}

describe('loadP12FromBuffer', () => {
  it('extrae clave privada y certificado de un P12 válido', async () => {
    const cert = await loadP12FromBuffer(p12Buffer, password);
    expect(cert.privateKey).toBeDefined();
    expect(cert.privateKey.type).toBe('private');
    expect(typeof cert.certificate).toBe('string');
    expect(cert.certificate.length).toBeGreaterThan(0);
  });

  it('lanza CertificadoError con contraseña incorrecta', async () => {
    await expect(
      loadP12FromBuffer(p12Buffer, 'contraseña-incorrecta'),
    ).rejects.toBeInstanceOf(CertificadoError);
  });

  it('CertificadoError es un SriCliError con code CERTIFICADO', async () => {
    const err = await loadP12FromBuffer(p12Buffer, 'mala').catch((e) => e);
    expect(err).toBeInstanceOf(SriCliError);
    expect(err.code).toBe('CERTIFICADO');
  });
});

describe('signFactura — estructura XAdES-BES', () => {
  let signed: string;

  beforeAll(async () => {
    signed = await signFactura(FACTURA_XML, p12Buffer, password);
  });

  it('produce los nodos XMLDSig requeridos', () => {
    expect(tieneNodo(signed, 'Signature')).toBe(true);
    expect(tieneNodo(signed, 'SignedInfo')).toBe(true);
    expect(tieneNodo(signed, 'SignatureValue')).toBe(true);
    expect(tieneNodo(signed, 'KeyInfo')).toBe(true);
  });

  it('produce los nodos XAdES-BES requeridos', () => {
    expect(tieneNodo(signed, 'SignedProperties')).toBe(true);
    expect(tieneNodo(signed, 'SigningCertificate')).toBe(true);
    expect(tieneNodo(signed, 'SigningTime')).toBe(true);
  });

  it('usa los algoritmos que exige el SRI (RSA-SHA1 / SHA-1)', () => {
    expect(signed).toContain('rsa-sha1');
    expect(signed).toContain('xmldsig#sha1');
  });

  it('usa transforms enveloped + c14n en la referencia', () => {
    expect(signed).toContain('enveloped-signature');
    expect(signed).toContain('REC-xml-c14n');
  });

  it('mantiene el comprobante original dentro del XML firmado', () => {
    expect(signed).toContain('1790012345001');
    expect(signed).toContain('EMPRESA DE PRUEBA');
  });
});

describe('verificación criptográfica de la firma', () => {
  it('la firma generada verifica correctamente', async () => {
    // signFactura ya configuró el motor DOM/cripto de xadesjs.
    const signed = await signFactura(FACTURA_XML, p12Buffer, password);

    const doc = new DOMParser().parseFromString(signed, 'application/xml');
    const sigNodes = doc.getElementsByTagNameNS(
      'http://www.w3.org/2000/09/xmldsig#',
      'Signature',
    );
    expect(sigNodes.length).toBe(1);

    const signedXml = new xadesjs.SignedXml(doc as unknown as Document);
    signedXml.LoadXml(sigNodes[0] as unknown as Element);
    const ok = await signedXml.Verify();
    expect(ok).toBe(true);
  });
});

describe('opciones de firma', () => {
  it('usa el signingTime indicado en SigningTime', async () => {
    const cert = await loadP12FromBuffer(p12Buffer, password);
    const signingTime = new Date('2026-05-26T12:00:00.000Z');
    const signed = await signXmlConCertificado(FACTURA_XML, cert, {
      signingTime,
    });
    expect(signed).toContain('2026-05-26T12:00:00');
  });

  it('agrega Id="comprobante" si el comprobante no trae id', async () => {
    const cert = await loadP12FromBuffer(p12Buffer, password);
    const sinId = '<?xml version="1.0" encoding="UTF-8"?><factura><a>1</a></factura>';
    const signed = await signXmlConCertificado(sinId, cert);
    expect(signed).toContain('Id="comprobante"');
    expect(signed).toContain('URI="#comprobante"');
  });
});

describe('errores de firma', () => {
  it('lanza FirmaError si el XML no tiene elemento raíz', async () => {
    const cert = await loadP12FromBuffer(p12Buffer, password);
    await expect(signXmlConCertificado('   ', cert)).rejects.toBeInstanceOf(
      FirmaError,
    );
  });
});
