# sri-cli

CLI y servidor MCP para emisión de comprobantes electrónicos del SRI Ecuador (factura, nota de crédito, nota de débito, retención, guía de remisión).

> **Estado**: en desarrollo activo. Aún no publicado en npm.

## Qué hace

- **Emite** comprobantes electrónicos al SRI desde la terminal o desde un agente IA (Claude Desktop, Codex)
- **Firma** XML con XAdES-BES usando tu firma electrónica P12
- **Consulta** estado de autorización
- **Persiste** historial local en SQLite con XMLs autorizados
- **Renderiza** RIDE PDF (opcional, con addon `@sri-cli/ride`)
- **Firma** PDFs externos con tu P12

## Para quién es

- Emisores que quieren automatizar emisión sin depender de SaaS de terceros
- Contadores que manejan múltiples emisores (vía `SRI_HOME`)
- Desarrolladores que quieren integrar emisión SRI en agentes IA

## Instalación

```bash
npm install -g @sri-cli/cli
sri init   # wizard interactivo
sri emit factura --input factura.json
```

Para RIDE PDF opcional:

```bash
npm install -g @sri-cli/ride
sri ride <clave-acceso> --output factura.pdf
```

## Uso desde Claude Desktop (MCP)

```jsonc
// claude_desktop_config.json
{
  "mcpServers": {
    "sri": { "command": "sri", "args": ["mcp"] }
  }
}
```

## Documentación

Próximamente en `docs/` (vitepress en español neutro).

## Licencia

[AGPL-3.0](LICENSE) © 2026 Luis Yagual

Si modificas este proyecto y lo ofreces como servicio (SaaS, hosted), debes publicar tu código modificado bajo la misma licencia. Ver §13 de AGPL.

## Atribuciones

Este proyecto adapta lógica de [open-api-facturacion-sri](https://github.com/AngeloBarzolaVillamar/open-api-facturacion-sri) (MIT License). Ver [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
