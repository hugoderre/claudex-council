import { describe, it, expect } from 'vitest';
import { buildTranscript } from '../src/transcript.js';
import type { Message } from '../src/providers/types.js';

describe('buildTranscript', () => {
  it('builds markdown with header and rounds', () => {
    const messages: Message[] = [
      { round: 1, role: 'proposer', provider: 'Claude', content: 'Idea' },
      { round: 2, role: 'critic', provider: 'Codex', content: 'Critique' },
    ];
    const result = buildTranscript('test prompt', messages, 'Final answer');
    expect(result).toContain('# ClaudexCouncil Transcript');
    expect(result).toContain('**Prompt:** "test prompt"');
    expect(result).toContain('## Round 1 — Claude (proposer)');
    expect(result).toContain('Idea');
    expect(result).toContain('## Round 2 — Codex (critic)');
    expect(result).toContain('Critique');
    expect(result).toContain('## Final Synthesis');
    expect(result).toContain('Final answer');
  });
});
