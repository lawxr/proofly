/**
 * @proofly/domain - Puerto de Repositorio de Actividad del Usuario
 *
 * Feed de eventos que la interfaz muestra en actividad y notificaciones. Es
 * metadata de presentación, no parte del núcleo financiero; se persiste para
 * que la actividad sobreviva al reinicio del proceso.
 */

export interface ActivityEvent {
  id: string;
  userId: string;
  operationId: string;
  kind: string;
  title: string;
  date: string; // ISO 8601
}

export interface ActivityRepositoryPort {
  record(event: Omit<ActivityEvent, 'id' | 'date'> & { id?: string; date?: string }): Promise<ActivityEvent>;
  listByUser(userId: string): Promise<ActivityEvent[]>;
}
