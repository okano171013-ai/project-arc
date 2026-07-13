import type { CalendarEvent } from '../../domain/value-objects/CalendarEvent.js';

/**
 * CalendarProvider（ポート）
 *
 * Version3ではGoogleCalendarProvider（実装）のみを持つが、
 * DailyPlanProviderと同様、Application層はこのインターフェースにのみ
 * 依存する。
 */
export interface CalendarProvider {
  getEventsForDate(date: string): Promise<CalendarEvent[]>;
}
