/**
 * CalendarEvent（カレンダーの予定）
 *
 * Google Calendar APIのレスポンスをそのまま使わず、Project ARC内で
 * 扱いやすい形に正規化したvalue object。Adapters層（GoogleCalendarProvider）
 * がこの形に変換する責務を持つ。
 */
export interface CalendarEvent {
  readonly title: string;
  /** ISO8601形式。終日予定の場合はundefined。 */
  readonly startTime?: string;
  readonly endTime?: string;
  readonly allDay: boolean;
}
