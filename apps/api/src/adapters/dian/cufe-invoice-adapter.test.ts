import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CufeInvoiceVerificationAdapter } from './cufe-invoice-adapter.ts';

const CLAVE_TECNICA = '693ff6f2a6cc37c6034c1f71c5cf4bfebe2aa44ca48f1afb5f1c8a5b98e5c3fa';
const VALID_CUFE = '389875785fef2c1f3260928c3fb6444bdd64d986d2943ad1ac15ecbf226e154887fb41d08be38e1284da825f77797317';

// Minimal but realistic UBL 2.1 invoice. CompanyID/RegistrationName live inside
// AccountingSupplierParty (emisor) and AccountingCustomerParty (pagador).
function invoiceXml(cufe: string, valTot = '1190000.00'): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
  <cbc:UUID schemeName="CUFE-SHA384">${cufe}</cbc:UUID>
  <cbc:ID>SETP990000001</cbc:ID>
  <cbc:IssueDate>2026-11-07</cbc:IssueDate>
  <cbc:IssueTime>10:53:10-05:00</cbc:IssueTime>
  <cbc:ProfileExecutionID>2</cbc:ProfileExecutionID>
  <cbc:DueDate>2026-12-07</cbc:DueDate>
  <cac:AccountingSupplierParty>
    <cac:Party><cac:PartyTaxScheme>
      <cbc:RegistrationName>Estudio Nube SAS</cbc:RegistrationName>
      <cbc:CompanyID>700085371</cbc:CompanyID>
    </cac:PartyTaxScheme></cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party><cac:PartyTaxScheme>
      <cbc:RegistrationName>Bancolombia S.A.</cbc:RegistrationName>
      <cbc:CompanyID>800197268</cbc:CompanyID>
    </cac:PartyTaxScheme></cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cac:TaxSubtotal>
      <cac:TaxCategory><cac:TaxScheme><cbc:ID>01</cbc:ID></cac:TaxScheme></cac:TaxCategory>
      <cbc:TaxAmount>190000.00</cbc:TaxAmount>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount>1000000.00</cbc:LineExtensionAmount>
    <cbc:PayableAmount>${valTot}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;
}

test('valid invoice: recomputed CUFE matches the declared UUID', async () => {
  const adapter = new CufeInvoiceVerificationAdapter(CLAVE_TECNICA);
  const result = await adapter.verifyInvoice(invoiceXml(VALID_CUFE));
  assert.equal(result.isValid, true);
  assert.deepEqual(result.events, ['CUFE_VERIFICADO']);
  assert.equal(result.payerNit, '800197268');
  assert.equal(result.payerLegalName, 'Bancolombia S.A.');
  assert.equal(result.nominalAmountCents, 119000000n);
  assert.equal(result.dueDate, '2026-12-07');
});

test('tampered amount breaks the CUFE match', async () => {
  const adapter = new CufeInvoiceVerificationAdapter(CLAVE_TECNICA);
  // Declared CUFE stays the same but the payable amount was altered.
  const result = await adapter.verifyInvoice(invoiceXml(VALID_CUFE, '9999999.00'));
  assert.equal(result.isValid, false);
  assert.deepEqual(result.events, ['CUFE_NO_COINCIDE']);
  assert.match(result.rejectionReason ?? '', /no coincide/i);
});

test('missing UUID is rejected', async () => {
  const adapter = new CufeInvoiceVerificationAdapter(CLAVE_TECNICA);
  const result = await adapter.verifyInvoice('<Invoice><cbc:ID>X</cbc:ID></Invoice>');
  assert.equal(result.isValid, false);
  assert.match(result.rejectionReason ?? '', /CUFE/);
});

test('empty content is rejected', async () => {
  const adapter = new CufeInvoiceVerificationAdapter(CLAVE_TECNICA);
  const result = await adapter.verifyInvoice('   ');
  assert.equal(result.isValid, false);
  assert.match(result.rejectionReason ?? '', /vacío|corrupto/i);
});

test('without a configured Clave Técnica it cannot assert validity (honest)', async () => {
  const adapter = new CufeInvoiceVerificationAdapter(''); // no clave técnica
  const result = await adapter.verifyInvoice(invoiceXml(VALID_CUFE));
  assert.equal(result.isValid, false);
  assert.deepEqual(result.events, ['CUFE_SIN_CLAVE_TECNICA']);
});
