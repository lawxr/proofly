/**
 * @proofly/api - Servidor Modular REST y Enrutador Hexagonal
 */

import http from 'node:http';
import {
  UserEntity,
  UserRole,
  KycStatus,
  FreelancerTier,
  SimulateQuoteUseCase,
  CreateInvoiceOperationUseCase,
  CreateMilestoneOperationUseCase,
  ConfirmMilestoneUseCase,
  AcceptQuoteUseCase,
  SimulateParticipationUseCase,
  PurchaseParticipationUseCase,
  ReconcileBankReceiptUseCase
} from '@proofly/domain';

import {
  InMemoryOperationRepository,
  InMemoryInvestmentRepository,
  InMemoryUserRepository,
  InMemoryOutboxRepository
} from './adapters/in-memory/in-memory-repositories.ts';

import {
  SandboxInvoiceVerificationAdapter,
  SandboxMilestoneConfirmationAdapter
} from './adapters/sandbox-mocks/sandbox-adapters.ts';

export interface AppDependencies {
  operationRepo: InMemoryOperationRepository;
  investmentRepo: InMemoryInvestmentRepository;
  userRepo: InMemoryUserRepository;
  outboxRepo: InMemoryOutboxRepository;
  invoiceVerifier: SandboxInvoiceVerificationAdapter;
  milestoneNotifier: SandboxMilestoneConfirmationAdapter;
  serverSecret: string;
}

export function createDependencies(serverSecret = 'proofly-dev-secret-salt-2026-super-secure-32-chars'): AppDependencies {
  const operationRepo = new InMemoryOperationRepository();
  const investmentRepo = new InMemoryInvestmentRepository();
  const userRepo = new InMemoryUserRepository();
  const outboxRepo = new InMemoryOutboxRepository();
  const invoiceVerifier = new SandboxInvoiceVerificationAdapter();
  const milestoneNotifier = new SandboxMilestoneConfirmationAdapter();

  return {
    operationRepo,
    investmentRepo,
    userRepo,
    outboxRepo,
    invoiceVerifier,
    milestoneNotifier,
    serverSecret
  };
}

export async function seedDemoData(deps: AppDependencies): Promise<{
  freelancerId: string;
  investor1Id: string;
  investor2Id: string;
}> {
  const freelancer = new UserEntity({
    id: 'freelancer-demo-01',
    email: 'freelancer@proofly.co',
    legalName: 'Mateo Morales (Freelance UI/UX)',
    taxId: '1098765432',
    role: UserRole.FREELANCER,
    kycStatus: KycStatus.VERIFIED,
    tier: FreelancerTier.TIER_1_SEED,
    availableLimitCents: 200000000n, // $ 2.000.000 COP
    executionScore: 94,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const investor1 = new UserEntity({
    id: 'investor-demo-01',
    email: 'investor1@proofly.co',
    legalName: 'Camila Rodriguez (Financiador)',
    taxId: '52987123',
    role: UserRole.INVESTOR,
    kycStatus: KycStatus.VERIFIED,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const investor2 = new UserEntity({
    id: 'investor-demo-02',
    email: 'investor2@proofly.co',
    legalName: 'Santiago Vargas (Financiador)',
    taxId: '79845120',
    role: UserRole.INVESTOR,
    kycStatus: KycStatus.VERIFIED,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  await deps.userRepo.save(freelancer);
  await deps.userRepo.save(investor1);
  await deps.userRepo.save(investor2);

  return {
    freelancerId: freelancer.id,
    investor1Id: investor1.id,
    investor2Id: investor2.id
  };
}

function sendJson(res: http.ServerResponse, statusCode: number, payload: unknown): void {
  const body = JSON.stringify(payload, (_key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(body);
}

function parseBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw || raw.trim() === '') {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

export function createProoflyApiServer(deps: AppDependencies): http.Server {
  const simulateQuoteUseCase = new SimulateQuoteUseCase();
  const createInvoiceUseCase = new CreateInvoiceOperationUseCase(
    deps.operationRepo,
    deps.userRepo,
    deps.outboxRepo,
    deps.invoiceVerifier,
    deps.serverSecret
  );
  const createMilestoneUseCase = new CreateMilestoneOperationUseCase(
    deps.operationRepo,
    deps.userRepo,
    deps.outboxRepo,
    deps.milestoneNotifier,
    deps.serverSecret
  );
  const confirmMilestoneUseCase = new ConfirmMilestoneUseCase(deps.operationRepo, deps.outboxRepo);
  const acceptQuoteUseCase = new AcceptQuoteUseCase(deps.operationRepo, deps.outboxRepo);
  const simulateParticipationUseCase = new SimulateParticipationUseCase(deps.operationRepo);
  const purchaseParticipationUseCase = new PurchaseParticipationUseCase(
    deps.operationRepo,
    deps.investmentRepo,
    deps.userRepo,
    deps.outboxRepo
  );
  const reconcileBankReceiptUseCase = new ReconcileBankReceiptUseCase(
    deps.operationRepo,
    deps.investmentRepo,
    deps.outboxRepo
  );

  return http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;
    const method = req.method?.toUpperCase();

    // CORS Preflight
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
      res.end();
      return;
    }

    try {
      // GET /health
      if (method === 'GET' && (pathname === '/health' || pathname === '/api/v1/health')) {
        sendJson(res, 200, {
          status: 'UP',
          service: 'Proofly Core API',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // POST /api/v1/quotes/simulate
      if (method === 'POST' && pathname === '/api/v1/quotes/simulate') {
        const body = await parseBody(req);
        const nominal = BigInt(body.nominalAmountCents as string | number);
        const termDays = Number(body.termDays);
        const monthlyRate = body.monthlyDiscountRate ? Number(body.monthlyDiscountRate) : undefined;

        const result = simulateQuoteUseCase.execute({
          nominalAmountCents: nominal,
          termDays,
          monthlyDiscountRate: monthlyRate
        });

        sendJson(res, 200, result);
        return;
      }

      // POST /api/v1/operations/invoice
      if (method === 'POST' && pathname === '/api/v1/operations/invoice') {
        const body = await parseBody(req);
        const freelancerId = (body.freelancerId as string) || 'freelancer-demo-01';
        const xmlContent = (body.xmlContent as string) || '<Invoice><cac:InvoiceLine>Design</cac:InvoiceLine></Invoice>';

        const operation = await createInvoiceUseCase.execute({
          freelancerId,
          xmlContent,
          monthlyDiscountRate: body.monthlyDiscountRate ? Number(body.monthlyDiscountRate) : undefined
        });

        sendJson(res, 201, operation);
        return;
      }

      // POST /api/v1/operations/milestone
      if (method === 'POST' && pathname === '/api/v1/operations/milestone') {
        const body = await parseBody(req);
        const operation = await createMilestoneUseCase.execute({
          freelancerId: (body.freelancerId as string) || 'freelancer-demo-01',
          contractUuid: (body.contractUuid as string) || crypto.randomUUID(),
          milestoneIndex: Number(body.milestoneIndex ?? 1),
          title: (body.title as string) || 'Hito de Desarrollo',
          deliverableUrl: (body.deliverableUrl as string) || 'https://github.com/deliverable',
          payerNit: (body.payerNit as string) || '901234567-8',
          payerLegalName: (body.payerLegalName as string) || 'Cliente Corporativo SAS',
          payerEmail: (body.payerEmail as string) || 'contacto@cliente.com',
          nominalAmountCents: BigInt(body.nominalAmountCents as string | number),
          termDays: Number(body.termDays ?? 30),
          dueDate: (body.dueDate as string) || '2026-12-30',
          monthlyDiscountRate: body.monthlyDiscountRate ? Number(body.monthlyDiscountRate) : undefined
        });

        sendJson(res, 201, operation);
        return;
      }

      // POST /api/v1/milestones/:token/confirm
      const confirmMatch = pathname.match(/^\/api\/v1\/milestones\/([^/]+)\/confirm$/);
      if (method === 'POST' && confirmMatch) {
        const token = confirmMatch[1]!;
        const operation = await confirmMilestoneUseCase.execute({
          token,
          confirmedByIp: req.socket.remoteAddress
        });
        sendJson(res, 200, {
          message: 'Milestone confirmed successfully by payer',
          operation
        });
        return;
      }

      // POST /api/v1/operations/:id/accept-quote
      const acceptMatch = pathname.match(/^\/api\/v1\/operations\/([^/]+)\/accept-quote$/);
      if (method === 'POST' && acceptMatch) {
        const operationId = acceptMatch[1]!;
        const body = await parseBody(req);
        const operation = await acceptQuoteUseCase.execute({
          operationId,
          freelancerId: (body.freelancerId as string) || 'freelancer-demo-01',
          electronicSignatureHash: (body.electronicSignatureHash as string) || `0xsig${Date.now()}`
        });
        sendJson(res, 200, {
          message: 'Quote accepted and cession recorded',
          operation
        });
        return;
      }

      // GET /api/v1/marketplace
      if (method === 'GET' && pathname === '/api/v1/marketplace') {
        const minTerm = url.searchParams.get('minTermDays');
        const maxTerm = url.searchParams.get('maxTermDays');
        const operations = await deps.operationRepo.listMarketplace({
          minTermDays: minTerm ? parseInt(minTerm, 10) : undefined,
          maxTermDays: maxTerm ? parseInt(maxTerm, 10) : undefined
        });
        sendJson(res, 200, operations);
        return;
      }

      // POST /api/v1/marketplace/:id/simulate
      const simMatch = pathname.match(/^\/api\/v1\/marketplace\/([^/]+)\/simulate$/);
      if (method === 'POST' && simMatch) {
        const operationId = simMatch[1]!;
        const body = await parseBody(req);
        const result = await simulateParticipationUseCase.execute({
          operationId,
          amountToFundCents: BigInt(body.amountToFundCents as string | number)
        });
        sendJson(res, 200, result);
        return;
      }

      // POST /api/v1/operations/:id/participations
      const partMatch = pathname.match(/^\/api\/v1\/operations\/([^/]+)\/participations$/);
      if (method === 'POST' && partMatch) {
        const operationId = partMatch[1]!;
        const body = await parseBody(req);
        const result = await purchaseParticipationUseCase.execute({
          operationId,
          investorId: (body.investorId as string) || 'investor-demo-01',
          fundedCapitalCents: BigInt(body.fundedCapitalCents as string | number)
        });
        sendJson(res, 201, result);
        return;
      }

      // POST /api/v1/settlement/reconcile
      if (method === 'POST' && pathname === '/api/v1/settlement/reconcile') {
        const body = await parseBody(req);
        const result = await reconcileBankReceiptUseCase.execute({
          operationId: body.operationId as string,
          bankReceiptHash: (body.bankReceiptHash as string) || `0xreceipt${Date.now()}`,
          receivedAmountCents: BigInt(body.receivedAmountCents as string | number),
          bankTransactionRef: (body.bankTransactionRef as string) || `ACH-${Date.now()}`
        });
        sendJson(res, 200, result);
        return;
      }

      // 404 Route Not Found
      sendJson(res, 404, {
        error: 'Not Found',
        message: `Endpoint [${method} ${pathname}] not found on Proofly Core API`
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal Server Error';
      const statusCode = message.includes('not found')
        ? 404
        : message.includes('Duplicate')
        ? 409
        : message.includes('Unauthorized')
        ? 401
        : 400;

      sendJson(res, statusCode, {
        error: message,
        statusCode
      });
    }
  });
}

