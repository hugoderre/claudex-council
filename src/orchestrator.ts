import type { LLMProvider, Message } from './providers/types.js';
import { serializeHistory } from './history.js';
import {
  PROPOSER_SYSTEM,
  CRITIC_SYSTEM,
  SYNTHESIZER_SYSTEM,
  buildUserPrompt,
} from './prompts.js';

export interface CouncilOptions {
  prompt: string;
  proposer: LLMProvider;
  critic: LLMProvider;
  rounds: number;
  verbose: boolean;
  onRoundStart: (round: number, provider: string, role: string) => void;
  onRoundEnd: (round: number, response: string) => void;
  onChunk?: (text: string) => void;
}

export interface CouncilResult {
  messages: Message[];
  synthesis: string;
}

export class CouncilError extends Error {
  constructor(
    message: string,
    public readonly partialMessages: Message[],
  ) {
    super(message);
    this.name = 'CouncilError';
  }
}

export async function runCouncil(options: CouncilOptions): Promise<CouncilResult> {
  const { prompt, proposer, critic, rounds, verbose, onRoundStart, onRoundEnd, onChunk } = options;
  const messages: Message[] = [];
  const streamCallback = verbose && onChunk ? onChunk : undefined;

  try {
    for (let i = 1; i <= rounds; i++) {
      const isProposerTurn = i % 2 === 1;
      const provider = isProposerTurn ? proposer : critic;
      const role = isProposerTurn ? 'proposer' : 'critic';
      const systemPrompt = isProposerTurn ? PROPOSER_SYSTEM : CRITIC_SYSTEM;

      onRoundStart(i, provider.name, role);

      const history = serializeHistory(messages);
      const userPrompt = buildUserPrompt(prompt, history, role);
      const response = await provider.call(systemPrompt, userPrompt, streamCallback);

      messages.push({ round: i, role, provider: provider.name, content: response });
      onRoundEnd(i, response);
    }

    // Final synthesis — always by proposer (Claude)
    onRoundStart(rounds + 1, proposer.name, 'synthesizer');
    const history = serializeHistory(messages);
    const synthesisPrompt = buildUserPrompt(prompt, history, 'synthesizer');
    const synthesis = await proposer.call(SYNTHESIZER_SYSTEM, synthesisPrompt, streamCallback);
    onRoundEnd(rounds + 1, synthesis);

    return { messages, synthesis };
  } catch (error) {
    throw new CouncilError((error as Error).message, messages);
  }
}
