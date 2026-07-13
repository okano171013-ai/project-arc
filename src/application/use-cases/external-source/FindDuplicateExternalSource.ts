import type { ExternalSource } from '../../../domain/entities/ExternalSource.js';
import type { ExternalSourceRepository } from '../../ports/ExternalSourceRepository.js';

export interface FindDuplicateExternalSourceInput {
  url?: string;
  identifier?: string;
}

export interface FindDuplicateExternalSourceOutput {
  duplicates: ExternalSource[];
}

/**
 * FindDuplicateExternalSourceUseCase（Version10）
 *
 * 同一URLまたは同一identifierのExternalSourceを検出するだけの
 * UseCase。統合・上書きは一切行わない——重複候補を提示し、Owner
 * （またはARCとの対話を経たOwner）が「既存を使う／新規登録する／
 * 中止する」を選ぶための材料を返すのみ（指示書10章、ADR 0012）。
 */
export class FindDuplicateExternalSourceUseCase {
  constructor(private readonly externalSourceRepository: ExternalSourceRepository) {}

  async execute(input: FindDuplicateExternalSourceInput): Promise<FindDuplicateExternalSourceOutput> {
    const results: ExternalSource[] = [];
    if (input.url) {
      results.push(...(await this.externalSourceRepository.findByUrl(input.url)));
    }
    if (input.identifier) {
      results.push(...(await this.externalSourceRepository.findByIdentifier(input.identifier)));
    }
    const unique = [...new Map(results.map((s) => [s.id, s])).values()];
    return { duplicates: unique };
  }
}
