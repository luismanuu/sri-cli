import { describe, expect, it, vi } from 'vitest';
import { Ambiente, SriCliError } from '@sri-cli/core';
import type {
  AutorizacionResult,
  RecepcionResult,
} from '@sri-cli/sri-client';
import { emitirFactura, EmisionError } from '../src/index.js';
import type { EmisorDeps, EmitirFacturaOptions } from '../src/types.js';
import { FakeStore, facturaDtoValida } from './helpers.js';

const P12 = Buffer.from('certificado-falso');

/** Construye deps inyectables sobre un FakeStore compartido. */
function montar(overrides: Partial<EmisorDeps> = {}): {
  store: FakeStore;
  deps: EmisorDeps;
  firmar: ReturnType<typeof vi.fn>;
  enviar: ReturnType<typeof vi.fn>;
  autorizar: ReturnType<typeof vi.fn>;
} {
  const store = new FakeStore();
  const firmar = vi.fn(async (xml: string) => `${xml}\n<ds:Signature/>`);
  const enviar = vi.fn(
    async (): Promise<RecepcionResult> => ({ estado: 'RECIBIDA', mensajes: [] }),
  );
  const autorizar = vi.fn(
    async (claveAcceso: string): Promise<AutorizacionResult> => ({
      estado: 'AUTORIZADO',
      claveAcceso,
      numeroAutorizacion: claveAcceso,
      fechaAutorizacion: '2026-01-15T10:00:00-05:00',
      comprobante: '<autorizacion><comprobante>…</comprobante></autorizacion>',
      mensajes: [],
    }),
  );

  const deps: EmisorDeps = {
    firmar: firmar as unknown as EmisorDeps['firmar'],
    enviarRecepcion: enviar as unknown as EmisorDeps['enviarRecepcion'],
    consultarAutorizacion:
      autorizar as unknown as EmisorDeps['consultarAutorizacion'],
    abrirStore: () => store,
    ...overrides,
  };

  return { store, deps, firmar, enviar, autorizar };
}

function opciones(deps: EmisorDeps): EmitirFacturaOptions {
  return { p12: P12, p12Password: 'clave', ambiente: Ambiente.PRUEBAS, deps };
}

describe('emitirFactura — camino feliz (AUTORIZADO)', () => {
  it('construye, firma, envía, autoriza y persiste el comprobante', async () => {
    const { store, deps, firmar, enviar, autorizar } = montar();

    const res = await emitirFactura(facturaDtoValida(), opciones(deps));

    expect(res.estado).toBe('AUTORIZADO');
    expect(res.claveAcceso).toHaveLength(49);
    expect(res.numeroAutorizacion).toBe(res.claveAcceso);
    expect(res.comprobante).toContain('comprobante');
    expect(res.errores).toEqual([]);
    expect(res.yaEmitido).toBeUndefined();

    expect(firmar).toHaveBeenCalledOnce();
    expect(enviar).toHaveBeenCalledOnce();
    expect(autorizar).toHaveBeenCalledOnce();

    const guardado = store.get(res.claveAcceso);
    expect(guardado.estado).toBe('AUTORIZADO');
    expect(guardado.xml_autorizado).toBe(res.comprobante);
    expect(guardado.xml_firmado).toContain('<ds:Signature/>');
    expect(store.closed).toBe(true);
  });

  it('usa el ambiente de producción cuando se indica', async () => {
    const { deps, enviar, autorizar } = montar();

    await emitirFactura(facturaDtoValida(), {
      p12: P12,
      p12Password: 'clave',
      ambiente: Ambiente.PRODUCCION,
      deps,
    });

    expect(enviar.mock.calls[0][1]).toBe('2');
    expect(autorizar.mock.calls[0][1]).toBe('2');
  });
});

describe('emitirFactura — DEVUELTA en recepción', () => {
  it('devuelve los motivos del SRI sin autorizar ni ocultar mensajes', async () => {
    const mensajes = [
      {
        identificador: '45',
        mensaje: 'Error en la estructura del comprobante',
        informacionAdicional: 'Falta razonSocial',
        tipo: 'ERROR' as const,
      },
    ];
    const enviarDevuelta = vi.fn(
      async (): Promise<RecepcionResult> => ({ estado: 'DEVUELTA', mensajes }),
    );
    const { store, deps, autorizar } = montar({
      enviarRecepcion: enviarDevuelta as unknown as EmisorDeps['enviarRecepcion'],
    });

    const res = await emitirFactura(facturaDtoValida(), opciones(deps));

    expect(res.estado).toBe('DEVUELTA');
    expect(res.errores).toEqual(mensajes);
    expect(enviarDevuelta).toHaveBeenCalledOnce();
    expect(autorizar).not.toHaveBeenCalled();
    expect(store.get(res.claveAcceso).estado).toBe('RECHAZADO');
  });
});

describe('emitirFactura — NO AUTORIZADO en autorización', () => {
  it('persiste RECHAZADO y devuelve los motivos', async () => {
    const mensajes = [
      {
        identificador: '70',
        mensaje: 'Clave de acceso registrada',
        tipo: 'ERROR' as const,
      },
    ];
    const { store, deps } = montar({
      consultarAutorizacion: vi.fn(
        async (claveAcceso: string): Promise<AutorizacionResult> => ({
          estado: 'NO AUTORIZADO',
          claveAcceso,
          mensajes,
        }),
      ) as unknown as EmisorDeps['consultarAutorizacion'],
    });

    const res = await emitirFactura(facturaDtoValida(), opciones(deps));

    expect(res.estado).toBe('NO_AUTORIZADO');
    expect(res.errores).toEqual(mensajes);
    expect(res.comprobante).toBeUndefined();
    expect(store.get(res.claveAcceso).estado).toBe('RECHAZADO');
  });
});

describe('emitirFactura — EN PROCESO', () => {
  it('conserva el estado ENVIADO para reintentar la consulta más tarde', async () => {
    const { store, deps } = montar({
      consultarAutorizacion: vi.fn(
        async (claveAcceso: string): Promise<AutorizacionResult> => ({
          estado: 'EN PROCESO',
          claveAcceso,
          mensajes: [],
        }),
      ) as unknown as EmisorDeps['consultarAutorizacion'],
    });

    const res = await emitirFactura(facturaDtoValida(), opciones(deps));

    expect(res.estado).toBe('EN_PROCESO');
    expect(store.get(res.claveAcceso).estado).toBe('ENVIADO');
  });
});

describe('emitirFactura — idempotencia por clave de acceso', () => {
  it('no reemite un comprobante ya AUTORIZADO', async () => {
    const { store, deps, firmar, enviar, autorizar } = montar();

    const primera = await emitirFactura(facturaDtoValida(), opciones(deps));
    expect(primera.estado).toBe('AUTORIZADO');
    expect(primera.yaEmitido).toBeUndefined();

    // Segunda corrida con el MISMO store y el mismo DTO: la clave de acceso es
    // determinista, así que debe encontrar el AUTORIZADO y devolverlo sin
    // volver a firmar ni a llamar al SRI.
    const segunda = await emitirFactura(facturaDtoValida(), opciones(deps));

    expect(segunda.estado).toBe('AUTORIZADO');
    expect(segunda.yaEmitido).toBe(true);
    expect(segunda.claveAcceso).toBe(primera.claveAcceso);
    expect(segunda.comprobante).toBe(primera.comprobante);

    expect(firmar).toHaveBeenCalledOnce();
    expect(enviar).toHaveBeenCalledOnce();
    expect(autorizar).toHaveBeenCalledOnce();
  });

  it('reintenta un comprobante previo DEVUELTA (no AUTORIZADO)', async () => {
    // Un solo store compartido entre los dos intentos. La recepción devuelve
    // DEVUELTA la primera vez y RECIBIDA la segunda (factura ya corregida).
    const { deps } = montar();
    let estadoRecepcion: RecepcionResult = { estado: 'DEVUELTA', mensajes: [] };
    const compartidos: EmisorDeps = {
      ...deps,
      enviarRecepcion: vi.fn(
        async (): Promise<RecepcionResult> => estadoRecepcion,
      ) as unknown as EmisorDeps['enviarRecepcion'],
    };
    const store = deps.abrirStore('') as FakeStore;

    const r1 = await emitirFactura(facturaDtoValida(), opciones(compartidos));
    expect(r1.estado).toBe('DEVUELTA');
    expect(store.get(r1.claveAcceso).estado).toBe('RECHAZADO');

    estadoRecepcion = { estado: 'RECIBIDA', mensajes: [] };
    const r2 = await emitirFactura(facturaDtoValida(), opciones(compartidos));
    expect(r2.estado).toBe('AUTORIZADO');
    expect(store.get(r2.claveAcceso).estado).toBe('AUTORIZADO');
  });
});

describe('emitirFactura — validación', () => {
  it('lanza EmisionError (SriCliError) si el DTO es inválido', async () => {
    const { deps } = montar();
    const dto = facturaDtoValida();
    // Sin detalles: viola el schema.
    const invalido = { ...dto, detalles: [] };

    await expect(emitirFactura(invalido, opciones(deps))).rejects.toBeInstanceOf(
      EmisionError,
    );
    await expect(emitirFactura(invalido, opciones(deps))).rejects.toBeInstanceOf(
      SriCliError,
    );
  });

  it('lanza EmisionError si falta el secuencial', async () => {
    const { deps } = montar();
    const dto = facturaDtoValida();
    delete dto.secuencial;

    await expect(emitirFactura(dto, opciones(deps))).rejects.toThrow(
      /secuencial/i,
    );
  });

  it('lanza EmisionError si la identificación del comprador es inválida', async () => {
    const { deps } = montar();
    const dto = facturaDtoValida();
    dto.comprador = {
      tipoIdentificacion: '05',
      identificacion: '0000000000',
      razonSocial: 'Cliente inválido',
    };

    await expect(emitirFactura(dto, opciones(deps))).rejects.toBeInstanceOf(
      EmisionError,
    );
  });
});
