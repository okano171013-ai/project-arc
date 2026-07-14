/**
 * toolResult（Version16、MCP Integration）
 *
 * 各MCP Toolのハンドラ共通処理。`Connector`呼び出しの結果を
 * MCP SDKが要求する`{content, isError?}`形状へ変換するだけで、
 * 新しい判断ロジックは持たない——`http/server.ts`の`ok()`/`fail()`と
 * 同じ役割をMCP Tool層で担う。
 */
export interface ToolContent {
  [x: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export async function runTool(fn: () => Promise<unknown>): Promise<ToolContent> {
  try {
    const result = await fn();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { content: [{ type: 'text', text: message }], isError: true };
  }
}
