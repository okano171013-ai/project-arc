/**
 * Quick Capture — 生活ログを送信するための最小限のHTMLフォーム
 * （Version36でReflectionのみ実装、Version37でMealLog/WeightLog/
 * FinanceLogへ拡張、Version38でNutritionLogへ拡張、Version39で
 * ローカル版・cloud版（Cloudflare Worker）共通の実装へ統合、
 * ADR 0066・0069・0070）。外部JS依存なし、`fetch`のみで
 * `POST /ingress`を叩く。送信側クライアントが存在しなかった
 * Version35の空白（Report10章）を埋める最小実装。
 *
 * ローカル版（`mobileIngress.ts`、node:http）とcloud版
 * （`cloudflare/src/worker.ts`、Cloudflare Workers）の両方から
 * importされる共通モジュール——Node固有API・Workers固有APIのどちらも
 * 使わない純粋な文字列生成関数のため、両ランタイムで動作する
 * （Version39、ADR 0070「UIをローカル/cloud間で重複実装しない」）。
 *
 * NutritionLogは`mealLogId`をOwnerが手入力する設計とした——Mobile
 * IngressのTransport層はCanonical Storeを直接参照しないため、
 * どのMealLogに紐付くかをSystemが推測することはできない
 * （Constitution第2条・Owner指示書「入力から別typeを推測・自動生成
 * しないでください」）。既存MealLogのidをOwnerが把握している前提の
 * 手動入力欄とした。
 *
 * 認証トークンの扱い（Version39、Owner指示書2026-07-20）：
 * トークンはこのHTML/JSに一切ハードコードしない。既定では
 * localStorageへ保存せず、ページを開くたびに空欄から始まる
 * （メモリ上の変数のみ）。Ownerが明示的に「このデバイスに保存する」
 * にチェックした場合のみ、危険性の説明を表示した上でlocalStorageへ
 * 保存する（opt-in）。いつでも「消去」ボタンで削除できる。
 * URL query・ログ・監査ログにもトークン値は一切出力しない。
 *
 * CSP（Content-Security-Policy）：呼び出し側が発行したper-request
 * nonceを`<script>`/`<style>`タグへ埋め込む。呼び出し側は同じnonceを
 * 含むCSPヘッダーを返すこと（`script-src 'nonce-...'`、
 * `'unsafe-inline'`は使わない）——このページ自体はリクエスト由来の
 * 値を一切HTMLへ埋め込まない静的フォームだが、将来の実装ミスに備える
 * 多層防御としてのnonce方式とした。
 *
 * 送信UX（Version39、Owner指示書2026-07-20）：
 * 同じ論理エントリの再送では同じidempotencyKeyを使い回す
 * （オフライン・通信失敗からの再試行で重複を作らない）。送信直後に
 * 自動でsubmission statusを確認する。ネットワーク断・サーバー
 * エラー時は入力内容を消さない。
 */
export function renderQuickCaptureHtml(nonce: string): string {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ARC Mobile Ingress — Quick Capture</title>
<style nonce="${nonce}">
  body { font-family: sans-serif; max-width: 480px; margin: 2rem auto; padding: 0 1rem; }
  label { display: block; margin-top: 1rem; font-weight: bold; }
  input, textarea, select { width: 100%; box-sizing: border-box; padding: 0.5rem; margin-top: 0.25rem; }
  button { margin-top: 1.5rem; padding: 0.75rem 1.5rem; width: 100%; }
  #status { margin-top: 1rem; padding: 0.75rem; border-radius: 4px; display: none; }
  #status.pending { display: block; background: #f1f3f4; color: #3c4043; }
  #status.ok { display: block; background: #e6f4ea; color: #1e4620; }
  #status.err { display: block; background: #fce8e6; color: #611a15; }
  fieldset { border: none; padding: 0; margin: 0; }
  .type-fields { display: none; }
  .type-fields.active { display: block; }
  details { margin-top: 1.5rem; }
  .warn { color: #611a15; font-size: 0.85em; display: none; }
  .warn.show { display: block; }
  .small-btn { margin-top: 0.5rem; padding: 0.4rem 0.8rem; width: auto; font-size: 0.85em; }
  .small-btn.hidden { display: none; }
  .inline-checkbox { width: auto; display: inline; }
  .checkbox-label { font-weight: normal; }
</style>
</head>
<body>
<h1>ARC Quick Capture</h1>
<p>生活ログをProject ARCへ送信します（受信のみ、PC起動時に反映されます）。</p>
<form id="f">
  <label>種類
    <select name="payloadType" id="payloadType">
      <option value="Reflection">今日の振り返り</option>
      <option value="MealLog">食事</option>
      <option value="NutritionLog">栄養（食事に紐付け）</option>
      <option value="WeightLog">体重</option>
      <option value="FinanceLog">支出・収入</option>
    </select>
  </label>

  <fieldset class="type-fields active" data-type="Reflection">
    <label>日付<input type="date" name="reflection-date" data-required-when-active></label>
    <label>今日頑張ったこと<input type="text" name="proudOf"></label>
    <label>今日の出来事<textarea name="todaysEvents" rows="3"></textarea></label>
    <label>気分
      <select name="mood">
        <option value="">（未選択）</option>
        <option value="great">great</option>
        <option value="good">good</option>
        <option value="neutral">neutral</option>
        <option value="low">low</option>
        <option value="bad">bad</option>
      </select>
    </label>
    <label>メモ<textarea name="notes" rows="3"></textarea></label>
  </fieldset>

  <fieldset class="type-fields" data-type="MealLog">
    <label>日時<input type="datetime-local" name="meal-occurredAt"></label>
    <label>食事の種類
      <select name="mealType">
        <option value="">（未選択）</option>
        <option value="breakfast">朝食</option>
        <option value="lunch">昼食</option>
        <option value="dinner">夕食</option>
        <option value="snack">間食</option>
        <option value="other">その他</option>
      </select>
    </label>
    <label>食べたもの（カンマ区切り）<input type="text" name="items"></label>
    <label>メモ<textarea name="meal-notes" rows="2"></textarea></label>
  </fieldset>

  <fieldset class="type-fields" data-type="NutritionLog">
    <p>紐付ける食事の記録ID（<code>GET /ingress</code>や後日Owner確認で
    分かったMealLogのidを手入力してください。Systemは自動で紐付けを
    推測しません）。</p>
    <label>MealLogのid<input type="text" name="mealLogId" data-required-when-active></label>
    <label>カロリー（kcal）<input type="number" step="1" name="calories"></label>
    <label>タンパク質（g）<input type="number" step="0.1" name="proteinG"></label>
    <label>根拠（basis、必須）<input type="text" name="basis" data-required-when-active placeholder="例：栄養成分表示から算出"></label>
    <label>確信度
      <select name="confidence">
        <option value="">（未選択）</option>
        <option value="low">low</option>
        <option value="medium">medium</option>
        <option value="high">high</option>
      </select>
    </label>
    <label>不確実性の注記（confidence未選択の場合はこちらが必須）<input type="text" name="uncertaintyNote"></label>
    <label><input type="checkbox" name="estimated" checked class="inline-checkbox"> 推定値である</label>
  </fieldset>

  <fieldset class="type-fields" data-type="WeightLog">
    <label>日時<input type="datetime-local" name="weight-measuredAt"></label>
    <label>体重（kg）<input type="number" step="0.01" name="weightKg"></label>
    <label>計測状況（例：起床後）<input type="text" name="measurementContext"></label>
  </fieldset>

  <fieldset class="type-fields" data-type="FinanceLog">
    <label>日時<input type="datetime-local" name="finance-occurredAt"></label>
    <label>種別
      <select name="financeType">
        <option value="Expense">支出</option>
        <option value="Income">収入</option>
      </select>
    </label>
    <label>金額（円）<input type="number" step="1" name="amount"></label>
    <label>カテゴリ<input type="text" name="category"></label>
  </fieldset>

  <button type="submit">送信</button>
</form>
<div id="status"></div>
<button id="checkStatusBtn" type="button" class="small-btn hidden">状態を再確認</button>
<div id="statusCheck"></div>
<details>
  <summary>APIトークン設定（LAN公開時のみ必要）</summary>
  <label>トークン<input type="password" id="tokenInput" autocomplete="off"></label>
  <label class="checkbox-label">
    <input type="checkbox" id="persistToken" class="inline-checkbox">
    このデバイスに保存する
  </label>
  <p id="persistWarning" class="warn">
    保存すると、この端末のブラウザにトークンが平文で残ります。共有・
    貸与する端末では推奨しません。「消去」でいつでも削除できます。
  </p>
  <button type="button" id="clearTokenBtn" class="small-btn">保存したトークンを消去</button>
</details>
<script nonce="${nonce}">
const form = document.getElementById('f');
const statusEl = document.getElementById('status');
const typeSelect = document.getElementById('payloadType');

// --- トークン（Version39）：既定では保存しない。opt-inした場合のみlocalStorageへ。 ---
const tokenInput = document.getElementById('tokenInput');
const persistCheckbox = document.getElementById('persistToken');
const persistWarning = document.getElementById('persistWarning');
const clearTokenBtn = document.getElementById('clearTokenBtn');
const TOKEN_KEY = 'arc-mobile-ingress-token';

const savedToken = localStorage.getItem(TOKEN_KEY);
if (savedToken !== null) {
  // 過去にopt-inして保存された場合のみ復元する（既定の空欄開始ではない）。
  tokenInput.value = savedToken;
  persistCheckbox.checked = true;
  persistWarning.classList.add('show');
}
persistCheckbox.addEventListener('change', () => {
  persistWarning.classList.toggle('show', persistCheckbox.checked);
  if (persistCheckbox.checked) {
    localStorage.setItem(TOKEN_KEY, tokenInput.value);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
});
tokenInput.addEventListener('input', () => {
  if (persistCheckbox.checked) localStorage.setItem(TOKEN_KEY, tokenInput.value);
});
clearTokenBtn.addEventListener('click', () => {
  localStorage.removeItem(TOKEN_KEY);
  tokenInput.value = '';
  persistCheckbox.checked = false;
  persistWarning.classList.remove('show');
});

document.querySelector('input[name="reflection-date"]').valueAsDate = new Date();
const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
form.querySelector('input[name="meal-occurredAt"]').value = nowLocal;
form.querySelector('input[name="weight-measuredAt"]').value = nowLocal;
form.querySelector('input[name="finance-occurredAt"]').value = nowLocal;

// 送信中の1件の論理エントリに紐づくidempotencyKey（Version39）。
// 送信失敗時（オフライン・通信エラー）は同じ値を再利用して再送する
// ——サーバー側は既に受理済みならduplicate:trueを返すだけで、
// 二重の記録は作られない。確定成功後にnullへ戻し、次の入力で
// 新しいキーを生成する。
let currentSubmissionKey = null;

// 種類を切り替えたら新しい記録の入力とみなし、再利用中のidempotencyKeyを破棄する。
// 非表示のfieldset内のrequiredフィールドが、ネイティブのフォーム
// バリデーションによって送信自体をブロックしてしまう不具合
// （実機のヘッドレスブラウザ検証で発見、Version39）への対処として、
// アクティブなfieldset内のフィールドにのみrequiredを付与する。
function updateVisibleFields() {
  document.querySelectorAll('.type-fields').forEach((el) => {
    const isActive = el.dataset.type === typeSelect.value;
    el.classList.toggle('active', isActive);
    el.querySelectorAll('[data-required-when-active]').forEach((field) => {
      field.required = isActive;
    });
  });
  currentSubmissionKey = null;
}
typeSelect.addEventListener('change', updateVisibleFields);
updateVisibleFields();

function buildPayload(fd) {
  const type = fd.get('payloadType');
  if (type === 'Reflection') {
    const record = {};
    const proudOf = fd.get('proudOf');
    const todaysEvents = fd.get('todaysEvents');
    const mood = fd.get('mood');
    const notes = fd.get('notes');
    if (proudOf) record.proudOf = proudOf;
    if (todaysEvents) record.todaysEvents = todaysEvents;
    if (mood) record.mood = mood;
    if (notes) record.notes = notes;
    return { payloadType: 'Reflection', payload: { date: fd.get('reflection-date'), record } };
  }
  if (type === 'MealLog') {
    const items = String(fd.get('items') || '').split(',').map((s) => s.trim()).filter(Boolean);
    const record = { occurredAt: new Date(fd.get('meal-occurredAt')).toISOString(), items };
    const mealType = fd.get('mealType');
    const notes = fd.get('meal-notes');
    if (mealType) record.mealType = mealType;
    if (notes) record.notes = notes;
    return { payloadType: 'MealLog', payload: { record } };
  }
  if (type === 'NutritionLog') {
    const record = {
      mealLogId: fd.get('mealLogId'),
      basis: fd.get('basis'),
      estimated: fd.get('estimated') === 'on',
    };
    const calories = fd.get('calories');
    const proteinG = fd.get('proteinG');
    const confidence = fd.get('confidence');
    const uncertaintyNote = fd.get('uncertaintyNote');
    if (calories) record.calories = Number(calories);
    if (proteinG) record.proteinG = Number(proteinG);
    if (confidence) record.confidence = confidence;
    if (uncertaintyNote) record.uncertaintyNote = uncertaintyNote;
    return { payloadType: 'NutritionLog', payload: { record } };
  }
  if (type === 'WeightLog') {
    const record = {
      measuredAt: new Date(fd.get('weight-measuredAt')).toISOString(),
      weightKg: Number(fd.get('weightKg')),
    };
    const context = fd.get('measurementContext');
    if (context) record.measurementContext = context;
    return { payloadType: 'WeightLog', payload: { record } };
  }
  if (type === 'FinanceLog') {
    const record = {
      occurredAt: new Date(fd.get('finance-occurredAt')).toISOString(),
      type: fd.get('financeType'),
      amount: Number(fd.get('amount')),
    };
    const category = fd.get('category');
    if (category) record.category = category;
    return { payloadType: 'FinanceLog', payload: { record } };
  }
  throw new Error('unknown type: ' + type);
}

const checkStatusBtn = document.getElementById('checkStatusBtn');
const statusCheckEl = document.getElementById('statusCheck');

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (tokenInput.value) headers['Authorization'] = 'Bearer ' + tokenInput.value;
  return headers;
}

async function checkStatus(key) {
  statusCheckEl.textContent = '確認中...';
  try {
    const res = await fetch('/ingress?idempotencyKey=' + encodeURIComponent(key), { headers: authHeaders() });
    const json = await res.json();
    const record = json.records && json.records[0];
    statusCheckEl.textContent = record ? ('状態: ' + record.status) : '見つかりませんでした';
  } catch (err) {
    statusCheckEl.textContent = 'エラー: ' + err;
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  let typed;
  try {
    typed = buildPayload(fd);
  } catch (err) {
    statusEl.className = 'err';
    statusEl.textContent = 'エラー: ' + err;
    return;
  }
  // 同じ論理エントリの再送では同じidempotencyKeyを使い回す
  // ——オフライン・通信失敗からの再試行で重複作成しないため。
  if (!currentSubmissionKey) {
    currentSubmissionKey = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random();
  }
  const body = {
    idempotencyKey: currentSubmissionKey,
    payloadType: typed.payloadType,
    payload: typed.payload,
    clientCreatedAt: new Date().toISOString(),
  };
  statusEl.className = 'pending';
  statusEl.textContent = '送信中...';
  checkStatusBtn.classList.add('hidden');
  statusCheckEl.textContent = '';
  try {
    const res = await fetch('/ingress', { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
    const json = await res.json();
    if (res.ok) {
      statusEl.className = 'ok';
      statusEl.textContent = json.duplicate ? '送信済みでした（重複）' : '送信しました（PC起動時にProject ARCへ反映されます）';
      checkStatusBtn.classList.remove('hidden');
      checkStatusBtn.dataset.key = currentSubmissionKey;
      // 送信直後に自動で状態を確認する（Owner指示：送信直後にstatusを表示）。
      void checkStatus(currentSubmissionKey);
      // 確定成功——次の入力のために新しいidempotencyKeyへ切り替え、フォームをクリアする。
      currentSubmissionKey = null;
      form.reset();
      updateVisibleFields();
    } else {
      // 4xx等のサーバー応答——入力内容は保持し、同じキーで再試行できるようにする。
      statusEl.className = 'err';
      statusEl.textContent = 'エラー（内容は保持されています。修正して再送してください）: ' + (json.error || res.status);
    }
  } catch (err) {
    // ネットワーク断・オフライン——入力内容とidempotencyKeyを保持し、そのまま再送できるようにする。
    statusEl.className = 'err';
    statusEl.textContent = '送信できませんでした。内容は保持されています。もう一度送信してください: ' + err;
  }
});

checkStatusBtn.addEventListener('click', () => {
  const key = checkStatusBtn.dataset.key;
  if (key) void checkStatus(key);
});
</script>
</body>
</html>
`;
}

