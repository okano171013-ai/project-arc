import { RetrieveKnowledgeUseCase } from '../knowledge-retrieval/RetrieveKnowledge.js';
import type { DecisionEvidence } from '../../../domain/value-objects/DecisionContext.js';

const DEFAULT_EVIDENCE_LIMIT_PER_CANDIDATE = 5;

export interface CollectEvidenceFilters {
  tags?: string[];
  topics?: string[];
}

/**
 * EvidenceCollector（Version12、Decision Engineの根拠収集）
 *
 * 各候補についてExternal Brainから根拠を集める。Version12では
 * External Brainのみを対象とする——Memory/Reflection/Timelineは
 * Version13以降で拡張可能（指示書4章）。
 *
 * 実体はRetrieveKnowledgeUseCase（Version11）への薄いラップであり、
 * 新しい検索・スコアリングロジックは持たない（既存UseCaseへ委譲する
 * という、Bridge Layer（ADR 0010）以来の一貫した設計方針）。
 */
export class EvidenceCollector {
  constructor(private readonly retrieveKnowledge: RetrieveKnowledgeUseCase) {}

  async collect(candidate: string, filters: CollectEvidenceFilters = {}): Promise<DecisionEvidence[]> {
    const { results } = await this.retrieveKnowledge.execute({
      query: candidate,
      tags: filters.tags,
      topics: filters.topics,
      limit: DEFAULT_EVIDENCE_LIMIT_PER_CANDIDATE,
    });
    return results.map((r) => ({
      knowledge: r.knowledge,
      source: r.source,
      score: r.score,
      matchedIn: r.matchedIn,
    }));
  }
}
