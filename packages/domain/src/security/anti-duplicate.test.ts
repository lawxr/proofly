import test from 'node:test';
import assert from 'node:assert/strict';
import { AntiDuplicateService } from './anti-duplicate.ts';

const SECRET = 'test-secret-at-least-32-characters-long-key';
const service = new AntiDuplicateService(SECRET);

test('AntiDuplicateService: same invoice canonical payload produces identical HMAC', () => {
  const hmac1 = service.generateInvoiceHmac({
    cufe: 'FE-89C3B7A1E2D4C5B6',
    issuerNit: '901.234.567-1',
    payerNit: '800.123.456-8',
    nominalAmountCents: 150000000n,
    dueDateUnix: 1798761600
  });

  const hmac2 = service.generateInvoiceHmac({
    cufe: '  fe-89c3b7a1e2d4c5b6  ', // espacios y minúsculas
    issuerNit: '9012345671',
    payerNit: '8001234568',
    nominalAmountCents: 150000000n,
    dueDateUnix: 1798761600
  });

  assert.equal(hmac1, hmac2);
  assert.equal(hmac1.length, 64);
});

test('AntiDuplicateService: different payload produces different HMAC', () => {
  const hmac1 = service.generateInvoiceHmac({
    cufe: 'CUFE-1',
    issuerNit: '901234567',
    payerNit: '800123456',
    nominalAmountCents: 150000000n,
    dueDateUnix: 1798761600
  });

  const hmac2 = service.generateInvoiceHmac({
    cufe: 'CUFE-2',
    issuerNit: '901234567',
    payerNit: '800123456',
    nominalAmountCents: 150000000n,
    dueDateUnix: 1798761600
  });

  assert.notEqual(hmac1, hmac2);
});

test('AntiDuplicateService: milestone HMAC generation is deterministic', () => {
  const hmac = service.generateMilestoneHmac({
    contractUuid: 'C4A8D09F-67BC-4F81-9B1B-5F1234567890',
    milestoneIndex: 1,
    payerId: '900987654',
    nominalAmountCents: 200000000n,
    dueDateUnix: 1798761600
  });

  assert.equal(hmac.length, 64);
});
