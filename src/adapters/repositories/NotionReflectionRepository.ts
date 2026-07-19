import type { Client } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints/common.js';
import { Reflection, type Mood, type ReflectionRecord } from '../../domain/entities/Reflection.js';
import type { ReflectionRepository } from '../../application/ports/ReflectionRepository.js';

type PagePropertyValue = PageObjectResponse['properties'][string];

/**
 * NotionReflectionRepository
 *
 * Reflectionをデータベース（Notion）に保存する実装。データベースは
 * 事前に手動で作成しておく必要がある（Notionにはマイグレーション
 * 機構がないため）。必要なプロパティ一覧は docs/architecture.md
 * 「Notion連携」セクション参照。
 *
 * Notion APIは「database」と「data source」を区別する（2025-09以降の
 * バージョン）。ページの作成はdatabase_idで行えるが、クエリには
 * data_source_idが必要なため、初回アクセス時に解決してキャッシュする。
 */
export class NotionReflectionRepository implements ReflectionRepository {
  private cachedDataSourceId: string | undefined;

  constructor(
    private readonly client: Client,
    private readonly databaseId: string,
  ) {}

  async save(reflection: Reflection): Promise<void> {
    const record = reflection.record;

    await this.client.pages.create({
      parent: { database_id: this.databaseId },
      properties: {
        Name: { title: [{ text: { content: reflection.date } }] },
        'ARC ID': { rich_text: [{ text: { content: reflection.id } }] },
        Date: { date: { start: reflection.date } },
        'Sleep Hours': { number: record.sleepHours ?? null },
        'Study Minutes': { number: record.studyMinutes ?? null },
        'Did Martial Arts': { checkbox: record.didMartialArts },
        'Did English Lesson': { checkbox: record.didEnglishLesson },
        Mood: { select: record.mood ? { name: record.mood } : null },
        'Expense Yen': { number: record.expenseYen ?? null },
        Notes: { rich_text: record.notes ? [{ text: { content: record.notes } }] : [] },
        "Today's Events": {
          rich_text: record.todaysEvents ? [{ text: { content: record.todaysEvents } }] : [],
        },
        "Tomorrow's Goal": {
          rich_text: record.tomorrowsGoal ? [{ text: { content: record.tomorrowsGoal } }] : [],
        },
      },
    });
  }

  async findByDate(date: string): Promise<Reflection | null> {
    const dataSourceId = await this.resolveDataSourceId();

    const response = await this.client.dataSources.query({
      data_source_id: dataSourceId,
      filter: { property: 'Date', date: { equals: date } },
      page_size: 1,
    });

    const page = response.results[0];
    if (!page || !isFullPage(page)) return null;

    return this.toDomain(page);
  }

  async findRecent(limit: number): Promise<Reflection[]> {
    const dataSourceId = await this.resolveDataSourceId();

    const response = await this.client.dataSources.query({
      data_source_id: dataSourceId,
      sorts: [{ property: 'Date', direction: 'descending' }],
      page_size: limit,
    });

    return response.results.filter(isFullPage).map((page) => this.toDomain(page));
  }

  private async resolveDataSourceId(): Promise<string> {
    if (this.cachedDataSourceId) return this.cachedDataSourceId;

    const database = await this.client.databases.retrieve({ database_id: this.databaseId });
    if (!('data_sources' in database) || database.data_sources.length === 0) {
      throw new Error(`Notion database ${this.databaseId} has no queryable data source`);
    }

    this.cachedDataSourceId = database.data_sources[0]!.id;
    return this.cachedDataSourceId;
  }

  private toDomain(page: PageObjectResponse): Reflection {
    const props = page.properties;
    const id = readRichText(props['ARC ID']) ?? page.id;
    const date = readDate(props['Date']) ?? '';

    const record: ReflectionRecord = {
      sleepHours: readNumber(props['Sleep Hours']),
      studyMinutes: readNumber(props['Study Minutes']),
      didMartialArts: readCheckbox(props['Did Martial Arts']),
      didEnglishLesson: readCheckbox(props['Did English Lesson']),
      mood: readSelect(props['Mood']) as Mood | undefined,
      expenseYen: readNumber(props['Expense Yen']),
      notes: readRichText(props['Notes']),
      todaysEvents: readRichText(props["Today's Events"]),
      tomorrowsGoal: readRichText(props["Tomorrow's Goal"]),
    };

    return Reflection.create({ id, date, record, createdAt: new Date(page.created_time) });
  }
}

function isFullPage(page: { object: string }): page is PageObjectResponse {
  return page.object === 'page' && 'properties' in page;
}

function readNumber(prop: PagePropertyValue | undefined): number | undefined {
  return prop?.type === 'number' ? (prop.number ?? undefined) : undefined;
}

function readCheckbox(prop: PagePropertyValue | undefined): boolean {
  return prop?.type === 'checkbox' ? prop.checkbox : false;
}

function readSelect(prop: PagePropertyValue | undefined): string | undefined {
  return prop?.type === 'select' ? prop.select?.name : undefined;
}

function readDate(prop: PagePropertyValue | undefined): string | undefined {
  return prop?.type === 'date' ? prop.date?.start : undefined;
}

function readRichText(prop: PagePropertyValue | undefined): string | undefined {
  if (prop?.type !== 'rich_text') return undefined;
  const text = prop.rich_text.map((item) => item.plain_text).join('');
  return text || undefined;
}
