/**
 * @proofly/domain - Puerto de Repositorio de Outbox
 */

import { OutboxEvent } from '../models/outbox.ts';
import type { OutboxEventProps } from '../models/outbox.ts';

export interface OutboxRepositoryPort {
  recordEvent(event: Omit<OutboxEventProps, 'id' | 'createdAt' | 'status' | 'retryCount'>): Promise<OutboxEvent>;
  fetchPendingEvents(batchSize: number): Promise<OutboxEvent[]>;
  markCompleted(id: string): Promise<void>;
  markFailed(id: string, reason: string): Promise<void>;
}
