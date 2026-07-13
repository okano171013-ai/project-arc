import { RetrieveKnowledgeUseCase } from '../knowledge-retrieval/RetrieveKnowledge.js';
import { CandidateBuilder } from './BuildCandidates.js';
import { EvidenceCollector } from './CollectEvidence.js';
import { ComparisonBuilder } from './BuildComparison.js';
import type { ExternalKnowledgeRepository } from '../../ports/ExternalKnowledgeRepository.js';
import type { ExternalSourceRepository } from '../../ports/ExternalSourceRepository.js';
import type { ExternalKnowledge } from '../../../domain/entities/ExternalKnowledge.js';
import type { ExternalSource } from '../../../domain/entities/ExternalSource.js';
import type { DecisionContext, DecisionEvidence } from '../../../domain/value-objects/DecisionContext.js';

export interface DecisionSupportInput {
  question: string;
  /** Owner/ARCが明示した候補（任意）。指定があればCandidateBuilderの推定より優先する。 */
  candidates?: string[];
  tags?: string[];
  topics?: string[];
}

export interface DecisionSupportOutput {
  decisionContext: DecisionContext;
  retrievedKnowledge: ExternalKnowledge[];
  sources: ExternalSource[];
}

const LOW_CONFIDENCE_LEVELS = new Set(['low', 'unassessed']);

/**
 * DecisionEngineUseCase（Version12、Decision Support）
 *
 * Question → Retrieve(全topic取得) → CandidateBuilder →
 * EvidenceCollector → ComparisonBuilder → DecisionContext という
 * 指示書2章の流れを実装する。
 *
 * ARCの解釈・優先順位提案（指示書7章の「【ARC】」部分）は一切生成
 * しない——DecisionContextは比較材料の整理までで、判断はOwner/ARCに
 * 委ねる（ADR 0023、Constitution第2条）。External Brain/Memory/
 * confidence等への書き込みも行わない（指示書1章「行ってはいけない
 * こと」）。
 */
export class DecisionEngineUseCase {
  private readonly retrieveKnowledge: RetrieveKnowledgeUseCase;
  private readonly candidateBuilder = new CandidateBuilder();
  private readonly evidenceCollector: EvidenceCollector;
  private readonly comparisonBuilder = new ComparisonBuilder();

  constructor(
    private readonly externalKnowledgeRepository: ExternalKnowledgeRepository,
    externalSourceRepository: ExternalSourceRepository,
  ) {
    this.retrieveKnowledge = new RetrieveKnowledgeUseCase(
      externalKnowledgeRepository,
      externalSourceRepository,
    );
    this.evidenceCollector = new EvidenceCollector(this.retrieveKnowledge);
  }

  async execute(input: DecisionSupportInput): Promise<DecisionSupportOutput> {
    const question = input.question.trim();
    if (!question) {
      throw new Error('question must not be empty');
    }

    const allKnowledge = await this.externalKnowledgeRepository.findAll();
    const allTopics = [...new Set(allKnowledge.flatMap((k) => k.record.topics))];

    const candidates = this.candidateBuilder.build({
      question,
      allTopics,
      explicitCandidates: input.candidates,
    });

    const comparisons = [];
    const evidenceByCandidate: DecisionEvidence[][] = [];
    for (const candidate of candidates) {
      const evidence = await this.evidenceCollector.collect(candidate, {
        tags: input.tags,
        topics: input.topics,
      });
      evidenceByCandidate.push(evidence);
      comparisons.push(this.comparisonBuilder.build(candidate, evidence));
    }

    const evidenceList = this.dedupeEvidence(evidenceByCandidate.flat());

    const missingInformation: string[] = [];
    if (allKnowledge.length === 0) {
      missingInformation.push('External Brainに知識が登録されていません。');
    }
    for (const comparison of comparisons) {
      missingInformation.push(...comparison.missingInfo);
    }

    const pointsForOwnerToDecide = [
      '最終的な判断はOwner自身が行ってください。Systemは判断していません。',
      ...comparisons
        .filter((c) =>
          c.evidence.some((e) => LOW_CONFIDENCE_LEVELS.has(e.knowledge.record.confidence)),
        )
        .map(
          (c) =>
            `「${c.candidate}」の根拠には信頼度が低い・未評価のものが含まれます。慎重に扱ってください。`,
        ),
    ];

    const decisionContext: DecisionContext = {
      question,
      candidates,
      comparisons,
      evidenceList,
      missingInformation,
      pointsForOwnerToDecide,
    };

    return {
      decisionContext,
      retrievedKnowledge: evidenceList.map((e) => e.knowledge),
      sources: this.dedupeSources(evidenceList),
    };
  }

  private dedupeEvidence(evidence: DecisionEvidence[]): DecisionEvidence[] {
    return [...new Map(evidence.map((e) => [e.knowledge.id, e])).values()];
  }

  private dedupeSources(evidence: DecisionEvidence[]): ExternalSource[] {
    return [
      ...new Map(
        evidence
          .filter((e): e is DecisionEvidence & { source: ExternalSource } => e.source !== null)
          .map((e) => [e.source.id, e.source]),
      ).values(),
    ];
  }
}
