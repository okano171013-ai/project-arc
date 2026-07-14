import { describe, it, expect } from 'vitest';
import { isAuthorized } from './apiKeyAuth.js';

describe('isAuthorized', () => {
  it('returns true for a matching Bearer token (正しいkey)', () => {
    expect(isAuthorized('Bearer secret-key', 'secret-key')).toBe(true);
  });

  it('returns false for a mismatched token (誤ったkey)', () => {
    expect(isAuthorized('Bearer wrong-key', 'secret-key')).toBe(false);
  });

  it('returns false when the header is missing (ヘッダーなし)', () => {
    expect(isAuthorized(undefined, 'secret-key')).toBe(false);
  });

  it('returns false for a non-Bearer scheme (Bearer以外の形式)', () => {
    expect(isAuthorized('Basic secret-key', 'secret-key')).toBe(false);
    expect(isAuthorized('secret-key', 'secret-key')).toBe(false);
  });
});
