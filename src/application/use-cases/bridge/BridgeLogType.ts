/**
 * BridgeLogType（Version9）
 *
 * Import/Exportの対象となる全Log種別。Smart Captureの
 * `CaptureLogType`（4〜5種、「瞬間の出来事」のみ）より広く、
 * Memory・Life Inventory・Reflectionも含む「保存されている全ての
 * Log」を対象とする。Captureそのもの（監査記録）は対象外とする
 * （ADR 0010参照：Captureは「記録の結果」であり「記録の材料」では
 * ないため、Import/Exportの対象に含めると二重記録になりうる）。
 */
export type BridgeLogType =
  | 'Reflection'
  | 'Memory'
  | 'InventoryItem'
  | 'AppearanceLog'
  | 'SkinLog'
  | 'PurchaseLog'
  | 'ChallengeLog'
  | 'ThirdPersonEvaluation';
