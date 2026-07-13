import type { CaptureSuggestion } from '../../../domain/entities/Capture.js';
import type { CaptureClassifier } from '../../ports/CaptureClassifier.js';

export interface SuggestCaptureDestinationsInput {
  text?: string;
  photoPath?: string;
}

export interface SuggestCaptureDestinationsOutput {
  suggestions: CaptureSuggestion[];
}

/**
 * 下書き提案を返すだけのUseCase。書き込みは一切行わない
 * （分類と実行を明確に分離する、ADR 0007）。
 */
export class SuggestCaptureDestinationsUseCase {
  constructor(private readonly captureClassifier: CaptureClassifier) {}

  async execute(
    input: SuggestCaptureDestinationsInput,
  ): Promise<SuggestCaptureDestinationsOutput> {
    const suggestions = await this.captureClassifier.suggest(input);
    return { suggestions };
  }
}
