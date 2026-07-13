import type {
  ExternalKnowledge,
  ExternalKnowledgeStatus,
} from '../../../domain/entities/ExternalKnowledge.js';
import type { ExternalSource } from '../../../domain/entities/ExternalSource.js';
import type { ExternalKnowledgeRepository } from '../../ports/ExternalKnowledgeRepository.js';
import type { ExternalSourceRepository } from '../../ports/ExternalSourceRepository.js';

export interface SearchExternalKnowledgeInput {
  /** 空文字・未指定の場合は全件を対象とする（指示書4.3「空の検索語」への回答、ADR 0014）。 */
  query?: string;
  status?: ExternalKnowledgeStatus;
}

export interface SearchExternalKnowledgeResultItem {
  knowledge: ExternalKnowledge;
  source: ExternalSource | null;
  /** どのフィールドが一致したか（指示書4.3「一致理由の表示」への対応）。 */
  matchedIn: string[];
}

export interface SearchExternalKnowledgeOutput {
  results: SearchExternalKnowledgeResultItem[];
}

/**
 * SearchExternalKnowledgeUseCase（Version10）
 *
 * 単純な部分文字列一致（大文字小文字を区別しない）のみ。ベクトル
 * 検索・意味検索は行わない（指示書4.3）。対象：ExternalKnowledgeの
 * title/content/ownerSummary/ownerComment/topics/tags/purpose、
 * 関連するExternalSourceのtitle/author/publisher/url/identifier
 * （指示書4.1）。既存`pnpm find`（Memory/Inventory対象、ADR 0005）
 * とは意図的に分離している（ADR 0014）。
 */
export class SearchExternalKnowledgeUseCase {
  constructor(
    private readonly externalKnowledgeRepository: ExternalKnowledgeRepository,
    private readonly externalSourceRepository: ExternalSourceRepository,
  ) {}

  async execute(input: SearchExternalKnowledgeInput = {}): Promise<SearchExternalKnowledgeOutput> {
    const [allKnowledge, allSources] = await Promise.all([
      this.externalKnowledgeRepository.findAll(),
      this.externalSourceRepository.findAll(),
    ]);
    const sourceById = new Map(allSources.map((s) => [s.id, s]));

    const query = (input.query ?? '').trim().toLowerCase();
    const statusFiltered = input.status
      ? allKnowledge.filter((k) => k.status === input.status)
      : allKnowledge;

    const results: SearchExternalKnowledgeResultItem[] = [];
    for (const knowledge of statusFiltered) {
      const source = knowledge.sourceId ? (sourceById.get(knowledge.sourceId) ?? null) : null;

      if (!query) {
        results.push({ knowledge, source, matchedIn: [] });
        continue;
      }

      const matchedIn = this.findMatches(knowledge, source, query);
      if (matchedIn.length > 0) {
        results.push({ knowledge, source, matchedIn });
      }
    }

    results.sort((a, b) => b.knowledge.capturedAt.localeCompare(a.knowledge.capturedAt));
    return { results };
  }

  private findMatches(
    knowledge: ExternalKnowledge,
    source: ExternalSource | null,
    query: string,
  ): string[] {
    const matched: string[] = [];
    const r = knowledge.record;
    const fieldMap: Record<string, string | undefined> = {
      title: r.title,
      content: r.content,
      ownerSummary: r.ownerSummary,
      ownerComment: r.ownerComment,
      purpose: r.purpose,
      topics: r.topics.join(' '),
      tags: r.tags.join(' '),
    };
    for (const [field, value] of Object.entries(fieldMap)) {
      if (value && value.toLowerCase().includes(query)) {
        matched.push(field);
      }
    }
    if (source) {
      const sourceFieldMap: Record<string, string | undefined> = {
        'source.title': source.record.title,
        'source.author': source.record.author,
        'source.publisher': source.record.publisher,
        'source.url': source.record.url,
        'source.identifier': source.record.identifier,
      };
      for (const [field, value] of Object.entries(sourceFieldMap)) {
        if (value && value.toLowerCase().includes(query)) {
          matched.push(field);
        }
      }
    }
    return matched;
  }
}
