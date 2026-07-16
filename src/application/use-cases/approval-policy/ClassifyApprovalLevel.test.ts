import { describe, it, expect } from 'vitest';
import { ClassifyApprovalLevelUseCase } from './ClassifyApprovalLevel.js';

describe('ClassifyApprovalLevelUseCase', () => {
  const useCase = new ClassifyApprovalLevelUseCase();

  it('escalates to Level1 when signals are not declared at all (未申告のエスカレーション)', () => {
    const result = useCase.execute(undefined);
    expect(result.level).toBe('Level1');
    expect(result.triggeredSignals).toEqual([]);
  });

  it('classifies as Level0 when signals are explicitly declared and all false (全signal false)', () => {
    const result = useCase.execute({
      costImpact: false,
      externalExposureChange: false,
      authOrSecretChange: false,
      destructive: false,
      personalDataExternalTransfer: false,
      constitutionOrPrincipleChange: false,
    });
    expect(result.level).toBe('Level0');
    expect(result.triggeredSignals).toEqual([]);
  });

  it('classifies as Level0 when an empty signals object is declared (空オブジェクト)', () => {
    const result = useCase.execute({});
    expect(result.level).toBe('Level0');
  });

  it.each([
    'costImpact',
    'externalExposureChange',
    'authOrSecretChange',
    'destructive',
    'personalDataExternalTransfer',
    'constitutionOrPrincipleChange',
  ] as const)('escalates to Level2 when %s is true (単一signalでのLevel2昇格)', (key) => {
    const result = useCase.execute({ [key]: true });
    expect(result.level).toBe('Level2');
    expect(result.triggeredSignals).toEqual([key]);
  });

  it('stays at Level2 (the ceiling) when multiple signals are true (複数signal時の最高Level採用)', () => {
    const result = useCase.execute({ costImpact: true, destructive: true });
    expect(result.level).toBe('Level2');
    expect(result.triggeredSignals).toEqual(['costImpact', 'destructive']);
  });

  it('forces Level2 for AgentDelegationGrant regardless of signals (Version24: type固定ルール)', () => {
    const withNoSignals = useCase.execute(undefined, 'AgentDelegationGrant');
    expect(withNoSignals.level).toBe('Level2');

    const withAllFalseSignals = useCase.execute(
      {
        costImpact: false,
        externalExposureChange: false,
        authOrSecretChange: false,
        destructive: false,
        personalDataExternalTransfer: false,
        constitutionOrPrincipleChange: false,
      },
      'AgentDelegationGrant',
    );
    expect(withAllFalseSignals.level).toBe('Level2');
    expect(withAllFalseSignals.triggeredSignals).toEqual([]);
  });
});
