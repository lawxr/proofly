import test from 'node:test';
import assert from 'node:assert/strict';
import { OperationStateMachine, OperationStatus } from './operation-state.ts';

test('OperationStateMachine: valid transitions follow canonical lifecycle', () => {
  assert.equal(OperationStateMachine.canTransition(OperationStatus.DRAFT, OperationStatus.PENDING_VERIFICATION), true);
  assert.equal(OperationStateMachine.canTransition(OperationStatus.PENDING_VERIFICATION, OperationStatus.QUOTED), true);
  assert.equal(OperationStateMachine.canTransition(OperationStatus.QUOTED, OperationStatus.APPROVED_PENDING_FUNDING), true);
  assert.equal(OperationStateMachine.canTransition(OperationStatus.APPROVED_PENDING_FUNDING, OperationStatus.ACTIVE_FUNDED), true);
  assert.equal(OperationStateMachine.canTransition(OperationStatus.ACTIVE_FUNDED, OperationStatus.DISBURSED), true);
  assert.equal(OperationStateMachine.canTransition(OperationStatus.DISBURSED, OperationStatus.SETTLED), true);
});

test('OperationStateMachine: invalid transitions throw error', () => {
  assert.equal(OperationStateMachine.canTransition(OperationStatus.DRAFT, OperationStatus.SETTLED), false);
  assert.throws(() => {
    OperationStateMachine.assertCanTransition(OperationStatus.DRAFT, OperationStatus.SETTLED);
  });
  assert.throws(() => {
    OperationStateMachine.assertCanTransition(OperationStatus.SETTLED, OperationStatus.DRAFT);
  });
});
