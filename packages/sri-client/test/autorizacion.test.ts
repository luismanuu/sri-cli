import { describe, expect, it } from 'vitest';
import { ClaveAccesoError, SriCliError } from '@sri-cli/core';
import {
  WSDL_URLS,
  consultarAutorizacion,
  SriTransporteError,
} from '../src/index.js';
import { clienteFake, crearClienteQueFalla } from './helpers.js';

const CLAVE = '2'.repeat(49);

describe('consultarAutorizacion', () => {
  it('consulta la clave en la operación autorizacionComprobante del WSDL correcto', async () => {
    const { crearCliente, llamadas } = clienteFake({
      RespuestaAutorizacionComprobante: {
        autorizaciones: { autorizacion: { estado: 'AUTORIZADO' } },
      },
    });

    await consultarAutorizacion(CLAVE, '2', { crearCliente });

    expect(llamadas).toHaveLength(1);
    expect(llamadas[0].wsdlUrl).toBe(WSDL_URLS.autorizacion['2']);
    expect(llamadas[0].args).toEqual({ claveAccesoComprobante: CLAVE });
  });

  it('usa el endpoint de pruebas para ambiente 1', async () => {
    const { crearCliente, llamadas } = clienteFake({
      RespuestaAutorizacionComprobante: {
        autorizaciones: { autorizacion: { estado: 'EN PROCESO' } },
      },
    });

    await consultarAutorizacion(CLAVE, '1', { crearCliente });

    expect(llamadas[0].wsdlUrl).toBe(WSDL_URLS.autorizacion['1']);
  });

  it('mapea AUTORIZADO con número, fecha y XML del comprobante', async () => {
    const { crearCliente } = clienteFake({
      RespuestaAutorizacionComprobante: {
        claveAccesoConsultada: CLAVE,
        numeroComprobantes: '1',
        autorizaciones: {
          autorizacion: {
            estado: 'AUTORIZADO',
            numeroAutorizacion: CLAVE,
            fechaAutorizacion: '2026-05-27T10:00:00-05:00',
            ambiente: '2',
            comprobante: '<factura>autorizada</factura>',
          },
        },
      },
    });

    const res = await consultarAutorizacion(CLAVE, '2', { crearCliente });

    expect(res).toEqual({
      estado: 'AUTORIZADO',
      claveAcceso: CLAVE,
      numeroAutorizacion: CLAVE,
      fechaAutorizacion: '2026-05-27T10:00:00-05:00',
      comprobante: '<factura>autorizada</factura>',
      mensajes: [],
    });
  });

  it('mapea NO AUTORIZADO sin ocultar los mensajes del SRI y sin XML', async () => {
    const { crearCliente } = clienteFake({
      RespuestaAutorizacionComprobante: {
        autorizaciones: {
          autorizacion: {
            estado: 'NO AUTORIZADO',
            comprobante: '<no-deberia-exponerse/>',
            mensajes: {
              mensaje: {
                identificador: '70',
                mensaje: 'CLAVE ACCESO REGISTRADA',
                tipo: 'ERROR',
              },
            },
          },
        },
      },
    });

    const res = await consultarAutorizacion(CLAVE, '2', { crearCliente });

    expect(res.estado).toBe('NO AUTORIZADO');
    expect(res.comprobante).toBeUndefined();
    expect(res.mensajes).toEqual([
      { identificador: '70', mensaje: 'CLAVE ACCESO REGISTRADA', tipo: 'ERROR' },
    ]);
  });

  it('mapea EN PROCESO cuando el SRI lo reporta explícitamente', async () => {
    const { crearCliente } = clienteFake({
      RespuestaAutorizacionComprobante: {
        autorizaciones: { autorizacion: { estado: 'EN PROCESO' } },
      },
    });

    const res = await consultarAutorizacion(CLAVE, '2', { crearCliente });

    expect(res.estado).toBe('EN PROCESO');
  });

  it('mapea EN PROCESO cuando aún no hay nodo de autorización', async () => {
    const { crearCliente } = clienteFake({
      RespuestaAutorizacionComprobante: {
        claveAccesoConsultada: CLAVE,
        numeroComprobantes: '0',
      },
    });

    const res = await consultarAutorizacion(CLAVE, '2', { crearCliente });

    expect(res.estado).toBe('EN PROCESO');
    expect(res.mensajes).toEqual([]);
  });

  it('toma la primera autorización cuando vienen como arreglo', async () => {
    const { crearCliente } = clienteFake({
      RespuestaAutorizacionComprobante: {
        autorizaciones: {
          autorizacion: [
            { estado: 'AUTORIZADO', numeroAutorizacion: 'A' },
            { estado: 'NO AUTORIZADO' },
          ],
        },
      },
    });

    const res = await consultarAutorizacion(CLAVE, '2', { crearCliente });

    expect(res.estado).toBe('AUTORIZADO');
    expect(res.numeroAutorizacion).toBe('A');
  });

  it('rechaza una clave de acceso que no tiene 49 dígitos', async () => {
    const { crearCliente } = clienteFake({});

    const err = await consultarAutorizacion('123', '2', { crearCliente }).catch(
      (e) => e,
    );

    expect(err).toBeInstanceOf(ClaveAccesoError);
  });

  it('lanza SriTransporteError ante un fallo de red', async () => {
    const err = await consultarAutorizacion(CLAVE, '2', {
      crearCliente: crearClienteQueFalla,
    }).catch((e) => e);

    expect(err).toBeInstanceOf(SriTransporteError);
    expect(err).toBeInstanceOf(SriCliError);
    expect(err.code).toBe('TRANSPORTE');
  });
});
