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
  /** Devuelve el evento a PENDING para reintentarlo (errores transitorios de RPC). */
  markRetry?(id: string, reason: string): Promise<void>;
  /** Eventos de un agregado, del más antiguo al más reciente (pruebas on-chain registradas). */
  listByAggregate?(aggregateType: string, aggregateId: string): Promise<OutboxEvent[]>;
}
