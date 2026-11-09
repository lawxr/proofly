# Validación real de facturas por CUFE (local, sin DIAN online)

- Objetivo: reemplazar el mock de verificación de facturas (SandboxInvoiceVerificationAdapter) por validación REAL de integridad: parsear un XML UBL 2.1 de factura electrónica, recalcular el CUFE (SHA-384 sobre la concatenación oficial de campos) y compararlo con el CUFE declarado. Validación local, sin certificado ni captcha, honesta sobre qué comprueba. MVP académico.
- Branch: feat/cufe-invoice-validation (encadenada sobre feat/erc1155-contracts).
- Delivery strategy: ask-on-risk.
- Runner: `node --experimental-strip-types --test` (dominio + api); suite completa.

## Contexto de la investigación (ver memoria proofly/dian-research)

- NO hay API REST pública/gratuita de consulta DIAN. El portal por CUFE tiene captcha y desde 28-jul-2026 bloquea automatización. El web service SOAP real exige habilitación + certificado digital (fuera del MVP).
- El CUFE es un hash SHA-384 (96 hex) determinista calculable localmente desde los campos del XML. Fórmula canónica confirmada por múltiples fuentes:
  CUFE = SHA384( NumFac + FecFac + HorFac + ValFac + CodImp1 + ValImp1 + CodImp2 + ValImp2 + CodImp3 + ValImp3 + ValTot + NitOFE + NumAdq + ClTec + TipoAmbiente )
  - CodImp1=01 (IVA), CodImp2=04 (INC), CodImp3=03 (ICA). Si un impuesto no aplica, su Val es "0.00".
  - ClTec = ClaveTécnica; TipoAmbiente = 1 (producción) | 2 (pruebas).

## Specs

- S1: Utilidad pura de dominio `computeCufe(fields)` en packages/domain que concatena los 15 campos en el orden oficial y devuelve SHA-384 hex en minúsculas (96 chars). Determinista, sin dependencias de infraestructura.
- S2: Test de dominio con un vector conocido: dado un set de campos, computeCufe devuelve exactamente el CUFE esperado; cambiar cualquier campo cambia el hash (RED/GREEN).
- S3: `CufeInvoiceVerificationAdapter` (api) implementa InvoiceVerificationPort: parsea un XML UBL 2.1, extrae los campos del CUFE + payerNit/payerLegalName/nominalAmountCents/dueDate, recalcula el CUFE y lo compara con el declarado en el XML (<cbc:UUID>). isValid=true solo si coincide. Si no coincide o falta el UUID -> isValid=false con rejectionReason claro ("integridad"). XML vacío/corrupto -> isValid=false.
- S4: Parsing sin dependencias nuevas (extracción de tags UBL conocidos de forma acotada y segura). Montos: el XML trae pesos con decimales -> convertir a centavos bigint.
- S5: Honestidad en la UI/mensajes: el adaptador valida INTEGRIDAD del documento (el CUFE coincide con su contenido), NO "la DIAN confirmó que existe". events refleja eso (p.ej. ['CUFE_VERIFICADO'] en vez de fingir acuses RADIAN). No usar lenguaje que afirme consulta online a la DIAN.
- S6: El adaptador se puede activar por entorno (INVOICE_VERIFIER=cufe) sin romper el default sandbox; createDependenciesFromEnv lo cablea. Los tests y flujos existentes (que pasan XML simple a través de app-service) siguen verdes: app-service usa su propio verifier inline para la demo, así que este adaptador es para la vía real/QA.
- S7: Tests de dominio + api verdes; suite completa 48/48+ verde.

## Tasks

- T1 (S1,S2): computeCufe en packages/domain + test con vector conocido. Route: inline. Risk: none (función pura).
- T2 (S3,S4,S5): CufeInvoiceVerificationAdapter en api + parser UBL acotado. Route: inline. Risk: item 3 (contrato InvoiceVerificationPort que el backend consume).
- T3 (S6): Cablear INVOICE_VERIFIER=cufe en createDependenciesFromEnv (default sandbox). Route: inline. Risk: item 3.
- T4 (S7): Tests del adaptador (XML válido / CUFE alterado / vacío) + suite completa. Route: inline. Risk: none.

## Log

- L1: "cufe". Confirmada la fórmula CUFE (SHA-384, 15 campos, orden canónico) por múltiples fuentes consistentes. Decisión: validación local de integridad por recálculo de CUFE, honesta (no finge consulta online a la DIAN). La via SOAP real queda documentada como producción futura (requiere habilitación+certificado). Riesgo: item 3 (puerto de verificación que el backend consume) — aditivo, el default sandbox no cambia.

- L2: Implementado y verificado. Cambios:
  - packages/domain/src/security/cufe.ts: computeCufe(fields) (SHA-384 sobre los 15 campos en orden oficial, hex minúsculas) + verifyCufe(declared, fields) (comparación case-insensitive, trim). CUFE_FIELD_ORDER exportado. Exportado en index.
  - packages/domain/src/security/cufe.test.ts: vector conocido pineado (EXPECTED), determinismo, sensibilidad a cada campo, verifyCufe acepta/rechaza. 4/4.
  - apps/api/src/adapters/dian/cufe-invoice-adapter.ts: CufeInvoiceVerificationAdapter(claveTecnica). Parser UBL acotado (tagText/block/taxValue por regex de tag, sin lib XML nueva). Extrae UUID (CUFE declarado), ID/IssueDate/IssueTime, LineExtensionAmount/PayableAmount, CompanyID/RegistrationName de supplier/customer, TaxSubtotal por código (01/04/03). Recalcula el CUFE y compara. isValid solo si coincide.
  - Honestidad: events=['CUFE_VERIFICADO'] (integridad local, NO consulta online). CUFE_NO_COINCIDE si alterado, CUFE_SIN_CLAVE_TECNICA si falta la clave. rejectionReason claros.
  - apps/api/src/app.ts: createDependenciesFromEnv cablea INVOICE_VERIFIER=cufe con DIAN_CLAVE_TECNICA; default sandbox sin cambios.
  - test del adaptador: XML UBL válido (CUFE coincide), monto alterado (no coincide), sin UUID, vacío, sin clave técnica. 5/5.
- L3: Verificación: suite Node 57/57 (48 previos + 4 cufe dominio + 5 adaptador); browser e2e PASS; default sandbox intacto.
- LIMITACIÓN HONESTA CLAVE: la Clave Técnica (ClTec) NO viaja en el XML — la DIAN la entrega al emisor habilitado. Sin ella no se puede recalcular el CUFE de una factura de un tercero. El adaptador la recibe por config (DIAN_CLAVE_TECNICA) y, sin ella, NO afirma validez (CUFE_SIN_CLAVE_TECNICA). Por eso valida integridad de facturas propias/de prueba con clave conocida, no de cualquier tercero. La validación online real (que la DIAN confirme recepción) requiere el web service SOAP con habilitación+certificado (documentado, fuera del MVP).
- Riesgo: item 3 (puerto InvoiceVerificationPort que el backend consume) — mitigado: aditivo, default sandbox sin cambios, 57/57 + browser verdes.
- Siguiente en el plan MVP académico: desplegar a Base Sepolia (requiere wallet con ETH testnet); luego UX/gráficos reales conectando lo desplegado.
