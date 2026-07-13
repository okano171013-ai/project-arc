#!/usr/bin/env node
/**
 * pnpm conversation -- "<質問>" / pnpm conversation（引数なしなら対話式）
 * Conversational Integration（Version13）
 *
 * 質問文からIntent（Retrieval/Decision/None）を機械的に判定し、
 * 対応するツール（RetrieveKnowledgeUseCase/DecisionEngineUseCase）
 * を呼び出してConversationContextを生成する。指示書9章の3セクション
 * 構造（【Retrieved Knowledge】【Decision Context】【Sources】）で
 * 表示する——Project ARCはこれ以上書かない。「【ARC】」に相当する
 * 解釈・結論はOwnerがARCとの会話に貼り付けた上でARC自身が書く。
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout, argv } from 'node:process';
import { ConversationGatewayUseCase } from '../../application/use-cases/conversation-gateway/ConversationGateway.js';
import { buildConversationContextText } from '../../application/use-cases/conversation-gateway/BuildConversationText.js';
import { JsonFileExternalSourceRepository } from '../../adapters/repositories/JsonFileExternalSourceRepository.js';
import { JsonFileExternalKnowledgeRepository } from '../../adapters/repositories/JsonFileExternalKnowledgeRepository.js';

function line(char = '─', length = 44): string {
  return char.repeat(length);
}

function positionalArgs(): string[] {
  return argv.slice(2).filter((a) => a !== '--' && !a.startsWith('--'));
}

async function main(): Promise<void> {
  let question = positionalArgs().join(' ');

  if (!question) {
    const rl = createInterface({ input: stdin, output: stdout });
    try {
      question = await rl.question('質問: ');
    } finally {
      rl.close();
    }
  }

  if (!question.trim()) {
    console.log('質問が入力されませんでした。');
    process.exitCode = 1;
    return;
  }

  const useCase = new ConversationGatewayUseCase(
    new JsonFileExternalKnowledgeRepository(),
    new JsonFileExternalSourceRepository(),
  );
  const { conversationContext } = await useCase.execute({ question });

  console.log('');
  console.log(line('='));
  console.log(`  Conversation: 「${conversationContext.question}」 [Intent: ${conversationContext.intent}]`);
  console.log(line('='));
  console.log('');
  console.log(buildConversationContextText(conversationContext));
  console.log('');
}

main().catch((error: unknown) => {
  console.error('エラーが発生しました:', error);
  process.exitCode = 1;
});
