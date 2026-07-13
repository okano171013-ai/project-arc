import { RetrieveKnowledgeUseCase } from '../knowledge-retrieval/RetrieveKnowledge.js';
import { DecisionEngineUseCase } from '../decision-support/DecisionEngine.js';
import { IntentDetector } from './DetectIntent.js';
import type { ExternalKnowledgeRepository } from '../../ports/ExternalKnowledgeRepository.js';
import type { ExternalSourceRepository } from '../../ports/ExternalSourceRepository.js';
import type { ExternalSource } from '../../../domain/entities/ExternalSource.js';
import type { ConversationContext } from '../../../domain/value-objects/ConversationContext.js';

export interface ConversationGatewayInput {
  question: string;
  /** 直近の会話文脈（任意）。Version13ではIntent判定には使わない（ADR 0028）。呼び出し側の記録用に受け取るのみ。 */
  conversation?: string;
  /** 全件検索を避けるための上限（指示書10章）。未指定時は既定値を使う。 */
  limit?: number;
}

export interface ConversationGatewayOutput {
  conversationContext: ConversationContext;
}

const DEFAULT_RETRIEVAL_LIMIT = 5;

/**
 * ConversationGatewayUseCase（Version13、Conversational Integration）
 *
 * Conversation → Intent Detection → Tool Selection → Retrieve →
 * Decision → ConversationContext という指示書2章の流れを実装する。
 * ARC Connectorを呼び出す唯一の入口（指示書2章）——CLI・HTTP APIの
 * どちらも本UseCaseを経由する。
 *
 * Tool Selectionは「どのUseCaseを呼ぶか」だけを決め、結果の解釈・
 * 要約・回答文の生成は一切行わない（指示書4章、ADR 0028）。会話
 * 自体（`conversation`引数）は保存しない（指示書11章）——本UseCaseは
 * ステートレスで、呼び出しごとに独立してExternal Brainへ問い合わせる。
 */
export class ConversationGatewayUseCase {
  private readonly intentDetector = new IntentDetector();
  private readonly retrieveKnowledge: RetrieveKnowledgeUseCase;
  private readonly decisionEngine: DecisionEngineUseCase;

  constructor(
    private readonly externalKnowledgeRepository: ExternalKnowledgeRepository,
    externalSourceRepository: ExternalSourceRepository,
  ) {
    this.retrieveKnowledge = new RetrieveKnowledgeUseCase(
      externalKnowledgeRepository,
      externalSourceRepository,
    );
    this.decisionEngine = new DecisionEngineUseCase(
      externalKnowledgeRepository,
      externalSourceRepository,
    );
  }

  async execute(input: ConversationGatewayInput): Promise<ConversationGatewayOutput> {
    const question = input.question.trim();
    if (!question) {
      throw new Error('question must not be empty');
    }
    const limit = input.limit && input.limit > 0 ? input.limit : DEFAULT_RETRIEVAL_LIMIT;

    const intent = this.intentDetector.detect(question);

    switch (intent) {
      case 'Retrieval':
        return { conversationContext: await this.handleRetrieval(question, limit) };
      case 'Decision':
        return { conversationContext: await this.handleDecision(question) };
      case 'None':
      default:
        return {
          conversationContext: {
            question,
            intent: 'None',
            retrievedKnowledge: [],
            decisionContext: null,
            sources: [],
            warnings: [
              'この質問はProject ARCへの問い合わせが不要と判定されました（雑談等）。',
            ],
          },
        };
    }
  }

  private async handleRetrieval(question: string, limit: number): Promise<ConversationContext> {
    // RetrieveKnowledgeUseCaseのquery一致は「Knowledge側のフィールドが
    // queryを部分文字列として含むか」を見る（ADR 0020）ため、質問文を
    // そのままqueryに渡すと、短いtitle/tagsとは一致しにくい（文全体が
    // 短いフィールドの部分文字列になることは稀）。既存topicのうち
    // 質問文に含まれるものをtopicsフィルタとしても渡すことで、
    // CandidateBuilder（ADR 0022）と同じ「質問文に語が含まれるか」
    // という逆方向一致も併用する。
    const allKnowledge = await this.externalKnowledgeRepository.findAll();
    const allTopics = [...new Set(allKnowledge.flatMap((k) => k.record.topics))];
    const matchedTopics = allTopics.filter((topic) => topic.length > 0 && question.includes(topic));

    const result = await this.retrieveKnowledge.execute({
      query: question,
      topics: matchedTopics.length > 0 ? matchedTopics : undefined,
      limit,
    });
    const warnings =
      result.results.length === 0 ? ['該当する記録が見つかりませんでした。'] : [];
    return {
      question,
      intent: 'Retrieval',
      retrievedKnowledge: result.results.map((r) => ({
        knowledge: r.knowledge,
        source: r.source,
        score: r.score,
        matchedIn: r.matchedIn,
      })),
      decisionContext: null,
      sources: result.sources,
      warnings,
    };
  }

  private async handleDecision(question: string): Promise<ConversationContext> {
    const result = await this.decisionEngine.execute({ question });
    return {
      question,
      intent: 'Decision',
      retrievedKnowledge: result.decisionContext.evidenceList,
      decisionContext: result.decisionContext,
      sources: this.dedupeSources(result.sources),
      warnings: [],
    };
  }

  private dedupeSources(sources: ExternalSource[]): ExternalSource[] {
    return [...new Map(sources.map((s) => [s.id, s])).values()];
  }
}
