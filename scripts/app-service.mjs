import { randomBytes, randomUUID, createHash } from 'node:crypto';
import {
  UserEntity, SimulateQuoteUseCase, CreateInvoiceOperationUseCase, CreateMilestoneOperationUseCase,
  ConfirmMilestoneUseCase, AcceptQuoteUseCase, SimulateParticipationUseCase,
  PurchaseParticipationUseCase, ReconcileBankReceiptUseCase, TiersPolicy, FreelancerTier,
} from '../packages/domain/src/index.ts';

const plain = value => JSON.parse(JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? item.toString() : item));
const DAY = 86400000;

/**
 * Application service: all financial mutations go through the canonical domain,
 * scoped to the authenticated user (meId comes from the session, per request).
 * Receives a shared `deps` so auth and the app use the same user repository.
 */
export async function createAppService(deps) {
  let tail = Promise.resolve();
  if (deps.milestoneNotifier) deps.milestoneNotifier.sendConfirmationLink = async () => true;
  const quote = new SimulateQuoteUseCase();
  const confirm = new ConfirmMilestoneUseCase(deps.operationRepo, deps.outboxRepo);
  const accept = new AcceptQuoteUseCase(deps.operationRepo, deps.outboxRepo);
  const simulate = new SimulateParticipationUseCase(deps.operationRepo);
  const purchase = new PurchaseParticipationUseCase(deps.operationRepo, deps.investmentRepo, deps.userRepo, deps.outboxRepo);
  const reconcile = new ReconcileBankReceiptUseCase(deps.operationRepo, deps.investmentRepo, deps.outboxRepo);
  // All operations relevant to `meId`: the market supply (funding-open), the
  // user's own operations in any status, and any operation the user has invested
  // in (even once it leaves the market). All come from the repository, so they
  // survive a process restart with Postgres. Pass no id for market-only views.
  const allOperations = async (meId) => {
    const byId = new Map();
    if (typeof deps.operationRepo.listMarketplace === 'function') {
      try { for (const op of await deps.operationRepo.listMarketplace()) byId.set(op.id, op); } catch { /* repo without marketplace listing */ }
    }
    if (meId && typeof deps.operationRepo.listByFreelancer === 'function') {
      try { for (const op of await deps.operationRepo.listByFreelancer(meId)) if (!byId.has(op.id)) byId.set(op.id, op); } catch { /* repo without per-freelancer listing */ }
    }
    if (meId) {
      const invested = await deps.investmentRepo.findByInvestorId(meId);
      for (const inv of invested) {
        if (byId.has(inv.operationId)) continue;
        const op = await deps.operationRepo.findById(inv.operationId);
        if (op) byId.set(op.id, op);
      }
    }
    return [...byId.values()];
  };
  const eventsFor = async userId => (await deps.activityRepo.listByUser(userId)).map(e => ({ id: e.id, operationId: e.operationId, kind: e.kind, title: e.title, date: e.date }));
  const serialize = operation => {
    const { hmacKey: _hmac, confirmationToken: _token, electronicSignatureHash: _signature, ...safe } = operation;
    return plain({ ...safe, title: operation.title || 'Operación', effectiveAnnualRate: operation.effectiveAnnualRate || 0,
      remainingFundingCents: operation.remainingFundingCents() });
  };
  const record = (userId, operation, kind, title) =>
    deps.activityRepo.record({ userId, operationId: operation.id, kind, title, date: new Date().toISOString() });
  const enqueue = action => { const next = tail.then(action); tail = next.then(() => undefined, () => undefined); return next; };

  // A market counterparty that funds a person's own operations. Never a second
  // identity of the signed-in user; never appears in anyone's snapshot.
  const counterpartyId = 'market-counterparty';
  await deps.userRepo.save(new UserEntity({
    id: counterpartyId, email: 'counterparty@proofly.internal', legalName: 'Contraparte de mercado',
    taxId: '900000000', role: 'INVESTOR', kycStatus: 'VERIFIED', createdAt: new Date(), updatedAt: new Date()
  }));

  async function create(input, owner) {
    if (!['INVOICE', 'MILESTONE'].includes(input.assetType)) throw new Error('Select an invoice or a milestone.');
    if (typeof input.title !== 'string' || input.title.trim().length < 3 || input.title.length > 80) throw new Error('Enter a title between 3 and 80 characters.');
    if (!/^\d{1,15}$/.test(String(input.nominalAmountCents))) throw new Error('Invalid amount.');
    const amount = BigInt(input.nominalAmountCents);
    const term = Number(input.termDays);
    if (amount <= 0n || !Number.isInteger(term) || term < 15 || term > 90) throw new Error('Use a positive amount and a term between 15 and 90 days.');
    if (input.checks !== true) throw new Error('All acceptance checks must be complete.');
    const user = await deps.userRepo.findById(owner);
    const config = TiersPolicy.TIER_CONFIG[user.tier];
    const active = (await allOperations(owner)).filter(op => op.freelancerId === owner && !['SETTLED', 'REJECTED_CANCELLED'].includes(op.status));
    if (active.length >= config.maxActiveOperations) throw new Error('Your tier has reached its active operation limit.');
    const dueDate = new Date(Date.now() + term * DAY).toISOString().slice(0, 10);
    const payerLegalName = String(input.payerLegalName || 'Cliente corporativo').slice(0, 80);
    let operation;
    // Contract grouping (milestones only): reuse an existing contract the owner
    // supplied, or start a new one. The milestone index is the next free slot in
    // that contract, which also keeps the domain's anti-duplicate HMAC distinct
    // between milestones of the same contract.
    let contractId;
    let milestoneIndex;
    if (input.assetType === 'INVOICE') {
      const verifier = { verifyInvoice: async () => ({ isValid: true,
        events: ['030_RECEPCION', '032_BIENES_SERVICIOS', '033_ACEPTACION_TACITA'],
        payerNit: '901234567-8', payerLegalName, nominalAmountCents: amount, dueDate }) };
      operation = await new CreateInvoiceOperationUseCase(deps.operationRepo, deps.userRepo, deps.outboxRepo, verifier, deps.serverSecret)
        .execute({ freelancerId: owner, xmlContent: '<Invoice>Proofly</Invoice>' });
    } else {
      const requested = typeof input.contractId === 'string' && input.contractId.trim() ? input.contractId.trim() : null;
      const own = (await allOperations(owner)).filter(op => op.freelancerId === owner);
      if (requested && own.some(op => op.contractId === requested)) {
        contractId = requested;
        milestoneIndex = own.filter(op => op.contractId === requested).reduce((max, op) => Math.max(max, op.milestoneIndex || 0), 0) + 1;
      } else {
        contractId = randomUUID();
        milestoneIndex = 1;
      }
      operation = await new CreateMilestoneOperationUseCase(deps.operationRepo, deps.userRepo, deps.outboxRepo, deps.milestoneNotifier, deps.serverSecret)
        .execute({ freelancerId: owner, contractUuid: contractId, milestoneIndex, title: input.title,
          deliverableUrl: 'https://deliverable.example/op', payerNit: '901234567-8', payerLegalName,
          payerEmail: 'payer@example.invalid', nominalAmountCents: amount, termDays: term, dueDate });
    }
    const quotedRate = (await simulate.execute({ operationId: operation.id, amountToFundCents: operation.advanceAmountCents })).effectiveAnnualRate;
    const title = input.title.trim();
    await deps.operationRepo.setPresentation(operation.id, { title, effectiveAnnualRate: quotedRate, contractId, milestoneIndex });
    // Reflect the persisted presentation metadata on the in-hand entity so the
    // caller serializes the real values without an extra read.
    operation.title = title;
    operation.effectiveAnnualRate = quotedRate;
    operation.contractId = contractId;
    operation.milestoneIndex = milestoneIndex;
    return operation;
  }

  async function action(meId, name, input) {
    if (name === 'create') {
      const op = await create(input, meId);
      await record(meId, op, 'create', input.assetType === 'MILESTONE' ? 'Hito creado · confirmación pendiente' : 'Factura verificada');
      return serialize(op);
    }
    const operation = await deps.operationRepo.findById(String(input.id));
    if (!operation) throw new Error('Operation not found.');
    if (name === 'confirm') {
      if (!operation.confirmationToken) throw new Error('This operation has no pending confirmation.');
      await confirm.execute({ token: operation.confirmationToken, confirmedByIp: 'private' });
      await record(meId, operation, name, 'Confirmación del pagador');
    } else if (name === 'accept') {
      if (input.accepted !== true) throw new Error('Explicit quote acceptance is required.');
      await accept.execute({ operationId: operation.id, freelancerId: operation.freelancerId,
        electronicSignatureHash: createHash('sha256').update('acceptance:' + operation.id).digest('hex') });
      await record(meId, operation, name, 'Cotización aceptada');
    } else if (name === 'simulate' || name === 'participate') {
      if (!/^\d{1,15}$/.test(String(input.amountCents))) throw new Error('Invalid participation amount.');
      const asCounterparty = input.counterparty === true;
      const investorId = asCounterparty ? counterpartyId : meId;
      if (!asCounterparty && operation.freelancerId === meId) throw new Error('You cannot invest in your own operation.');
      const amount = BigInt(input.amountCents);
      const result = await simulate.execute({ operationId: operation.id, amountToFundCents: amount });
      if (name === 'simulate') return result;
      const existing = await deps.investmentRepo.findByInvestorId(investorId);
      if (existing.some(inv => inv.operationId === operation.id)) throw new Error('You already have a participation in this operation.');
      await purchase.execute({ operationId: operation.id, investorId, fundedCapitalCents: amount });
      await record(meId, operation, name, 'Participación registrada');
      return result;
    } else if (name === 'settle') {
      const result = await reconcile.execute({ operationId: operation.id, bankReceiptHash: randomBytes(32).toString('hex'),
        receivedAmountCents: operation.nominalAmountCents, bankTransactionRef: 'RCPT-' + randomUUID() });
      if (result.isFullySettled) {
        const owner = await deps.userRepo.findById(operation.freelancerId);
        const owned = (await allOperations(owner.id)).filter(op => op.freelancerId === owner.id);
        const completed = owned.filter(op => op.status === 'SETTLED').length;
        const tier = TiersPolicy.determineTier(completed, owner.executionScore || 0);
        const used = owned.filter(op => !['SETTLED', 'REJECTED_CANCELLED'].includes(op.status)).reduce((sum, op) => sum + op.nominalAmountCents, 0n);
        await deps.userRepo.updateTier(owner.id, tier, TiersPolicy.TIER_CONFIG[tier].maxQuotaCents - used);
      }
      await record(meId, operation, name, 'Recaudo y distribución');
      return result;
    } else throw new Error('Unknown action.');
    return serialize(operation);
  }

  // Rebuild an investment's projection from the persisted operation + amount.
  // SimulateParticipationUseCase is deterministic, so this survives a restart
  // without storing an ephemeral snapshot per investment.
  async function projectionFor(investment) {
    try { return await simulate.execute({ operationId: investment.operationId, amountToFundCents: investment.fundedCapitalCents }); }
    catch { return undefined; }
  }

  // Derive the investor's settlement share from the persisted operation when it
  // has fully settled, instead of caching the reconcile result in memory.
  async function settlementFor(investment) {
    const op = await deps.operationRepo.findById(investment.operationId);
    if (!op || op.status !== 'SETTLED') return undefined;
    const share = Number(investment.fundedCapitalCents) / Number(op.advanceAmountCents);
    const profit = BigInt(Math.floor(Number(op.commercialDiscountCents) * share));
    return { investorId: investment.investorId, capitalReturnedCents: investment.fundedCapitalCents,
      profitEarnedCents: profit, totalDistributedCents: investment.fundedCapitalCents + profit };
  }

  async function snapshot(meId) {
    const me = await deps.userRepo.findById(meId);
    if (!me) throw new Error('User not found.');
    const operations = await allOperations(meId);
    const investments = await deps.investmentRepo.findByInvestorId(meId);
    const name = me.legalName.replace(/\s*\(.*\)\s*$/, '').trim() || me.legalName;
    const investmentsOut = await Promise.all(investments.map(async investment => ({
      ...investment, projection: await projectionFor(investment), settlement: await settlementFor(investment),
    })));
    return plain({ me: { id: me.id, name, tier: me.tier, kycStatus: me.kycStatus,
      availableLimitCents: me.availableLimitCents, maxQuotaCents: me.tier ? TiersPolicy.TIER_CONFIG[me.tier].maxQuotaCents : '0',
      executionScore: me.executionScore },
      operations: operations.map(serialize), investments: investmentsOut, events: await eventsFor(meId) });
  }

  // Seed market supply once: other people's operations, available to invest in.
  async function seedMarket() {
    for (const [index, kind] of ['INVOICE', 'MILESTONE'].entries()) {
      const ownerId = `market-${index}`;
      if (await deps.userRepo.findById(ownerId)) continue;
      await deps.userRepo.save(new UserEntity({
        id: ownerId, email: `market${index}@example.invalid`, taxId: `MKT${index}`,
        legalName: ['Estudio Nube', 'Taller Forma'][index], role: 'FREELANCER', kycStatus: 'VERIFIED',
        tier: FreelancerTier.TIER_3_PRO, availableLimitCents: TiersPolicy.TIER_CONFIG[FreelancerTier.TIER_3_PRO].maxQuotaCents,
        executionScore: 92, createdAt: new Date(), updatedAt: new Date()
      }));
      const operation = await create({ assetType: kind, title: ['Diseño de identidad', 'Desarrollo de tienda'][index], nominalAmountCents: ['150000000', '120000000'][index], termDays: 30, checks: true }, ownerId);
      if (operation.confirmationToken) await confirm.execute({ token: operation.confirmationToken, confirmedByIp: 'seed' });
      await accept.execute({ operationId: operation.id, freelancerId: ownerId, electronicSignatureHash: 'seed-acceptance' });
    }
  }
  await seedMarket();

  return {
    execute: (meId, name, input = {}) => enqueue(async () => plain(await action(meId, name, input))),
    snapshot: meId => enqueue(async () => snapshot(meId)),
    async handle(req, res, ctx) {
      const reply = (status, payload) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(payload)); };
      const meId = ctx?.userId;
      if (!meId) return reply(401, { code: 'unauthenticated' });
      try {
        if (req.method === 'GET' && req.url.split('?')[0] === '/api/app') return reply(200, await this.snapshot(meId));
        if (req.method !== 'POST' || req.url !== '/api/app/action') return reply(404, { code: 'not_found' });
        let body = '';
        for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 16384) return reply(413, { message: 'Request is too large.' }); }
        const input = JSON.parse(body);
        const result = await this.execute(meId, input.action, input);
        return reply(200, result);
      } catch (error) { return reply(400, { message: error.message || 'This action is not available.' }); }
    },
  };
}
