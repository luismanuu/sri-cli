# M2 Plan — `@sri-cli/mcp` (Skybridge MCP App on Alpic, Polar-billed)

Status: **plan for CEO review.** Pivot approved 2026-05-27: sri-cli → MCP-first, hosted on Alpic, billed via Polar, small free tier.

## Decision summary (locked)
- **Interface:** Skybridge MCP App (TS framework, server + React UI views in Claude/ChatGPT). Reuse repo `packages/mcp`.
- **Host:** Alpic (git-connect deploy, auto transport stdio→SSE/HTTP, analytics, auth). Alpic metering = observability, NOT billing.
- **Billing:** Polar (events→meters→metered prices→invoice; MoR for EC+global tax). **Free tier = Polar meter credits** (~10–20 facturas/mo, 1 emisor). Paid = per-comprobante overage and/or monthly tiers; multi-emisor (contadores) is a paid unlock.
- **CLI** (`packages/cli`) demoted to a later milestone (thin wrapper on the same core).

## ⚠️ Scope reality (the honest part)
M1 shipped only **pure logic** in `@sri-cli/core`: `generarClaveAcceso`, `construirFacturaXml`, validators (`validarRuc`/`validarCedula`/catálogos), zod DTOs (`crearFacturaSchema`). **Not built yet:** XAdES-BES signing with P12, and the SRI SOAP transport (recepción + autorización). The emit loop can't work without those — so M2 must build them. This makes M2 bigger than "wrap core as tools," hence sub-milestones below.

## The factura emit loop (target)
build XML (core ✅) → **sign XAdES-BES w/ P12 (NEW)** → **send to SRI recepción (NEW)** → **poll autorización (NEW)** → **persist (NEW: storage)** → return authorized XML + status. RIDE PDF optional (`packages/pdf`, later).

## Sub-milestones (each: own TDD spec, plan→review→implement→PR)

### M2a — Emit engine (`@sri-cli/signing` + `@sri-cli/sri-client` + `@sri-cli/storage`)
The missing core pieces, still mostly pure/unit-testable.
- **signing**: XAdES-BES over the factura XML using a P12; unit tests with a test cert.
- **sri-client**: SOAP clients for SRI recepción + autorización (ambiente prueba/producción); typed responses; retries; clear error mapping (devuelta/no autorizado vs network). Tested against SRI **certificación** (test) endpoints.
- **storage**: SQLite history (clave-acceso keyed), authorized XML persistence; `SRI_HOME` multi-emisor layout.
- Acceptance: emit a real factura end-to-end in **certificación** (test SRI) and get an authorization number; idempotent re-send.

### M2b — Skybridge MCP App (`packages/mcp`) on Alpic
- Scaffold Skybridge (`npm create skybridge`), add the `skybridge` agent skill to the repo.
- **Tools** (v1, factura-loop first): `validar_ruc`, `generar_clave_acceso`, `emitir_factura` (runs the full loop), `consultar_autorizacion`, `obtener_comprobante` (history). NC/ND/retención/guía in M2b.1.
- **UI views** (the Skybridge win): factura form, authorization-status card, RIDE preview.
- **Config/identity:** P12 + emisor config via env / `SRI_HOME`; ambiente toggle (prueba/producción).
- Deploy: Alpic git-connect on `packages/mcp`; confirm Alpic auth → caller identity hook.
- Acceptance: from Claude/ChatGPT, emit a test factura through the hosted MCP.

### M2c — Polar billing + free tier
- Map Alpic-authenticated caller → Polar customer.
- On **successful authorization only**, ingest a `factura_emitted` event to Polar (manual SDK ingestion) — never bill a rejected/failed emission.
- Polar: meter `factura_emitted`, metered price + **free-tier credits** (~15/mo), subscription tiers, multi-emisor as paid.
- Polar token in Alpic env. MoR handles tax.
- Acceptance: free emissions don't bill; overage invoices; rejected emissions never metered.

## Cross-cutting
- **Security:** P12 + SRI creds never logged; per-emisor isolation; secrets via Alpic env (mirror Infisical). Bill only on confirmed authorization (no revenue leakage / no charging failures).
- **TDD throughout** (M1 convention): tests first, SRI certificación for integration.
- **Anti-voseo CI** already in repo — keep all es-EC copy neutral tuteo.
- **Engine:** Aria runs the pipeline via claude -p (or Lin if Feltsense capacity needed — but this is a luismanuu project, so Aria).

## Open question for CEO
- M2a is real work (signing crypto + SRI SOAP). OK to proceed sub-milestone by sub-milestone (M2a → M2b → M2c), or do you want a thinner MVP first (e.g., emit in *certificación* only, no billing) to validate the Alpic+Skybridge flow before building billing?
