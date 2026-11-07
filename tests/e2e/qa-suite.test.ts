/**
 * Proofly - Suite Integral de Pruebas Maestras QA-01 a QA-06
 * Implementación de la Puerta Fase 7 de Calidad
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  UserEntity,
  UserRole,
  KycStatus,
  FreelancerTier,
  OperationStatus,
  OperationEntity,
  InvestmentEntity,
  InvestmentStatus,
  AssetType,
  TiersPolicy,
  FinancialEngine
} from '@proofly/domain';

import {
  createProoflyApiServer,
  createDependencies,
  seedDemoData,
  type AppDependencies
} from '../../apps/api/src/app.ts';

import { OutboxDispatcher } from '../../apps/worker/src/outbox/dispatcher.ts';

describe('Proofly Fase 7 - Suite Integral de Aceptación (QA-01 a QA-06)', () => {
  let server: http.Server;
  let baseUrl: string;
  let deps: AppDependencies;

  before(async () => {
    deps = createDependencies();
    await seedDemoData(deps);
    server = createProoflyApiServer(deps);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  // --------------------------------------------------------------------------
  // QA-01: Onboarding y Asignación de Cupo Tier 1 Semilla ($ 2.000.000 COP)
  // --------------------------------------------------------------------------
  it('QA-01: Onboarding y asignación de cupo inicial Tier 1 Semilla ($ 2.000.000 COP)', async () => {
    // 1. Registro de nuevo usuario freelancer
    const newFreelancer = new UserEntity({
      id: 'fl-qa01-new',
      email: 'mateo.qa01@proofly.co',
      legalName: 'Mateo QA01 Morales',
      taxId: '1098765432',
      role: UserRole.FREELANCER,
      kycStatus: KycStatus.PENDING,
      tier: FreelancerTier.TIER_1_SEED,
      availableLimitCents: 0n,
      executionScore: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await deps.userRepo.save(newFreelancer);
    assert.equal(newFreelancer.kycStatus, KycStatus.PENDING);

    // 2. Proceso de verificación KYC y evaluación de política de Tiers
    const initialTier = TiersPolicy.determineTier(0, 0);
    const tierConfig = TiersPolicy.TIER_CONFIG[initialTier];

    assert.equal(initialTier, FreelancerTier.TIER_1_SEED);
    assert.equal(tierConfig.maxQuotaCents, 200000000n); // $ 2.000.000 COP

    // 3. Activación de usuario verificado con cupo asignado
    newFreelancer.kycStatus = KycStatus.VERIFIED;
    newFreelancer.availableLimitCents = tierConfig.maxQuotaCents;
    await deps.userRepo.save(newFreelancer);

    const verifiedUser = await deps.userRepo.findById('fl-qa01-new');
    assert.ok(verifiedUser);
    assert.equal(verifiedUser.kycStatus, KycStatus.VERIFIED);
    assert.equal(verifiedUser.tier, FreelancerTier.TIER_1_SEED);
    assert.equal(verifiedUser.availableLimitCents, 200000000n, 'Cupo semilla debe ser exactamente $ 2.000.000 COP');
  });

  // --------------------------------------------------------------------------
  // QA-02: Originación por Factura Electrónica UBL 2.1 con Validación RADIAN
  // --------------------------------------------------------------------------
  it('QA-02: Originación por factura electrónica UBL 2.1 y verificación RADIAN', async () => {
    const fl = await deps.userRepo.findById('freelancer-demo-01');
    assert.ok(fl);
    fl.availableLimitCents = 800000000n; // $ 8.000.000 COP (Tier 2)
    await deps.userRepo.save(fl);

    // Caso A: Factura sin los 3 acuses de recibo en RADIAN -> RECHAZO (HTTP 400)
    const missingAcusesXml = `
      <Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
        <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
        <cbc:CustomizationID>DIAN 2.1: REJECT Factura sin acuses</cbc:CustomizationID>
        <cbc:UUID schemeName="CUFE-SHA384">CUFE-INVALID-NO-ACUSES-999</cbc:UUID>
      </Invoice>
    `;

    const resA = await fetch(`${baseUrl}/api/v1/operations/invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        freelancerId: 'freelancer-demo-01',
        xmlContent: missingAcusesXml
      })
    });

    assert.equal(resA.status, 400, 'Factura sin acuses RADIAN debe responder 400');
    const errA = await resA.json();
    assert.ok(errA.error.includes('RADIAN'));

    // Caso B: Factura electrónica válida con acuses y confirmada -> Aceptada con cotización
    const validXml = `
      <Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
        <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
        <cbc:CustomizationID>DIAN 2.1: Factura Electrónica de Venta</cbc:CustomizationID>
        <cbc:UUID schemeName="CUFE-SHA384">CUFE-VALID-APPROVED-RADIAN-2026</cbc:UUID>
        <cac:PaymentMeans><cbc:PaymentDueDate>2026-12-15</cbc:PaymentDueDate></cac:PaymentMeans>
      </Invoice>
    `;

    const resB = await fetch(`${baseUrl}/api/v1/operations/invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        freelancerId: 'freelancer-demo-01',
        xmlContent: validXml
      })
    });

    assert.equal(resB.status, 201);
    const opB = await resB.json();
    assert.equal(opB.status, OperationStatus.QUOTED, 'Factura con RADIAN válido pasa a QUOTED');
    assert.ok(BigInt(opB.advanceAmountCents) > 0n);
    assert.equal(
      BigInt(opB.advanceAmountCents) + BigInt(opB.commercialDiscountCents) + BigInt(opB.prooflyFeeCents),
      BigInt(opB.nominalAmountCents),
      'Invariante de conservación de montos'
    );
  });

  // --------------------------------------------------------------------------
  // QA-03: Originación por Hito Contractual y Confirmación de Cliente
  // --------------------------------------------------------------------------
  it('QA-03: Originación por hito y confirmación con token criptográfico de un solo uso', async () => {
    // 1. Crear hito de desarrollo
    const resCreate = await fetch(`${baseUrl}/api/v1/operations/milestone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        freelancerId: 'freelancer-demo-01',
        contractUuid: 'contract-qa03-uuid',
        milestoneIndex: 1,
        title: 'Hito QA-03 Frontend Architecture',
        deliverableUrl: 'https://github.com/factoken/qa03',
        payerNit: '900987654-1',
        payerLegalName: 'Bancolombia Innovación SAS',
        payerEmail: 'aprobaciones@bancolombia.com',
        nominalAmountCents: 150000000, // $ 1.500.000 COP
        termDays: 30,
        dueDate: '2026-12-30'
      })
    });

    assert.equal(resCreate.status, 201);
    const createdOp = await resCreate.json();
    assert.equal(createdOp.status, OperationStatus.PENDING_CLIENT_CONFIRMATION);
    assert.ok(createdOp.confirmationToken, 'Debe emitir confirmationToken para el cliente');

    const token = createdOp.confirmationToken;

    // 2. Cliente confirma el hito vía /api/v1/milestones/{token}/confirm
    const resConfirm = await fetch(`${baseUrl}/api/v1/milestones/${token}/confirm`, {
      method: 'POST'
    });

    assert.equal(resConfirm.status, 200);
    const confirmedData = await resConfirm.json();
    assert.equal(confirmedData.operation.status, OperationStatus.QUOTED, 'Operación avanza a QUOTED');

    // 3. Intento de re-uso del token -> debe fallar (Invariante de un solo uso)
    const resReuse = await fetch(`${baseUrl}/api/v1/milestones/${token}/confirm`, {
      method: 'POST'
    });

    assert.equal(resReuse.status, 400, 'Re-uso de token de confirmación debe ser rechazado');
  });

  // --------------------------------------------------------------------------
  // QA-04: Fondeo Fraccionado en Marketplace y Emisión ERC-1155
  // --------------------------------------------------------------------------
  it('QA-04: Fondeo fraccionado (60% y 40%) en Marketplace y minteo ERC-1155 en Base L2', async () => {
    // Asignar cupo para la operación
    const fl = await deps.userRepo.findById('freelancer-demo-01');
    assert.ok(fl);
    fl.availableLimitCents = 500000000n;
    await deps.userRepo.save(fl);

    // 1. Crear hito y confirmarlo
    const resMilestone = await fetch(`${baseUrl}/api/v1/operations/milestone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        freelancerId: 'freelancer-demo-01',
        contractUuid: 'contract-qa04-frac',
        milestoneIndex: 2,
        title: 'Hito QA-04 Smart Contracts',
        deliverableUrl: 'https://github.com/factoken/qa04',
        payerNit: '900987654-1',
        payerLegalName: 'MercadoLibre Colombia',
        payerEmail: 'tesoreria@mercadolibre.com',
        nominalAmountCents: 180000000, // $ 1.800.000 COP
        termDays: 30,
        dueDate: '2026-12-30'
      })
    });
    assert.equal(resMilestone.status, 201);
    const opData = await resMilestone.json();

    // Confirmar hito
    await fetch(`${baseUrl}/api/v1/milestones/${opData.confirmationToken}/confirm`, {
      method: 'POST'
    });

    // 2. Aceptar cotización por el freelancer
    const resAccept = await fetch(`${baseUrl}/api/v1/operations/${opData.id}/accept-quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        freelancerId: 'freelancer-demo-01',
        electronicSignatureHash: '0xsignature-qa04-freelancer'
      })
    });
    assert.equal(resAccept.status, 200);
    const acceptedOp = (await resAccept.json()).operation;
    assert.equal(acceptedOp.status, OperationStatus.APPROVED_PENDING_FUNDING);

    const requiredCapital = BigInt(acceptedOp.advanceAmountCents);

    // 3. Financiador A aporta el 60%
    const capitalA = (requiredCapital * 60n) / 100n;
    const resPartA = await fetch(`${baseUrl}/api/v1/operations/${opData.id}/participations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        investorId: 'investor-demo-01',
        fundedCapitalCents: capitalA.toString()
      })
    });
    assert.equal(resPartA.status, 201);

    // 4. Financiador B aporta el 40% restante
    const capitalB = requiredCapital - capitalA;
    const resPartB = await fetch(`${baseUrl}/api/v1/operations/${opData.id}/participations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        investorId: 'investor-demo-02',
        fundedCapitalCents: capitalB.toString()
      })
    });
    assert.equal(resPartB.status, 201);

    // 5. Verificar que la operación alcanzó el 100% y pasó a ACTIVE_FUNDED
    const fullyFundedOp = await deps.operationRepo.findById(opData.id);
    assert.ok(fullyFundedOp);
    assert.equal(fullyFundedOp.status, OperationStatus.ACTIVE_FUNDED);
    assert.equal(fullyFundedOp.fundedCapitalCents, requiredCapital);

    // 6. Worker despacha el minteo on-chain
    let mockMintCalled = false;
    let mintedTokens = 0n;

    const mockBlockchain = {
      mintOperationTokens: async (params: { operationId: string; toAddress: string; amountTokens: bigint }) => {
        mockMintCalled = true;
        mintedTokens = params.amountTokens;
        return { success: true, txHash: '0xtx-mint-success-base-l2' };
      },
      settleOperationTokens: async () => ({ success: true, txHash: '0xtx-settle' })
    };

    const mockPaymentRail = {
      disburseAdvance: async () => ({ success: true, transactionId: 'ACH-FL-QA04' }),
      transferToInvestor: async () => ({ success: true, transactionId: 'ACH-INV' })
    };

    const dispatcher = new OutboxDispatcher(
      deps.outboxRepo,
      mockBlockchain as any,
      mockPaymentRail as any
    );

    const { processedCount } = await dispatcher.processBatch();
    assert.ok(processedCount > 0, 'Worker procesa eventos pendientes en Outbox');
    assert.ok(mockMintCalled, 'mintOperationTokens ejecutado en Base L2');
    assert.equal(mintedTokens, requiredCapital, 'Tokens emitidos corresponden al capital fondeado');
  });

  // --------------------------------------------------------------------------
  // QA-05: Recaudo Bancario Completo (100%) y Liquidación Waterfall
  // --------------------------------------------------------------------------
  it('QA-05: Recaudo bancario completo (100%) y liquidación en cascada Waterfall sin pérdida de centavos', async () => {
    // 1. Simular operación fondeada con $ 1.000.000 COP nominal
    const nominal = 100000000n; // $ 1.000.000 COP
    const quote = FinancialEngine.calculateQuote({
      nominalAmountCents: nominal,
      termDays: 30,
      monthlyDiscountRate: 0.02,
      prooflyFeeRate: 0.01
    });

    const op = new OperationEntity({
      id: 'op-qa05-settle',
      freelancerId: 'freelancer-demo-01',
      payerNit: '900123456-1',
      payerLegalName: 'Bancolombia S.A.',
      assetType: AssetType.MILESTONE,
      nominalAmountCents: nominal,
      advanceAmountCents: quote.advanceAmountCents,
      commercialDiscountCents: quote.commercialDiscountCents,
      prooflyFeeCents: quote.prooflyFeeCents,
      termDays: 30,
      dueDate: '2026-12-30',
      status: OperationStatus.ACTIVE_FUNDED,
      fundedCapitalCents: quote.advanceAmountCents,
      hmacKey: '0xhmac-qa05',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await deps.operationRepo.save(op);

    // Financiador único con todo el capital
    const inv = new InvestmentEntity({
      id: 'inv-qa05-1',
      operationId: op.id,
      investorId: 'investor-demo-01',
      fundedCapitalCents: quote.advanceAmountCents,
      tokensCount: nominal,
      status: InvestmentStatus.CONFIRMED,
      createdAt: new Date()
    });
    await deps.investmentRepo.save(inv);

    // 2. Empresa cliente transfiere el 100% ($ 1.000.000 COP)
    const resSettle = await fetch(`${baseUrl}/api/v1/settlement/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operationId: op.id,
        receivedAmountCents: nominal.toString(),
        bankReceiptHash: '0xbankreceipt-qa05-full',
        bankTransactionRef: 'ACH-BANCOLOMBIA-QA05'
      })
    });

    assert.equal(resSettle.status, 200);
    const settleResult = await resSettle.json();

    assert.equal(settleResult.newStatus, OperationStatus.SETTLED);
    assert.equal(settleResult.isFullySettled, true);
    assert.equal(BigInt(settleResult.receivedAmountCents), nominal);

    // Verificación de conservación de valor total en la distribución
    const totalFinanciers = settleResult.investorDistributions.reduce(
      (acc: bigint, d: { totalDistributedCents: string }) => acc + BigInt(d.totalDistributedCents),
      0n
    );

    const totalDistributed = totalFinanciers + BigInt(settleResult.prooflyFeeRetainedCents);
    assert.equal(totalDistributed, nominal, 'Waterfall total debe coincidir exactamente con el valor nominal');
  });

  // --------------------------------------------------------------------------
  // QA-06: Pago Parcial (60%) y Distribución por Mayor Resto
  // --------------------------------------------------------------------------
  it('QA-06: Pago parcial (60%) y distribución pro-rata entera por Mayor Resto entre 3 financiadores', async () => {
    // 1. Operación de $ 10.000.000 COP (1.000.000.000 centavos)
    const nominal = 1000000000n;
    const advance = 940000000n;
    const discount = 50000000n;
    const fee = 10000000n;

    const op = new OperationEntity({
      id: 'op-qa06-partial',
      freelancerId: 'freelancer-demo-01',
      payerNit: '900123456-1',
      payerLegalName: 'MercadoLibre SAS',
      assetType: AssetType.MILESTONE,
      nominalAmountCents: nominal,
      advanceAmountCents: advance,
      commercialDiscountCents: discount,
      prooflyFeeCents: fee,
      termDays: 30,
      dueDate: '2026-12-30',
      status: OperationStatus.ACTIVE_FUNDED,
      fundedCapitalCents: advance,
      hmacKey: '0xhmac-qa06',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await deps.operationRepo.save(op);

    // 3 Financiadores aportando a partes iguales (1/3 cada uno)
    const shareEach = advance / 3n;
    const remainder = advance % 3n;

    await deps.investmentRepo.save(new InvestmentEntity({
      id: 'inv-qa06-1',
      operationId: op.id,
      investorId: 'inv-1',
      fundedCapitalCents: shareEach + remainder,
      tokensCount: nominal / 3n,
      status: InvestmentStatus.CONFIRMED,
      createdAt: new Date()
    }));

    await deps.investmentRepo.save(new InvestmentEntity({
      id: 'inv-qa06-2',
      operationId: op.id,
      investorId: 'inv-2',
      fundedCapitalCents: shareEach,
      tokensCount: nominal / 3n,
      status: InvestmentStatus.CONFIRMED,
      createdAt: new Date()
    }));

    await deps.investmentRepo.save(new InvestmentEntity({
      id: 'inv-qa06-3',
      operationId: op.id,
      investorId: 'inv-3',
      fundedCapitalCents: shareEach,
      tokensCount: nominal / 3n,
      status: InvestmentStatus.CONFIRMED,
      createdAt: new Date()
    }));

    // 2. La empresa contratante solo abona el 60% ($ 6.000.000 COP = 600.000.000 centavos)
    const partialPayment = 600000000n;

    const resPartial = await fetch(`${baseUrl}/api/v1/settlement/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operationId: op.id,
        receivedAmountCents: partialPayment.toString(),
        bankReceiptHash: '0xbankreceipt-qa06-partial',
        bankTransactionRef: 'ACH-BANCOLOMBIA-QA06-PARTIAL'
      })
    });

    assert.equal(resPartial.status, 200);
    const partialResult = await resPartial.json();

    // 3. Verificaciones de invariantes de incumplimiento parcial
    assert.equal(
      partialResult.newStatus,
      OperationStatus.PARTIALLY_SETTLED_OVERDUE,
      'Operación pasa a PARTIALLY_SETTLED_OVERDUE para gestión de mora'
    );
    assert.equal(partialResult.isFullySettled, false);

    // Suma de capital distribuido a inversionistas
    const distributedFinanciers = partialResult.investorDistributions.reduce(
      (sum: bigint, d: { totalDistributedCents: string }) => sum + BigInt(d.totalDistributedCents),
      0n
    );

    // Conservación estricta: Total Inversionistas + Fee Retenido == Abono recibido
    const totalReconciled = distributedFinanciers + BigInt(partialResult.prooflyFeeRetainedCents);
    assert.equal(
      totalReconciled,
      partialPayment,
      'Cero pérdida de centavos en la distribución de abono parcial por Mayor Resto'
    );
  });
});
