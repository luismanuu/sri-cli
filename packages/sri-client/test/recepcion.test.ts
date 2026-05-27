import { describe, expect, it } from 'vitest';
import { SriCliError } from '@sri-cli/core';
import {
  WSDL_URLS,
  enviarComprobante,
  SriTransporteError,
} from '../src/index.js';
import { clienteFake, crearClienteQueFalla } from './helpers.js';

const XML_FIRMADO = '<factura id="comprobante">…</factura>';

describe('enviarComprobante (recepción)', () => {
  it('envía el XML en base64 a la operación validarComprobante del WSDL correcto', async () => {
    const { crearCliente, llamadas } = clienteFake({
      RespuestaRecepcionComprobante: { estado: 'RECIBIDA' },
    });

    await enviarComprobante(XML_FIRMADO, '1', { crearCliente });

    expect(llamadas).toHaveLength(1);
    expect(llamadas[0].wsdlUrl).toBe(WSDL_URLS.recepcion['1']);
    expect(llamadas[0].args).toEqual({
      xml: Buffer.from(XML_FIRMADO, 'utf-8').toString('base64'),
    });
  });

  it('usa el endpoint de producción para ambiente 2', async () => {
    const { crearCliente, llamadas } = clienteFake({
      RespuestaRecepcionComprobante: { estado: 'RECIBIDA' },
    });

    await enviarComprobante(XML_FIRMADO, '2', { crearCliente });

    expect(llamadas[0].wsdlUrl).toBe(WSDL_URLS.recepcion['2']);
  });

  it('mapea estado RECIBIDA', async () => {
    const { crearCliente } = clienteFake({
      RespuestaRecepcionComprobante: { estado: 'RECIBIDA' },
    });

    const res = await enviarComprobante(XML_FIRMADO, '1', { crearCliente });

    expect(res.estado).toBe('RECIBIDA');
    expect(res.mensajes).toEqual([]);
  });

  it('mapea estado DEVUELTA y no oculta los mensajes de rechazo del SRI', async () => {
    const { crearCliente } = clienteFake({
      RespuestaRecepcionComprobante: {
        estado: 'DEVUELTA',
        comprobantes: {
          comprobante: {
            claveAcceso: '1'.repeat(49),
            mensajes: {
              mensaje: {
                identificador: '45',
                mensaje: 'Error en estructura de comprobante',
                informacionAdicional: 'Falta el campo razonSocial',
                tipo: 'ERROR',
              },
            },
          },
        },
      },
    });

    const res = await enviarComprobante(XML_FIRMADO, '1', { crearCliente });

    expect(res.estado).toBe('DEVUELTA');
    expect(res.mensajes).toEqual([
      {
        identificador: '45',
        mensaje: 'Error en estructura de comprobante',
        informacionAdicional: 'Falta el campo razonSocial',
        tipo: 'ERROR',
      },
    ]);
  });

  it('aplana mensajes de múltiples comprobantes (arreglos)', async () => {
    const { crearCliente } = clienteFake({
      RespuestaRecepcionComprobante: {
        estado: 'DEVUELTA',
        comprobantes: {
          comprobante: [
            {
              claveAcceso: 'a',
              mensajes: {
                mensaje: [
                  { identificador: '1', mensaje: 'uno', tipo: 'ERROR' },
                  { identificador: '2', mensaje: 'dos', tipo: 'ERROR' },
                ],
              },
            },
            {
              claveAcceso: 'b',
              mensajes: { mensaje: { identificador: '3', mensaje: 'tres', tipo: 'ERROR' } },
            },
          ],
        },
      },
    });

    const res = await enviarComprobante(XML_FIRMADO, '1', { crearCliente });

    expect(res.mensajes.map((m) => m.identificador)).toEqual(['1', '2', '3']);
  });

  it('acepta la respuesta sin el envoltorio RespuestaRecepcionComprobante', async () => {
    const { crearCliente } = clienteFake({ estado: 'RECIBIDA' });

    const res = await enviarComprobante(XML_FIRMADO, '1', { crearCliente });

    expect(res.estado).toBe('RECIBIDA');
  });

  it('lanza SriTransporteError ante un fallo de red', async () => {
    const err = await enviarComprobante(XML_FIRMADO, '1', {
      crearCliente: crearClienteQueFalla,
    }).catch((e) => e);

    expect(err).toBeInstanceOf(SriTransporteError);
    expect(err).toBeInstanceOf(SriCliError);
    expect(err.code).toBe('TRANSPORTE');
    expect(err.cause?.message).toContain('ETIMEDOUT');
  });

  it('lanza SriTransporteError si la respuesta no trae un estado reconocible', async () => {
    const { crearCliente } = clienteFake({ RespuestaRecepcionComprobante: {} });

    const err = await enviarComprobante(XML_FIRMADO, '1', { crearCliente }).catch(
      (e) => e,
    );

    expect(err).toBeInstanceOf(SriTransporteError);
  });
});
