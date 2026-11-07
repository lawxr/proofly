/**
 * @proofly/domain - Modelo de Evento Outbox
 */

export const OutboxStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type OutboxStatus = typeof OutboxStatus[keyof typeof OutboxStatus];

export interface OutboxEventProps {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  retryCount: number;
  lastError?: string;
  createdAt: Date;
  processedAt?: Date;
}

export class OutboxEvent {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  retryCount: number;
  lastError?: string;
  createdAt: Date;
  processedAt?: Date;

  constructor(props: OutboxEventProps) {
    this.id = props.id;
    this.aggregateType = props.aggregateType;
    this.aggregateId = props.aggregateId;
    this.eventType = props.eventType;
    this.payload = props.payload;
    this.status = props.status;
    this.retryCount = props.retryCount;
    this.lastError = props.lastError;
    this.createdAt = props.createdAt;
    this.processedAt = props.processedAt;
  }
}
