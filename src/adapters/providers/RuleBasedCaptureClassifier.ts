import type { CaptureSuggestion, CaptureLogType } from '../../domain/entities/Capture.js';
import type { CaptureClassifier } from '../../application/ports/CaptureClassifier.js';

/**
 * RuleBasedCaptureClassifier
 *
 * CaptureClassifierのMVP実装。固定キーワード表による文字列一致のみを
 * 行い、AIによる解釈・重要度判定は一切しない（ADR 0007、
 * `docs/ai-roles.md`）。キーワード表はADR 0005/0006で定義した
 * Log同士の境界をそのまま反映している。写真のみ（テキストなし）の
 * 場合は画像解析をしないため提案を返さない（Version1からの一貫方針）。
 *
 * 将来、実際のAI分類（LLMベース）を導入する際は、この実装ではなく
 * 別のCaptureClassifier実装に差し替える（Application層・UseCase層は
 * 変更不要）。
 */

interface KeywordRule {
  logType: CaptureLogType;
  keywords: string[];
  buildFields: (text: string) => Record<string, unknown>;
}

const RULES: KeywordRule[] = [
  {
    logType: 'ChallengeLog',
    keywords: ['初めて', '食べた', '飲んだ', '挑戦'],
    buildFields: (text) => ({ title: text }),
  },
  {
    logType: 'PurchaseLog',
    keywords: ['買った', '購入'],
    buildFields: (text) => ({ productName: text }),
  },
  {
    logType: 'SkinLog',
    keywords: ['肌', 'ニキビ', '毛穴', '赤み', '皮脂'],
    buildFields: (text) => ({ note: text }),
  },
  {
    logType: 'AppearanceLog',
    keywords: ['髪', '髭', '服', '体型', '言われた', 'ガタイ'],
    buildFields: (text) => ({ comment: text }),
  },
];

export class RuleBasedCaptureClassifier implements CaptureClassifier {
  async suggest(input: { text?: string; photoPath?: string }): Promise<CaptureSuggestion[]> {
    const text = input.text?.trim();
    if (!text) {
      // 写真のみの入力は画像解析をしないため、提案できない。
      return Promise.resolve([]);
    }

    const suggestions: CaptureSuggestion[] = [];
    for (const rule of RULES) {
      const matched = rule.keywords.filter((keyword) => text.includes(keyword));
      if (matched.length === 0) continue;
      suggestions.push({
        logType: rule.logType,
        reason: `「${matched.join('」「')}」というキーワードを検出`,
        fields: rule.buildFields(text),
      });
    }
    return Promise.resolve(suggestions);
  }
}
