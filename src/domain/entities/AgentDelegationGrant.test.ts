import { describe, it, expect } from 'vitest';
import { AgentDelegationGrant } from './AgentDelegationGrant.js';

function futureIso(msFromNow = 60 * 60 * 1000): string {
  return new Date(Date.now() + msFromNow).toISOString();
}

describe('AgentDelegationGrant', () => {
  it('creates as Active with usageCount 0 (作成、既定Active)', () => {
    const grant = AgentDelegationGrant.create({
      id: 'g-1',
      record: { scope: ['Reflection'], expiresAt: futureIso(), usageLimit: 5, reason: 'テスト' },
    });
    expect(grant.status).toBe('Active');
    expect(grant.usageCount).toBe(0);
  });

  it('rejects empty scope (空scopeの拒否)', () => {
    expect(() =>
      AgentDelegationGrant.create({
        id: 'g-2',
        record: { scope: [], expiresAt: futureIso(), usageLimit: 5, reason: 'テスト' },
      }),
    ).toThrow('scope must not be empty');
  });

  it('rejects non-positive usageLimit (usageLimit<=0の拒否)', () => {
    expect(() =>
      AgentDelegationGrant.create({
        id: 'g-3',
        record: { scope: ['Reflection'], expiresAt: futureIso(), usageLimit: 0, reason: 'テスト' },
      }),
    ).toThrow('usageLimit must be positive');
  });

  it('rejects an invalid expiresAt (不正なexpiresAtの拒否)', () => {
    expect(() =>
      AgentDelegationGrant.create({
        id: 'g-4',
        record: { scope: ['Reflection'], expiresAt: 'not-a-date', usageLimit: 5, reason: 'テスト' },
      }),
    ).toThrow('expiresAt must be a valid ISO8601 date');
  });

  describe('isValidFor', () => {
    it('is true within scope/expiry/usage limits (有効条件を満たす)', () => {
      const grant = AgentDelegationGrant.create({
        id: 'g-5',
        record: { scope: ['Reflection', 'ChallengeLog'], expiresAt: futureIso(), usageLimit: 3, reason: 'テスト' },
      });
      expect(grant.isValidFor('Reflection')).toBe(true);
      expect(grant.isValidFor('ChallengeLog')).toBe(true);
    });

    it('is false for a proposalType outside scope (scope外)', () => {
      const grant = AgentDelegationGrant.create({
        id: 'g-6',
        record: { scope: ['Reflection'], expiresAt: futureIso(), usageLimit: 3, reason: 'テスト' },
      });
      expect(grant.isValidFor('Memory')).toBe(false);
    });

    it('is false after expiresAt (期限切れ)', () => {
      const grant = AgentDelegationGrant.create({
        id: 'g-7',
        record: { scope: ['Reflection'], expiresAt: futureIso(-1000), usageLimit: 3, reason: 'テスト' },
      });
      expect(grant.isValidFor('Reflection')).toBe(false);
    });

    it('is false once usageLimit is reached (上限到達)', () => {
      const grant = AgentDelegationGrant.create({
        id: 'g-8',
        record: { scope: ['Reflection'], expiresAt: futureIso(), usageLimit: 1, reason: 'テスト' },
      });
      grant.recordUsage();
      expect(grant.isValidFor('Reflection')).toBe(false);
    });

    it('is false when Paused or Revoked (Paused/Revoked時は無効)', () => {
      const grant = AgentDelegationGrant.create({
        id: 'g-9',
        record: { scope: ['Reflection'], expiresAt: futureIso(), usageLimit: 3, reason: 'テスト' },
      });
      grant.pause();
      expect(grant.isValidFor('Reflection')).toBe(false);
      grant.resume();
      expect(grant.isValidFor('Reflection')).toBe(true);
      grant.revoke();
      expect(grant.isValidFor('Reflection')).toBe(false);
    });
  });

  describe('status transitions', () => {
    it('allows Active <-> Paused (相互遷移)', () => {
      const grant = AgentDelegationGrant.create({
        id: 'g-10',
        record: { scope: ['Reflection'], expiresAt: futureIso(), usageLimit: 3, reason: 'テスト' },
      });
      grant.pause();
      expect(grant.status).toBe('Paused');
      grant.resume();
      expect(grant.status).toBe('Active');
    });

    it('forbids resume() from Revoked — Claude Code/ARC cannot revive a grant (取消し後のresume拒否)', () => {
      const grant = AgentDelegationGrant.create({
        id: 'g-11',
        record: { scope: ['Reflection'], expiresAt: futureIso(), usageLimit: 3, reason: 'テスト' },
      });
      grant.revoke();
      expect(() => grant.resume()).toThrow('Illegal AgentDelegationGrant status transition: Revoked -> Active');
    });

    it('forbids any transition out of Revoked (Revokedは最終状態)', () => {
      const grant = AgentDelegationGrant.create({
        id: 'g-12',
        record: { scope: ['Reflection'], expiresAt: futureIso(), usageLimit: 3, reason: 'テスト' },
      });
      grant.revoke();
      expect(() => grant.pause()).toThrow(/Illegal AgentDelegationGrant status transition/);
      expect(() => grant.revoke()).toThrow(/Illegal AgentDelegationGrant status transition/);
    });
  });

  it('restores from persisted fields as-is (restore)', () => {
    const now = new Date('2026-07-16T00:00:00.000Z');
    const grant = AgentDelegationGrant.restore({
      id: 'g-13',
      record: { scope: ['Reflection'], expiresAt: futureIso(), usageLimit: 5, reason: 'テスト' },
      createdAt: now,
      status: 'Paused',
      usageCount: 2,
    });
    expect(grant.createdAt).toEqual(now);
    expect(grant.status).toBe('Paused');
    expect(grant.usageCount).toBe(2);
  });
});
