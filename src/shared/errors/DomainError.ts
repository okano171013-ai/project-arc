/**
 * DomainError
 *
 * Domain/Application層から投げるエラーの基底クラス。
 * Infrastructure層固有のエラー（DB接続エラー等）と区別するために使う。
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}
