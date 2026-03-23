import { describe, it, expect } from 'vitest';
import { serializeHistory } from '../src/history.js';
import type { Message } from '../src/providers/types.js';

describe('serializeHistory', () => {
  it('returns empty string for no messages', () => {
    expect(serializeHistory([])).toBe('');
  });

  it('formats single message in full', () => {
    const messages: Message[] = [
      { round: 1, role: 'proposer', provider: 'Claude', content: 'Hello world' },
    ];
    const result = serializeHistory(messages);
    expect(result).toContain('## Round 1 — Claude (proposer)');
    expect(result).toContain('Hello world');
    expect(result).not.toContain('[summary]');
  });

  it('formats 2 messages in full (within recent window)', () => {
    const messages: Message[] = [
      { round: 1, role: 'proposer', provider: 'Claude', content: 'Idea A' },
      { round: 2, role: 'critic', provider: 'Codex', content: 'Critique of A' },
    ];
    const result = serializeHistory(messages);
    expect(result).toContain('Idea A');
    expect(result).toContain('Critique of A');
    expect(result).not.toContain('[summary]');
  });

  it('summarizes older rounds and keeps recent in full', () => {
    const longContent = 'A'.repeat(500);
    const messages: Message[] = [
      { round: 1, role: 'proposer', provider: 'Claude', content: longContent },
      { round: 2, role: 'critic', provider: 'Codex', content: 'Critique round 2' },
      { round: 3, role: 'proposer', provider: 'Claude', content: 'Proposal round 3' },
      { round: 4, role: 'critic', provider: 'Codex', content: 'Critique round 4' },
    ];
    const result = serializeHistory(messages);

    // Round 1-2 should be summarized
    expect(result).toContain('Round 1');
    expect(result).toContain('[summary]');
    expect(result).not.toContain(longContent); // full 500-char content should be truncated
    expect(result).toContain('[...]');

    // Round 3-4 should be in full
    expect(result).toContain('Proposal round 3');
    expect(result).toContain('Critique round 4');
  });

  it('keeps messages in order', () => {
    const messages: Message[] = [
      { round: 1, role: 'proposer', provider: 'Claude', content: 'First' },
      { round: 2, role: 'critic', provider: 'Codex', content: 'Second' },
      { round: 3, role: 'proposer', provider: 'Claude', content: 'Third' },
    ];
    const result = serializeHistory(messages);
    expect(result.indexOf('Round 1')).toBeLessThan(result.indexOf('Round 2'));
    expect(result.indexOf('Round 2')).toBeLessThan(result.indexOf('Round 3'));
  });
});
