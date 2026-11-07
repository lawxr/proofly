/**
 * @proofly/domain - Máquina de Estados Canónica
 */

export const OperationStatus = {
  DRAFT: 'DRAFT',
  PENDING_CLIENT_CONFIRMATION: 'PENDING_CLIENT_CONFIRMATION',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  QUOTED: 'QUOTED',
  APPROVED_PENDING_FUNDING: 'APPROVED_PENDING_FUNDING',
  ACTIVE_FUNDED: 'ACTIVE_FUNDED',
  DISBURSED: 'DISBURSED',
  SETTLED: 'SETTLED',
  PARTIALLY_SETTLED_OVERDUE: 'PARTIALLY_SETTLED_OVERDUE',
  REJECTED_CANCELLED: 'REJECTED_CANCELLED'
} as const;

export type OperationStatus = (typeof OperationStatus)[keyof typeof OperationStatus];

export interface StateTransitionEvent {
  from: OperationStatus;
  to: OperationStatus;
  event: string;
}

export class OperationStateMachine {
  private static readonly VALID_TRANSITIONS: Record<OperationStatus, readonly OperationStatus[]> = {
    [OperationStatus.DRAFT]: [
      OperationStatus.PENDING_CLIENT_CONFIRMATION,
      OperationStatus.PENDING_VERIFICATION,
      OperationStatus.REJECTED_CANCELLED
    ],
    [OperationStatus.PENDING_CLIENT_CONFIRMATION]: [
      OperationStatus.QUOTED,
      OperationStatus.REJECTED_CANCELLED
    ],
    [OperationStatus.PENDING_VERIFICATION]: [
      OperationStatus.QUOTED,
      OperationStatus.REJECTED_CANCELLED
    ],
    [OperationStatus.QUOTED]: [
      OperationStatus.APPROVED_PENDING_FUNDING,
      OperationStatus.REJECTED_CANCELLED
    ],
    [OperationStatus.APPROVED_PENDING_FUNDING]: [
      OperationStatus.ACTIVE_FUNDED,
      OperationStatus.REJECTED_CANCELLED
    ],
    [OperationStatus.ACTIVE_FUNDED]: [
      OperationStatus.DISBURSED
    ],
    [OperationStatus.DISBURSED]: [
      OperationStatus.SETTLED,
      OperationStatus.PARTIALLY_SETTLED_OVERDUE
    ],
    [OperationStatus.PARTIALLY_SETTLED_OVERDUE]: [
      OperationStatus.SETTLED
    ],
    [OperationStatus.SETTLED]: [],
    [OperationStatus.REJECTED_CANCELLED]: []
  };

  public static canTransition(current: OperationStatus, next: OperationStatus): boolean {
    const allowed = this.VALID_TRANSITIONS[current];
    return allowed ? allowed.includes(next) : false;
  }

  public static assertCanTransition(current: OperationStatus, next: OperationStatus): void {
    if (!this.canTransition(current, next)) {
      throw new Error(`Invalid state transition from ${current} to ${next}`);
    }
  }
}
