import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import type { CalendarProvider } from '../../application/ports/CalendarProvider.js';
import type { CalendarEvent } from '../../domain/value-objects/CalendarEvent.js';

/**
 * GoogleCalendarProvider
 *
 * ADR 0004の認証クライアントを使い、プライマリカレンダーの
 * 指定日の予定を取得する（対象カレンダーはプライマリのみ、
 * Version3のCTO判断。複数カレンダー対応はVersion4以降で検討）。
 */
export class GoogleCalendarProvider implements CalendarProvider {
  constructor(private readonly authClient: OAuth2Client) {}

  async getEventsForDate(date: string): Promise<CalendarEvent[]> {
    const calendar = google.calendar({ version: 'v3', auth: this.authClient });

    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: `${date}T00:00:00+09:00`,
      timeMax: `${date}T23:59:59+09:00`,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const items = res.data.items ?? [];
    return items.map((event) => ({
      title: event.summary ?? '（タイトルなし）',
      startTime: event.start?.dateTime ?? undefined,
      endTime: event.end?.dateTime ?? undefined,
      allDay: Boolean(event.start?.date && !event.start?.dateTime),
    }));
  }
}
