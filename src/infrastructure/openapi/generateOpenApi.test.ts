import { describe, it, expect } from 'vitest';
import { generateOpenApiDocument } from './generateOpenApi.js';

describe('generateOpenApiDocument', () => {
  it('produces a valid OpenAPI 3.x document with operationId for every path (指示書6章)', () => {
    const doc = generateOpenApiDocument();

    expect(doc.openapi).toBe('3.0.0');
    expect(doc.info.title).toBeTruthy();

    const paths = Object.keys(doc.paths ?? {});
    expect(paths.sort()).toEqual(
      [
        '/read/reflection',
        '/read/timeline',
        '/read/external',
        '/read/decision',
        '/proposal/create',
        '/proposal/approve',
        '/proposal/reject',
        '/management-feedback',
        '/management-feedback/{id}/resolve',
        '/agent-messages',
        '/approval-decisions',
      ].sort(),
    );

    for (const [path, pathItem] of Object.entries(doc.paths ?? {})) {
      for (const [method, operation] of Object.entries(pathItem as Record<string, unknown>)) {
        if (typeof operation !== 'object' || operation === null) continue;
        expect(
          (operation as { operationId?: string }).operationId,
          `${method.toUpperCase()} ${path} must have an operationId`,
        ).toBeTruthy();
        expect((operation as { responses?: unknown }).responses).toBeTruthy();
      }
    }
  });

  it('includes request bodies for POST endpoints (request schema present)', () => {
    const doc = generateOpenApiDocument();
    const createProposal = (doc.paths as Record<string, Record<string, { requestBody?: unknown }>>)[
      '/proposal/create'
    ]?.post;
    expect(createProposal?.requestBody).toBeTruthy();
  });
});
