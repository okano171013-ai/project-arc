/**
 * BehaviorScoreConstants（Version26、行動介入レイヤー）
 *
 * `GetDailyBehaviorScoreUseCase`が使う名前付き定数。既存
 * `Reflection.score()`は一切変更せず、これらの定数を使って別途
 * 合成スコアを計算する（`Reflection.ts`参照）。
 */

/** 指示書「オトの理想像を80点基準とする」。 */
export const IDEAL_LIFE_SCORE_BASELINE = 80;

export const CHECKIN_COMPLETION_BONUS_MAX = 10;

/** Acknowledged（Owner確認済み＝誤検知でない）のWarning 1件あたりの減点。 */
export const WARNING_INTERVENTION_PENALTY = 2;

/** Acknowledged Critical 1件あたりの減点。 */
export const CRITICAL_INTERVENTION_PENALTY = 5;

/** 7日間比較に必要な最低有効日数。 */
export const MIN_DAYS_FOR_7D_COMPARISON = 4;

/** 30日間比較に必要な最低有効日数。 */
export const MIN_DAYS_FOR_30D_COMPARISON = 14;
