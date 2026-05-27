import type { CrearClienteSoap, SoapClientLike } from '../src/index.js';

/**
 * Crea un factory de cliente SOAP falso para las pruebas.
 *
 * No toca la red: devuelve el `result` indicado envuelto en `[result]` (igual
 * que la librería `soap`). Registra la URL WSDL y los argumentos recibidos para
 * poder verificar el build de la petición.
 */
export function clienteFake(result: unknown): {
  crearCliente: CrearClienteSoap;
  llamadas: { wsdlUrl: string; args: unknown }[];
} {
  const llamadas: { wsdlUrl: string; args: unknown }[] = [];

  const crearCliente: CrearClienteSoap = async (wsdlUrl) => {
    const client: SoapClientLike = {
      async validarComprobanteAsync(args) {
        llamadas.push({ wsdlUrl, args });
        return [result];
      },
      async autorizacionComprobanteAsync(args) {
        llamadas.push({ wsdlUrl, args });
        return [result];
      },
    };
    return client;
  };

  return { crearCliente, llamadas };
}

/** Factory que simula una falla de red (timeout/conexión) al crear el cliente. */
export const crearClienteQueFalla: CrearClienteSoap = async () => {
  throw new Error('ETIMEDOUT: connection timed out');
};
