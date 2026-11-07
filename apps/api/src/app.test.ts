/**
 * @proofly/api - Pruebas de Integración HTTP de la API REST
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { createDependencies, createProoflyApiServer, seedDemoData } from './app.ts';

describe('Proofly REST API Endpoints (Integration)', () => {
  const deps = createDependencies('api-test-secret-salt-2026-super-secure-32-chars');
  const server = createProoflyApiServer(deps);

  let baseUrl = '';
  let demoFreelancerId = '';
  let demoInvestor1Id = '';
  let demoInvestor2Id = '';

  before(async () => {
    const demo = await seedDemoData(deps);
    demoFreelancerId = demo.freelancerId;
    demoInvestor1Id = demo.investor1Id;
    demoInvestor2Id = demo.investor2Id;

    await new Promise<void>(resolve => {
      server.listen(0, () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>(resolve => {
      server.close(() => resolve());
    });
  });

  it('1. GET /health returns 200 and online status', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'UP');
    assert.equal(data.service, 'Proofly Core API');
  });

  it('2. POST /api/v1/quotes/simulate returns exact cent calculations', async () => {
    const res = await fetch(`${baseUrl}/api/v1/quotes/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nominalAmountCents: 150000000, // $ 1.500.000 COP
        termDays: 30,
        monthlyDiscountRate: 0.0200
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.nominalAmountCents, '150000000');
    assert.equal(data.commercialDiscountCents, '3000000'); // $ 30.000 COP
    assert.equal(data.prooflyFeeCents, '1500000'); // $ 15.000 COP
    assert.equal(data.advanceAmountCents, '145500000'); // $ 1.455.000 COP
  });

  it('3. Complete E2E REST Flow: Milestone -> Confirm -> Accept -> List -> Fund -> Reconcile', async () => {
    // A. Registrar Hito Contractual
    const createRes = await fetch(`${baseUrl}/api/v1/operations/milestone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        freelancerId: demoFreelancerId,
        contractUuid: 'e2e00001-0000-0000-0000-000000000001',
        milestoneIndex: 1,
        title: 'Hito 1: API Core Hexagonal',
        deliverableUrl: 'https://github.com/proofly/api',
        payerNit: '900111222-3',
        payerLegalName: 'MercadoLibre Colombia',
        payerEmail: 'facturas@mercadolibre.com',
        nominalAmountCents: 100000000, // $ 1.000.000 COP
        termDays: 30,
        dueDate: '2026-12-31'
      })
    });

    assert.equal(createRes.status, 201);
    const createdOp = await createRes.json();
    assert.equal(createdOp.status, 'PENDING_CLIENT_CONFIRMATION');
    assert.ok(createdOp.confirmationToken);

    // B. Confirmar Hito como Cliente Pagador
    const confirmRes = await fetch(`${baseUrl}/api/v1/milestones/${createdOp.confirmationToken}/confirm`, {
      method: 'POST'
    });
    assert.equal(confirmRes.status, 200);
    const confirmedData = await confirmRes.json();
    assert.equal(confirmedData.operation.status, 'QUOTED');

    // C. Freelancer Acepta Oferta y Firma Cesión
    const acceptRes = await fetch(`${baseUrl}/api/v1/operations/${createdOp.id}/accept-quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        freelancerId: demoFreelancerId,
        electronicSignatureHash: '0xe2esignaturehash123456789'
      })
    });
    assert.equal(acceptRes.status, 200);
    const acceptedData = await acceptRes.json();
    assert.equal(acceptedData.operation.status, 'APPROVED_PENDING_FUNDING');

    // D. Listar Marketplace
    const marketRes = await fetch(`${baseUrl}/api/v1/marketplace`);
    assert.equal(marketRes.status, 200);
    const marketOps = await marketRes.json();
    assert.ok(marketOps.some((op: any) => op.id === createdOp.id));

    // E. Financiador Simula Retorno en Marketplace
    const simRes = await fetch(`${baseUrl}/api/v1/marketplace/${createdOp.id}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountToFundCents: createdOp.advanceAmountCents
      })
    });
    assert.equal(simRes.status, 200);
    const simData = await simRes.json();
    assert.equal(simData.fundedCapitalCents, createdOp.advanceAmountCents);

    // F. Financiador Adquiere el 100% de la Operación
    const fundRes = await fetch(`${baseUrl}/api/v1/operations/${createdOp.id}/participations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        investorId: demoInvestor1Id,
        fundedCapitalCents: createdOp.advanceAmountCents
      })
    });
    assert.equal(fundRes.status, 201);
    const fundData = await fundRes.json();
    assert.equal(fundData.isFullyFunded, true);
    assert.equal(fundData.operation.status, 'ACTIVE_FUNDED');

    // G. Conciliación Bancaria y Cascada Waterfall
    const settleRes = await fetch(`${baseUrl}/api/v1/settlement/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operationId: createdOp.id,
        bankReceiptHash: '0xbancoreceipt987654321',
        receivedAmountCents: createdOp.nominalAmountCents,
        bankTransactionRef: 'ACH-2026-TRANS-001'
      })
    });

    assert.equal(settleRes.status, 200);
    const settleData = await settleRes.json();
    assert.equal(settleData.isFullySettled, true);
    assert.equal(settleData.newStatus, 'SETTLED');
    assert.equal(settleData.prooflyFeeRetainedCents, createdOp.prooflyFeeCents);
  });
});

