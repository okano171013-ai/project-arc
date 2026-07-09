import type { SupabaseClient } from '@supabase/supabase-js';
import { Reflection, type ReflectionRecord } from '../../domain/entities/Reflection.js';
import type { ReflectionRepository } from '../../application/ports/ReflectionRepository.js';

/**
 * SupabaseReflectionRepository
 *
 * ADR 0001に基づき、Version1ではsupabase CLIが起動する
 * ローカルPostgresに接続する。Version2でクラウドプロジェクトに
 * 向き先を変える際も、このクラスの実装は変更不要
 * （接続文字列の切り替えのみ、infrastructure/config/env.ts側で対応）。
 *
 * テーブル定義: src/infrastructure/db/schema.sql 参照。
 */

interface ReflectionRow {
  id: string;
  date: string;
  sleep_hours: number | null;
  study_minutes: number | null;
  did_martial_arts: boolean;
  did_english_lesson: boolean;
  mood: string | null;
  expense_yen: number | null;
  notes: string | null;
  todays_events: string | null;
  tomorrows_goal: string | null;
  created_at: string;
}

export class SupabaseReflectionRepository implements ReflectionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(reflection: Reflection): Promise<void> {
    const record = reflection.record;
    const row: Omit<ReflectionRow, 'created_at'> = {
      id: reflection.id,
      date: reflection.date,
      sleep_hours: record.sleepHours ?? null,
      study_minutes: record.studyMinutes ?? null,
      did_martial_arts: record.didMartialArts,
      did_english_lesson: record.didEnglishLesson,
      mood: record.mood ?? null,
      expense_yen: record.expenseYen ?? null,
      notes: record.notes ?? null,
      todays_events: record.todaysEvents ?? null,
      tomorrows_goal: record.tomorrowsGoal ?? null,
    };

    const { error } = await this.client.from('reflections').insert(row);
    if (error) {
      throw new Error(`Failed to save reflection: ${error.message}`);
    }
  }

  async findByDate(date: string): Promise<Reflection | null> {
    const { data, error } = await this.client
      .from('reflections')
      .select('*')
      .eq('date', date)
      .maybeSingle<ReflectionRow>();

    if (error) {
      throw new Error(`Failed to fetch reflection: ${error.message}`);
    }
    if (!data) return null;

    return this.toDomain(data);
  }

  async findRecent(limit: number): Promise<Reflection[]> {
    const { data, error } = await this.client
      .from('reflections')
      .select('*')
      .order('date', { ascending: false })
      .limit(limit)
      .returns<ReflectionRow[]>();

    if (error) {
      throw new Error(`Failed to fetch recent reflections: ${error.message}`);
    }

    return (data ?? []).map((row) => this.toDomain(row));
  }

  private toDomain(row: ReflectionRow): Reflection {
    const record: ReflectionRecord = {
      sleepHours: row.sleep_hours ?? undefined,
      studyMinutes: row.study_minutes ?? undefined,
      didMartialArts: row.did_martial_arts,
      didEnglishLesson: row.did_english_lesson,
      mood: (row.mood as ReflectionRecord['mood']) ?? undefined,
      expenseYen: row.expense_yen ?? undefined,
      notes: row.notes ?? undefined,
      todaysEvents: row.todays_events ?? undefined,
      tomorrowsGoal: row.tomorrows_goal ?? undefined,
    };

    return Reflection.create({
      id: row.id,
      date: row.date,
      record,
      createdAt: new Date(row.created_at),
    });
  }
}
