import type { NotionClient, NotionEntryRecord } from '../../application/ports/NotionClient.js';
import { ALL_BRIDGE_LOG_TYPES, type BridgeLogType } from '../../domain/value-objects/BridgeLogType.js';

const NOTION_API_VERSION = '2022-06-28';
const NOTION_BASE_URL = 'https://api.notion.com/v1';

interface NotionSelectProperty {
  type: 'select';
  select: { name: string } | null;
}
interface NotionRichTextProperty {
  type: 'rich_text';
  rich_text: Array<{ plain_text: string }>;
}
interface NotionDateProperty {
  type: 'date';
  date: { start: string } | null;
}
type NotionProperty = NotionSelectProperty | NotionRichTextProperty | NotionDateProperty | { type: string };

interface NotionPage {
  id: string;
  created_time: string;
  properties: Record<string, NotionProperty>;
}

interface NotionQueryResponse {
  results: NotionPage[];
}

/**
 * HttpNotionClient（Version42、ADR 0075）
 *
 * `NotionClient`ポートのNotion API実装。Ownerが作成したInternal
 * Integration Token（`NOTION_API_KEY`）と対象データベースID
 * （`NOTION_DATABASE_ID`）でのみ動作する（`HttpCloudIngressClient`と
 * 同じ「Infrastructure層のみが具体的な通信手段を知る」構造）。
 *
 * データベーススキーマはADR 0075参照：`Name`(title)/`Type`(select、
 * `BridgeLogType`)/`Payload`(rich_text、JSON文字列)/`Date`(date、
 * 任意)/`Synced`(checkbox、Project ARC側が排他的に管理)。
 */
export class HttpNotionClient implements NotionClient {
  private readonly baseUrl: string;

  constructor(
    private readonly apiKey: string,
    private readonly databaseId: string,
    /** テスト専用：fake serverへ差し替えるためのbase URL上書き（既定は実際のNotion API）。 */
    baseUrl: string = NOTION_BASE_URL,
  ) {
    this.baseUrl = baseUrl;
  }

  async listUnsynced(): Promise<NotionEntryRecord[]> {
    const res = await fetch(`${this.baseUrl}/databases/${encodeURIComponent(this.databaseId)}/query`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        filter: { property: 'Synced', checkbox: { equals: false } },
      }),
    });
    if (!res.ok) {
      throw new Error(`NotionClient.listUnsynced failed: HTTP ${res.status}`);
    }
    const body = (await res.json()) as NotionQueryResponse;
    return body.results.map((page) => this.toEntryRecord(page));
  }

  async markSynced(pageId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/pages/${encodeURIComponent(pageId)}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({ properties: { Synced: { checkbox: true } } }),
    });
    if (!res.ok) {
      throw new Error(`NotionClient.markSynced(${pageId}) failed: HTTP ${res.status}`);
    }
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Notion-Version': NOTION_API_VERSION,
      'Content-Type': 'application/json',
    };
  }

  private toEntryRecord(page: NotionPage): NotionEntryRecord {
    const typeProp = page.properties.Type;
    const typeName =
      typeProp && typeProp.type === 'select' ? (typeProp as NotionSelectProperty).select?.name : undefined;
    if (!typeName || !ALL_BRIDGE_LOG_TYPES.includes(typeName as BridgeLogType)) {
      throw new Error(
        `NotionClient: page ${page.id} has an invalid or missing Type property (got: ${String(typeName)})`,
      );
    }

    const payloadProp = page.properties.Payload;
    const payloadText =
      payloadProp && payloadProp.type === 'rich_text'
        ? (payloadProp as NotionRichTextProperty).rich_text.map((t) => t.plain_text).join('')
        : '';
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(payloadText) as Record<string, unknown>;
    } catch {
      throw new Error(`NotionClient: page ${page.id} has a Payload property that is not valid JSON`);
    }

    const dateProp = page.properties.Date;
    const clientCreatedAt =
      (dateProp && dateProp.type === 'date' ? (dateProp as NotionDateProperty).date?.start : undefined) ??
      page.created_time;

    return {
      pageId: page.id,
      payloadType: typeName as BridgeLogType,
      payload,
      clientCreatedAt,
    };
  }
}
