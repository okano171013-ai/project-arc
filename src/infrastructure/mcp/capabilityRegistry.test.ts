import { describe, it, expect } from 'vitest';
import { getMcpCapabilityRegistry, MCP_TOOL_NAMES, PROJECT_ARC_VERSION } from './capabilityRegistry.js';

describe('getMcpCapabilityRegistry (Version40, ADR 0072)', () => {
  it('includes environment diagnostics for stale-process detection (Owner指示項目5)', () => {
    const registry = getMcpCapabilityRegistry();

    expect(registry.projectVersion).toBe(PROJECT_ARC_VERSION);
    expect(registry.toolCount).toBe(MCP_TOOL_NAMES.length);
    expect(registry.environment.cwd).toBe(process.cwd());
    expect(registry.environment.dataDirectory).toContain('data');
    expect(registry.environment.processUptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(new Date(registry.environment.processStartedAt).toString()).not.toBe('Invalid Date');
  });

  it('reports dataFileCount as a number when the data directory is readable, or null otherwise', () => {
    const registry = getMcpCapabilityRegistry();
    expect(registry.environment.dataFileCount === null || typeof registry.environment.dataFileCount === 'number').toBe(
      true,
    );
  });

  it('includes the newly added StudySession lifecycle tools', () => {
    const registry = getMcpCapabilityRegistry();
    expect(registry.toolNames).toContain('study_session_create');
    expect(registry.toolNames).toContain('study_session_update');
    expect(registry.toolNames).toContain('study_session_finish');
    expect(registry.toolNames).toContain('study_session_list');
    expect(registry.toolNames).toContain('study_summary_by_date');
    expect(registry.toolNames).toContain('study_summary_by_period');
  });
});
