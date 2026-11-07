/**
 * @proofly/worker - EVM Event Indexer
 * Indexa eventos de ProoflyOperations y ProoflyKYCRegistry en Base L2
 * Aplica ventana de seguridad de 12 bloques contra reorganizaciones (Reorg Protection)
 */

export interface RawLogEvent {
  blockNumber: bigint;
  transactionHash: string;
  eventName: 'OperationMinted' | 'OperationSettled' | 'KycStatusUpdated';
  data: Record<string, unknown>;
}

export interface IndexedChainEvent {
  id: string;
  blockNumber: bigint;
  transactionHash: string;
  eventName: string;
  data: Record<string, unknown>;
  indexedAt: Date;
}

export interface ChainLogProvider {
  getLatestBlockNumber(): Promise<bigint>;
  getLogs(fromBlock: bigint, toBlock: bigint): Promise<RawLogEvent[]>;
}

export class EVMEventIndexer {
  private logProvider: ChainLogProvider;
  private lastIndexedBlock: bigint;
  private readonly finalityWindowBlocks: bigint = 12n; // 12 bloques de confirmación en Base
  private indexedEvents: IndexedChainEvent[] = [];

  constructor(logProvider: ChainLogProvider, startBlock: bigint = 0n) {
    this.logProvider = logProvider;
    this.lastIndexedBlock = startBlock;
  }

  getLastIndexedBlock(): bigint {
    return this.lastIndexedBlock;
  }

  getIndexedEvents(): IndexedChainEvent[] {
    return [...this.indexedEvents];
  }

  async runIndexingCycle(): Promise<{ eventsCount: number; toBlock: bigint }> {
    const currentBlock = await this.logProvider.getLatestBlockNumber();
    if (currentBlock < this.finalityWindowBlocks) {
      return { eventsCount: 0, toBlock: this.lastIndexedBlock };
    }

    // Ventana segura: sólo indexar bloques con >= 12 confirmaciones
    const safeTargetBlock = currentBlock - this.finalityWindowBlocks;

    if (safeTargetBlock <= this.lastIndexedBlock) {
      return { eventsCount: 0, toBlock: this.lastIndexedBlock };
    }

    const fromBlock = this.lastIndexedBlock + 1n;
    const logs = await this.logProvider.getLogs(fromBlock, safeTargetBlock);

    for (const log of logs) {
      this.indexedEvents.push({
        id: crypto.randomUUID(),
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        eventName: log.eventName,
        data: log.data,
        indexedAt: new Date()
      });
    }

    this.lastIndexedBlock = safeTargetBlock;
    return {
      eventsCount: logs.length,
      toBlock: safeTargetBlock
    };
  }
}
