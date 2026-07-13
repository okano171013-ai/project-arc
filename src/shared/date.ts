/**
 * previousDate
 *
 * YYYY-MM-DD形式の日付から前日を計算する。ローカルタイムゾーンで
 * 計算する（UTC基準だと日本時間では日付がズレるため、
 * reflect.ts/morning.tsの日付計算と同じ方針）。
 */
export function previousDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
