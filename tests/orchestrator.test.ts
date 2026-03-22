import { describe, it, expect, vi } from 'vitest';
import { runCouncil } from '../src/orchestrator.js';
import type { LLMProvider } from '../src/providers/types.js';

function mockProvider(name: string, response: string): LLMProvider {
  return {
    name,
    call: vi.fn().mockResolvedValue(response),
  };
}

describe('runCouncil', () => {
  it('runs correct number of rounds plus synthesis', async () => {
    const claude = mockProvider('Claude', 'claude says');
    const codex = mockProvider('Codex', 'codex says');

    const result = await runCouncil({
      prompt: 'test question',
      proposer: claude,
      critic: codex,
      rounds: 3,
      verbose: false,
      onRoundStart: () => {},
      onRoundEnd: () => {},
    });

    // 3 rounds + 1 synthesis = 4 calls total
    // Claude: round 1, round 3, synthesis = 3 calls
    // Codex: round 2 = 1 call
    expect(claude.call).toHaveBeenCalledTimes(3);
    expect(codex.call).toHaveBeenCalledTimes(1);
    expect(result.messages).toHaveLength(3);
    expect(result.synthesis).toBe('claude says');
  });

  it('alternates proposer and critic', async () => {
    const claude = mockProvider('Claude', 'claude');
    const codex = mockProvider('Codex', 'codex');

    const result = await runCouncil({
      prompt: 'test',
      proposer: claude,
      critic: codex,
      rounds: 4,
      verbose: false,
      onRoundStart: () => {},
      onRoundEnd: () => {},
    });

    expect(result.messages[0].role).toBe('proposer');
    expect(result.messages[1].role).toBe('critic');
    expect(result.messages[2].role).toBe('proposer');
    expect(result.messages[3].role).toBe('critic');
  });
});
