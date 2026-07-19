/**
 * BridgeLogType（Version9、Version10でExternalSource/ExternalKnowledgeを追加、
 * Version35でMealLog/NutritionLog/WeightLog/FinanceLog/StudySessionを追加）
 *
 * Import/Exportの対象となる全Log種別。Smart Captureの
 * `CaptureLogType`（4〜5種、「瞬間の出来事」のみ）より広く、
 * Memory・Life Inventory・Reflectionも含む「保存されている全ての
 * Log」を対象とする。Captureそのもの（監査記録）は対象外とする
 * （ADR 0010参照：Captureは「記録の結果」であり「記録の材料」では
 * ないため、Import/Exportの対象に含めると二重記録になりうる）。
 *
 * Version10指示書は`"externalSource"`/`"externalKnowledge"`という
 * lowerCamelCaseの例を示していたが、既存の値が全てEntity名と同じ
 * PascalCaseであるため、既存規則を優先し`'ExternalSource'`/
 * `'ExternalKnowledge'`とした（指示書23章「既存の命名規則と異なる
 * 場合は既存規則を優先する」、ADR 0015）。
 *
 * Version35：Mobile Ingress（ADR 0065）の`payloadType`は、新しい
 * 型を作らずこの型をそのまま再利用する——Life Log Phase 2
 * （Version25〜27）で追加されたMealLog等がBridge Layerに未対応
 * だったギャップも合わせて解消した。
 */
export type BridgeLogType =
  | 'Reflection'
  | 'Memory'
  | 'InventoryItem'
  | 'AppearanceLog'
  | 'SkinLog'
  | 'PurchaseLog'
  | 'ChallengeLog'
  | 'ThirdPersonEvaluation'
  | 'ExternalSource'
  | 'ExternalKnowledge'
  | 'MealLog'
  | 'NutritionLog'
  | 'WeightLog'
  | 'FinanceLog'
  | 'StudySession';
