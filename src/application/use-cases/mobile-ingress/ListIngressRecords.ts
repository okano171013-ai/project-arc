import type { IngressRecord, IngressRecordStatus } from '../../../domain/entities/IngressRecord.js';
import type { IngressRecordRepository } from '../../ports/IngressRecordRepository.js';

export interface ListIngressRecordsInput {
  status?: IngressRecordStatus;
}

export interface ListIngressRecordsOutput {
  records: IngressRecord[];
}

export class ListIngressRecordsUseCase {
  constructor(private readonly ingressRecordRepository: IngressRecordRepository) {}

  async execute(input: ListIngressRecordsInput = {}): Promise<ListIngressRecordsOutput> {
    const all = input.status
      ? await this.ingressRecordRepository.findByStatus(input.status)
      : await this.ingressRecordRepository.findAll();
    const sorted = [...all].sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
    return { records: sorted };
  }
}
