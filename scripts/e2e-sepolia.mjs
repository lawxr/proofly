// End-to-end mUSDC vault run on Ethereum Sepolia using the real app service,
// PostgreSQL and a separately running worker (npm run dev --workspace @proofly/worker).
//
// The demo financier wallet is the operator wallet (key read from .env.local,
// never printed). Steps: mint demo mUSDC -> create invoice -> accept -> worker
// opens on-chain -> approve -> deposit -> confirmDeposit (COP sync) -> settle ->
// worker settles on-chain -> claim -> confirmClaim. Results go to
// docs/plan/USDC-SEPOLIA-MVP/e2e-sepolia-report.json.
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createPublicClient, createWalletClient, http, getAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
process.loadEnvFile(resolve(root, '.env.local'));
const env = process.env;
const { PROOFLY_OPERATIONS_ABI, MOCK_USDC_ABI } = await import('../packages/contracts-sdk/src/index.ts');
const { createDependenciesFromEnv } = await import('../apps/api/src/app.ts');
const { createVaultLedgerFromEnv } = await import('../apps/api/src/adapters/blockchain/viem-vault-ledger.ts');
const { RegisterUserUseCase, VerifyIdentityUseCase } = await import('../packages/domain/src/index.ts');
const { createAppService } = await import('./app-service.mjs');

const account = privateKeyToAccount(env.OPERATOR_PRIVATE_KEY.trim());
const transport = http(env.RPC_URL, { retryCount: 5, retryDelay: 1000, timeout: 30_000 });
const pub = createPublicClient({ chain: sepolia, transport });
const wallet = createWalletClient({ account, chain: sepolia, transport });
const OPS = getAddress(env.PROOFLY_OPERATIONS_ADDRESS);
const USDC = getAddress(env.MOCK_USDC_ADDRESS);
const UNIT = 1_000_000n;
const read = (address, abi, functionName, args = []) => pub.readContract({ address, abi, functionName, args });
const report = { startedAt: new Date().toISOString(), network: 'Ethereum Sepolia (11155111)', operations: OPS, mockUsdc: USDC, financier: account.address, steps: [], checks: [] };
const step = (name, data = {}) => { report.steps.push({ name, at: new Date().toISOString(), ...data }); console.log(`✔ ${name}`, JSON.stringify(data, (_k, v) => typeof v === 'bigint' ? v.toString() : v)); save(); };
const check = (name, ok, detail) => { report.checks.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' · ' + detail : ''}`); save(); if (!ok) throw new Error(`Check failed: ${name}`); };
function save() { saveReport(); }
const saveReport = () => writeFileSync(resolve(root, 'docs/plan/USDC-SEPOLIA-MVP/e2e-sepolia-report.json'),
  JSON.stringify(report, (_k, v) => typeof v === 'bigint' ? v.toString() : v, 2));
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function send(label, request) {
  // Public RPCs load-balance across nodes that may lag; estimate on the latest
  // block and add a 50 % margin so a stale estimate cannot run out of gas.
  const estimate = await pub.estimateContractGas({ account, ...request, blockTag: 'latest' });
  const gas = (estimate * 3n) / 2n < 80_000n ? 80_000n : (estimate * 3n) / 2n;
  const hash = await wallet.writeContract({ ...request, gas });
  const receipt = await pub.waitForTransactionReceipt({ hash, timeout: 180_000 });
  if (receipt.status !== 'success') throw new Error(`${label} reverted: ${hash}`);
  step(label, { txHash: hash, block: receipt.blockNumber, etherscan: `https://sepolia.etherscan.io/tx/${hash}` });
  return receipt;
}
async function waitFor(label, fn, timeoutMs = 240_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await fn().catch(() => undefined);
    if (value) return value;
    if (Date.now() > deadline) throw new Error(`Timeout waiting for ${label}`);
    await sleep(4000);
  }
}

try {
  const deps = createDependenciesFromEnv(env);
  const ledger = createVaultLedgerFromEnv(env);
  const app = await createAppService(deps, { vaultLedger: ledger, copPerUsdc: BigInt(env.DEMO_COP_PER_USDC || 4000) });

  // --- 0. Snapshot before
  const before = { usdc: await read(USDC, MOCK_USDC_ABI, 'balanceOf', [account.address]), eth: await pub.getBalance({ address: account.address }) };
  step('snapshot inicial', { financierUsdcUnits: before.usdc, financierEthWei: before.eth });

  // --- 1. Demo mUSDC for deposit (97) + settlement profit (2), only if needed
  const needed = 100n * UNIT;
  if (before.usdc < needed) {
    await send('mint 100 mUSDC demo a la wallet financiadora/operadora', { address: USDC, abi: MOCK_USDC_ABI, functionName: 'mint', args: [account.address, needed - before.usdc] });
  }

  // --- 2. Fresh test users (freelancer + financier) in PostgreSQL
  const stamp = Date.now();
  const register = new RegisterUserUseCase(deps.userRepo);
  const verify = new VerifyIdentityUseCase(deps.userRepo, deps.kycVerifier);
  const freelancer = await register.execute({ email: `e2e-freelancer-${stamp}@proofly.test`, taxId: `10${String(stamp).slice(-8)}`, password: 'e2e-clave-segura' });
  await verify.execute({ userId: freelancer.id, legalName: 'Freelancer Prueba E2E' });
  const investor = await register.execute({ email: `e2e-financier-${stamp}@proofly.test`, taxId: `20${String(stamp).slice(-8)}`, password: 'e2e-clave-segura' });
  await verify.execute({ userId: investor.id, legalName: 'Financiador Prueba E2E' });
  const inv = await deps.userRepo.findById(investor.id);
  inv.walletAddress = account.address; inv.updatedAt = new Date();
  await deps.userRepo.save(inv);
  step('usuarios de prueba creados', { freelancerId: freelancer.id, investorId: investor.id, investorWallet: account.address });

  // --- 3. Create invoice: $400.000 COP, 30 days -> advance $388.000 = 97 mUSDC
  const created = await app.execute(freelancer.id, 'create', { assetType: 'INVOICE', title: 'Prueba E2E mUSDC', payerLegalName: 'Empresa Demo SAS', nominalAmountCents: '40000000', termDays: 30, checks: true });
  check('factura creada con concepto y empresa', created.title === 'Prueba E2E mUSDC' && created.payerLegalName === 'Empresa Demo SAS', `${created.title} · ${created.payerLegalName} · ${created.status}`);
  check('adelanto 38.800.000 centavos (97 mUSDC)', created.advanceAmountCents === '38800000', created.advanceAmountCents);
  const operationId = created.id;
  report.operationId = operationId;
  await app.execute(freelancer.id, 'accept', { id: operationId, accepted: true });
  step('cotización aceptada → APPROVED_PENDING_FUNDING', { operationId });

  // --- 4. Deposit is not possible before the worker opens the operation
  const early = (await app.snapshot(investor.id)).operations.find(o => o.id === operationId);
  step('estado antes de abrir on-chain', { phase: early?.chain?.phase, tokenId: early?.chain?.tokenId ?? null });

  // --- 5. Worker opens it on-chain
  const vault = await waitFor('worker openOperation', () => ledger.getOperation(operationId));
  check('worker abrió la operación (hmacToTokenId ≠ 0)', vault.tokenId > 0n, `token ${vault.tokenId}`);
  check('meta on-chain = adelanto', vault.targetCents === 38_800_000n, String(vault.targetCents));
  report.tokenId = vault.tokenId;
  const listed = (await deps.outboxRepo.listByAggregate('OPERATION', operationId)).find(e => e.eventType === 'OPERATION_LISTED_ON_MARKETPLACE');
  await waitFor('LISTED COMPLETED', async () => (await deps.outboxRepo.listByAggregate('OPERATION', operationId)).find(e => e.id === listed.id && e.status === 'COMPLETED'));

  // --- 6. Off-chain participate must be rejected in vault mode
  let rejected = false;
  try { await app.execute(investor.id, 'participate', { id: operationId, amountCents: '38800000' }); } catch { rejected = true; }
  check('aporte COP sin depósito on-chain rechazado', rejected);

  // --- 7. Approve + deposit 97 mUSDC
  const amount = 97n * UNIT;
  await send('approve 97 mUSDC', { address: USDC, abi: MOCK_USDC_ABI, functionName: 'approve', args: [OPS, amount] });
  const depositReceipt = await send('depositForOperation 97 mUSDC', { address: OPS, abi: PROOFLY_OPERATIONS_ABI, functionName: 'depositForOperation', args: [vault.chainKey, amount] });
  const fundedUsdc = await read(OPS, PROOFLY_OPERATIONS_ABI, 'fundedUsdcByOperation', [vault.tokenId]);
  check('fundedUsdcByOperation = 97 mUSDC', fundedUsdc === amount, String(fundedUsdc));

  // --- 8. COP sync from the confirmed receipt (idempotent)
  const sync = await app.execute(investor.id, 'confirmDeposit', { id: operationId, txHash: depositReceipt.transactionHash });
  check('depósito sincronizado en COP', sync.deposit.sharesCents === '38800000' && sync.deposit.isNew === true, `${sync.deposit.sharesCents} centavos`);
  check('operación ACTIVE_FUNDED off-chain', sync.operation.status === 'ACTIVE_FUNDED', sync.operation.status);
  const again = await app.execute(investor.id, 'confirmDeposit', { id: operationId, txHash: depositReceipt.transactionHash });
  check('reenvío del mismo depósito no duplica', again.deposit.isNew === false);
  const opRow = await deps.operationRepo.findById(operationId);
  check('PostgreSQL fundedCapitalCents = 38.800.000', opRow.fundedCapitalCents === 38_800_000n, String(opRow.fundedCapitalCents));

  // --- 9. Settle (Registrar recaudo) only allowed when fully funded and consistent
  const pre = (await app.snapshot(investor.id)).operations.find(o => o.id === operationId);
  check('Registrar recaudo habilitado (settleAllowed)', pre.chain?.settleAllowed === true, pre.chain?.state);
  const settled = await app.execute(freelancer.id, 'settle', { id: operationId });
  const payout = settled.investorDistributions.reduce((s, d) => s + BigInt(d.totalDistributedCents), 0n);
  check('recaudo off-chain: capital + ganancia = 39.600.000 centavos (99 mUSDC)', payout === 39_600_000n, String(payout));

  // --- 10. Worker settles on-chain
  const settledVault = await waitFor('worker fundAndSettle', async () => { const v = await ledger.getOperation(operationId); return v?.state === 'Settled' ? v : undefined; });
  check('estado on-chain Settled', settledVault.state === 'Settled');
  check('pool de ganancia = 2 mUSDC', settledVault.profitPoolUsdcUnits === 2n * UNIT, String(settledVault.profitPoolUsdcUnits));
  const settleEvent = (await deps.outboxRepo.listByAggregate('OPERATION', operationId)).find(e => e.eventType === 'OPERATION_SETTLED');
  await waitFor('SETTLED COMPLETED', async () => (await deps.outboxRepo.listByAggregate('OPERATION', operationId)).find(e => e.id === settleEvent.id && e.status === 'COMPLETED'));
  step('worker liquidó on-chain', { tokenId: settledVault.tokenId, settledCents: settledVault.settledCents });

  // --- 11. Claim capital + profit
  const claimable = await read(OPS, PROOFLY_OPERATIONS_ABI, 'claimableUsdc', [vault.tokenId, account.address]);
  check('claimableUsdc = 99 mUSDC', claimable === 99n * UNIT, String(claimable));
  const balBefore = await read(USDC, MOCK_USDC_ABI, 'balanceOf', [account.address]);
  const claimReceipt = await send('claimSettlement', { address: OPS, abi: PROOFLY_OPERATIONS_ABI, functionName: 'claimSettlement', args: [vault.tokenId] });
  const balAfter = await read(USDC, MOCK_USDC_ABI, 'balanceOf', [account.address]);
  check('wallet recibió 99 mUSDC (97 capital + 2 ganancia)', balAfter - balBefore === 99n * UNIT, `${balAfter - balBefore} unidades`);
  check('ERC-1155 quemado', (await read(OPS, PROOFLY_OPERATIONS_ABI, 'balanceOf', [account.address, vault.tokenId])) === 0n);
  let doubleClaim = false;
  try { await pub.simulateContract({ account, address: OPS, abi: PROOFLY_OPERATIONS_ABI, functionName: 'claimSettlement', args: [vault.tokenId] }); } catch { doubleClaim = true; }
  check('segundo claim revierte', doubleClaim);

  // --- 12. Claim recorded off-chain + final snapshot
  const claim = await app.execute(investor.id, 'confirmClaim', { id: operationId, txHash: claimReceipt.transactionHash });
  check('retiro registrado', claim.claim.isNew === true);
  const final = await app.snapshot(investor.id);
  const finalOp = final.operations.find(o => o.id === operationId);
  const finalInv = final.investments.find(i => i.operationId === operationId);
  check('snapshot: operación SETTLED y token Settled', finalOp.status === 'SETTLED' && finalOp.chain?.state === 'Settled');
  check('snapshot: inversión con hashes de depósito y retiro', Boolean(finalInv.chain?.depositTxHash && finalInv.chain?.claimTxHash), `${finalInv.chain?.depositTxHash} / ${finalInv.chain?.claimTxHash}`);
  report.final = { operationStatus: finalOp.status, chainState: finalOp.chain?.state, investment: finalInv.chain, settlement: finalInv.settlement };
  report.result = 'PASS';
} catch (error) {
  report.result = 'FAIL';
  report.error = error instanceof Error ? error.message : String(error);
  console.error('E2E FAIL:', report.error);
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  save();
  setTimeout(() => process.exit(process.exitCode ?? 0), 500);
}
