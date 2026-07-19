import { describe, it, expect } from 'vitest';
import { DevelopmentGrant } from './DevelopmentGrant.js';

function baseRecord(overrides: Partial<Parameters<typeof DevelopmentGrant.create>[0]['record']> = {}) {
  return {
    scope: { repositories: ['project-arc'], branchPrefix: 'auto/' },
    maxVersionCount: 3,
    costCeiling: 0 as const,
    reason: 'テスト',
    ...overrides,
  };
}

describe('DevelopmentGrant', () => {
  it('creates as Active with versionsConsumed 0 (作成、既定Active)', () => {
    const grant = DevelopmentGrant.create({ id: 'g-1', record: baseRecord() });
    expect(grant.status).toBe('Active');
    expect(grant.versionsConsumed).toBe(0);
  });

  it('rejects empty repositories (空repositoriesの拒否)', () => {
    expect(() =>
      DevelopmentGrant.create({ id: 'g-2', record: baseRecord({ scope: { repositories: [], branchPrefix: 'auto/' } }) }),
    ).toThrow('scope.repositories must not be empty');
  });

  it('rejects empty branchPrefix (空branchPrefixの拒否)', () => {
    expect(() =>
      DevelopmentGrant.create({
        id: 'g-3',
        record: baseRecord({ scope: { repositories: ['project-arc'], branchPrefix: '' } }),
      }),
    ).toThrow('scope.branchPrefix must not be empty');
  });

  it('rejects non-positive maxVersionCount (maxVersionCount<=0の拒否)', () => {
    expect(() => DevelopmentGrant.create({ id: 'g-4', record: baseRecord({ maxVersionCount: 0 }) })).toThrow(
      'maxVersionCount must be positive',
    );
  });

  it('rejects a non-zero costCeiling even if the type system is bypassed (costCeiling!=0の実行時拒否)', () => {
    expect(() =>
      DevelopmentGrant.create({ id: 'g-5', record: baseRecord({ costCeiling: 5 as unknown as 0 }) }),
    ).toThrow('costCeiling must be 0');
  });

  it('rejects an empty reason (空reasonの拒否)', () => {
    expect(() => DevelopmentGrant.create({ id: 'g-6', record: baseRecord({ reason: '' }) })).toThrow(
      'reason must not be empty',
    );
  });

  describe('allowsBranch / allowsRepository', () => {
    const grant = DevelopmentGrant.create({ id: 'g-7', record: baseRecord() });

    it('allows branches under the prefix (prefix配下は許可)', () => {
      expect(grant.allowsBranch('auto/version33')).toBe(true);
    });

    it('rejects branches outside the prefix (prefix外は拒否)', () => {
      expect(grant.allowsBranch('main')).toBe(false);
      expect(grant.allowsBranch('feature/v4-v6-smart-capture')).toBe(false);
    });

    it('checks repository scope (repository scope)', () => {
      expect(grant.allowsRepository('project-arc')).toBe(true);
      expect(grant.allowsRepository('other-repo')).toBe(false);
    });
  });

  describe('isValidForNewVersion', () => {
    it('is true while under maxVersionCount and Active (上限未満かつActiveなら有効)', () => {
      const grant = DevelopmentGrant.create({ id: 'g-8', record: baseRecord({ maxVersionCount: 1 }) });
      expect(grant.isValidForNewVersion()).toBe(true);
    });

    it('is false once maxVersionCount is reached (上限到達で無効)', () => {
      const grant = DevelopmentGrant.create({ id: 'g-9', record: baseRecord({ maxVersionCount: 1 }) });
      grant.recordVersionConsumed();
      expect(grant.isValidForNewVersion()).toBe(false);
    });

    it('is false when Paused or Revoked (Paused/Revoked時は無効)', () => {
      const grant = DevelopmentGrant.create({ id: 'g-10', record: baseRecord() });
      grant.pause();
      expect(grant.isValidForNewVersion()).toBe(false);
      grant.resume();
      expect(grant.isValidForNewVersion()).toBe(true);
      grant.revoke();
      expect(grant.isValidForNewVersion()).toBe(false);
    });
  });

  describe('status transitions', () => {
    it('forbids resume() from Revoked (取消し後のresume拒否)', () => {
      const grant = DevelopmentGrant.create({ id: 'g-11', record: baseRecord() });
      grant.revoke();
      expect(() => grant.resume()).toThrow('Illegal DevelopmentGrant status transition: Revoked -> Active');
    });

    it('forbids any transition out of Revoked (Revokedは最終状態)', () => {
      const grant = DevelopmentGrant.create({ id: 'g-12', record: baseRecord() });
      grant.revoke();
      expect(() => grant.pause()).toThrow(/Illegal DevelopmentGrant status transition/);
    });
  });

  it('restores from persisted fields as-is (restore)', () => {
    const now = new Date('2026-07-19T00:00:00.000Z');
    const grant = DevelopmentGrant.restore({
      id: 'g-13',
      record: baseRecord(),
      createdAt: now,
      status: 'Paused',
      versionsConsumed: 2,
    });
    expect(grant.createdAt).toEqual(now);
    expect(grant.status).toBe('Paused');
    expect(grant.versionsConsumed).toBe(2);
  });
});
