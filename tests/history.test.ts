import { describe, it, expect } from 'vitest';
import { serializeHistory } from '../src/history.js';
import type { Message } from '../src/providers/types.js';

describe('serializeHistory', () => {
  it('returns empty string for no messages', () => {
    expect(serializeHistory([])).toBe('');
  });

  it('formats single message', () => {
    const messages: Message[] = [
      { round: 1, role: 'proposer', provider: 'Claude', content: 'Hello world' },
    ];
    const result = serializeHistory(messages);
    expect(result).toContain('## Round 1 — Claude (proposer)');
    expect(result).toContain('Hello world');
  });

  it('formats multiple messages in order', () => {
    const messages: Message[] = [
      { round: 1, role: 'proposer', provider: 'Claude', content: 'Idea A' },
      { round: 2, role: 'critic', provider: 'Codex', content: 'Critique of A' },
    ];
    const result = serializeHistory(messages);
    expect(result.indexOf('Round 1')).toBeLessThan(result.indexOf('Round 2'));
  });
});
