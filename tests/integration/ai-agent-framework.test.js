import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const productCatalog = JSON.parse(
  readFileSync('apps/web/public/data/ai-agents-product.json', 'utf8')
);
const workerCatalog = JSON.parse(
  readFileSync('workers/ai-gateway/src/product-agents.json', 'utf8')
);
const workerSource = readFileSync('workers/ai-gateway/src/index.js', 'utf8');

describe('SNUHmate AI agent framework contract', () => {
  it('ships user and admin agents in the public product catalog', () => {
    const byId = Object.fromEntries(productCatalog.map(agent => [agent.id, agent]));

    expect(byId['snuhmate-user-copilot']).toMatchObject({
      audience: 'user',
      framework: 'cloudflare-agents-sdk-ready-sse',
    });
    expect(byId['snuhmate-ops-admin-copilot']).toMatchObject({
      audience: 'admin',
      requires_admin: true,
      framework: 'cloudflare-agents-sdk-ready-sse',
    });
  });

  it('does not expose runnable prompt internals to the static browser catalog', () => {
    for (const agent of productCatalog) {
      expect(agent.system_prompt).toBeUndefined();
      expect(agent.user_prompt_template).toBeUndefined();
    }
  });

  it('keeps Worker runnable templates aligned with the public catalog', () => {
    expect(workerCatalog.map(agent => agent.id).sort()).toEqual(
      productCatalog.map(agent => agent.id).sort()
    );
    for (const agent of workerCatalog) {
      expect(agent.system_prompt).toEqual(expect.any(String));
      expect(agent.user_prompt_template).toEqual(expect.any(String));
    }
  });

  it('protects admin agents and converts provider SSE into client deltas', () => {
    expect(workerSource).toContain('authorizeAgent(template, request, env, origin)');
    expect(workerSource).toContain('template.requires_admin');
    expect(workerSource).toContain('providerSseToClientSse(upstream, origin)');
    expect(workerSource).toContain('parsed.choices?.[0]?.delta?.content');
  });
});
