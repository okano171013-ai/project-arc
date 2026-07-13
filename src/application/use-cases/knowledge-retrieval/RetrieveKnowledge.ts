import type { ExternalKnowledge } from '../../../domain/entities/ExternalKnowledge.js';
import type { ExternalSource } from '../../../domain/entities/ExternalSource.js';
import type { ExternalKnowledgeRepository } from '../../ports/ExternalKnowledgeRepository.js';
import type { ExternalSourceRepository } from '../../ports/ExternalSourceRepository.js';

const DEFAULT_RETRIEVE_LIMIT = 10;

/** スコア加点の重み。単純な機械的一致のみで、AI的な重要度判断は行わない（ADR 0020）。 */
const WEIGHT = {
  titleQueryMatch: 5,
  tagQueryMatch: 3,
  topicQueryMatch: 3,
  contentQueryMatch: 1,
  requestedTagOverlap: 2,
  requestedTopicOverlap: 2,
} as const;

export interface RetrieveKnowledgeInput {
  /** 空文字・未指定の場合はtags/topicsのみで絞り込む。全て空なら全件が対象（ADR 0014の踏襲）。 */
  query?: string;
  /** 指定した場合、いずれか1つでもKnowledgeのtagsと重なることが対象条件になる。 */
  tags?: string[];
  /** 指定した場合、いずれか1つでもKnowledgeのtopicsと重なることが対象条件になる。 */
  topics?: string[];
  /** 既定10件（Export用のlimitとは別。ARCに渡す想定のため少なめ、ADR 0019）。 */
  limit?: number;
}

export interface RetrieveKnowledgeResultItem {
  knowledge: ExternalKnowledge;
  source: ExternalSource | null;
  /** 機械的な一致度スコア。降順ソートにのみ使う（何が正しいかの判断ではない、ADR 0020）。 */
  score: number;
  matchedIn: string[];
}

export interface RetrieveKnowledgeOutput {
  results: RetrieveKnowledgeResultItem[];
  /** resultsが参照するSourceの重複なし一覧（Citation表示用、指示書④）。 */
  sources: ExternalSource[];
}

/**
 * RetrieveKnowledgeUseCase（Version11、Knowledge RetrievalのQueryEngine）
 *
 * ARCが会話に必要な知識だけをExternal Brainから取得するための
 * UseCase。SearchExternalKnowledgeUseCase（Version10、CLI/HTTPでの
 * 人間向け一覧・一致箇所表示が主目的）とは別に新設した——本UseCaseは
 * tags/topicsによる構造化フィルタとスコアリング順ソートを持ち、
 * ARCへの受け渡しを主目的とする（ADR 0019）。
 *
 * スコアリングはタイトル・タグ・トピックの一致数による単純な加点式
 * のみ（指示書⑤）。Embedding・ベクトル検索・AIによる関連度判定は
 * 行わない。スコアは「どの順で提示するか」だけに使われ、Systemが
 * 「どれが正しい／重要な情報か」を判断しているわけではない
 * （Constitution第2条、ADR 0020）。
 */
export class RetrieveKnowledgeUseCase {
  constructor(
    private readonly externalKnowledgeRepository: ExternalKnowledgeRepository,
    private readonly externalSourceRepository: ExternalSourceRepository,
  ) {}

  async execute(input: RetrieveKnowledgeInput = {}): Promise<RetrieveKnowledgeOutput> {
    const [allKnowledge, allSources] = await Promise.all([
      this.externalKnowledgeRepository.findAll(),
      this.externalSourceRepository.findAll(),
    ]);
    const sourceById = new Map(allSources.map((s) => [s.id, s]));

    const query = (input.query ?? '').trim().toLowerCase();
    const requestedTags = (input.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean);
    const requestedTopics = (input.topics ?? [])
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const hasFilter = query.length > 0 || requestedTags.length > 0 || requestedTopics.length > 0;
    const limit = input.limit && input.limit > 0 ? input.limit : DEFAULT_RETRIEVE_LIMIT;

    const scored: RetrieveKnowledgeResultItem[] = [];
    for (const knowledge of allKnowledge) {
      const source = knowledge.sourceId ? (sourceById.get(knowledge.sourceId) ?? null) : null;
      const { score, matchedIn } = this.score(knowledge, source, query, requestedTags, requestedTopics);

      if (!hasFilter) {
        scored.push({ knowledge, source, score: 0, matchedIn: [] });
        continue;
      }
      if (score > 0) {
        scored.push({ knowledge, source, score, matchedIn });
      }
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.knowledge.capturedAt.localeCompare(a.knowledge.capturedAt);
    });

    const results = scored.slice(0, limit);
    const sources = [
      ...new Map(
        results
          .filter((r): r is RetrieveKnowledgeResultItem & { source: ExternalSource } => r.source !== null)
          .map((r) => [r.source.id, r.source]),
      ).values(),
    ];

    return { results, sources };
  }

  private score(
    knowledge: ExternalKnowledge,
    source: ExternalSource | null,
    query: string,
    requestedTags: string[],
    requestedTopics: string[],
  ): { score: number; matchedIn: string[] } {
    const r = knowledge.record;
    const tagsLower = r.tags.map((t) => t.toLowerCase());
    const topicsLower = r.topics.map((t) => t.toLowerCase());
    let score = 0;
    const matchedIn: string[] = [];

    if (query) {
      if (r.title.toLowerCase().includes(query)) {
        score += WEIGHT.titleQueryMatch;
        matchedIn.push('title');
      }
      if (tagsLower.some((t) => t.includes(query))) {
        score += WEIGHT.tagQueryMatch;
        matchedIn.push('tags');
      }
      if (topicsLower.some((t) => t.includes(query))) {
        score += WEIGHT.topicQueryMatch;
        matchedIn.push('topics');
      }
      const contentHaystack = [r.content, r.ownerSummary, r.ownerComment, r.purpose, source?.title]
        .filter((v): v is string => Boolean(v))
        .join('\n')
        .toLowerCase();
      if (contentHaystack.includes(query)) {
        score += WEIGHT.contentQueryMatch;
        matchedIn.push('content');
      }
    }

    if (requestedTags.length > 0) {
      const overlap = requestedTags.filter((t) => tagsLower.includes(t)).length;
      if (overlap > 0) {
        score += overlap * WEIGHT.requestedTagOverlap;
        matchedIn.push('tags');
      }
    }

    if (requestedTopics.length > 0) {
      const overlap = requestedTopics.filter((t) => topicsLower.includes(t)).length;
      if (overlap > 0) {
        score += overlap * WEIGHT.requestedTopicOverlap;
        matchedIn.push('topics');
      }
    }

    return { score, matchedIn: [...new Set(matchedIn)] };
  }
}
