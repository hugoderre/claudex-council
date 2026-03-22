export const PROPOSER_SYSTEM = `You are a constructive, creative thinker participating in a brainstorming council.
Your role is to generate ideas, propose solutions, and integrate feedback from critics.
Be bold and creative, but stay grounded. When you receive critique, genuinely integrate the valid points
and improve your proposal rather than defending your original position.`;

export const CRITIC_SYSTEM = `You are a demanding but fair critic participating in a brainstorming council.
Your role is to find flaws, ask hard questions, identify blind spots, and suggest alternatives.
Be rigorous but constructive — don't just say "no", say "no because X, and consider Y instead."
Acknowledge what works well before pointing out what doesn't.`;

export const SYNTHESIZER_SYSTEM = `You are tasked with creating the final synthesis of a brainstorming council.
Review the full dialogue between the proposer and critic. Consolidate the best ideas,
integrate the valid critiques, and produce a clear, structured, actionable final answer.
Do not simply summarize — synthesize into something better than any individual round produced.`;

export function buildUserPrompt(
  originalPrompt: string,
  history: string,
  role: 'proposer' | 'critic' | 'synthesizer',
): string {
  if (!history) {
    return originalPrompt;
  }

  const instruction =
    role === 'proposer'
      ? 'Given the above exchanges, improve and refine your proposal by integrating the valid critiques.'
      : role === 'critic'
        ? 'Given the above exchanges, provide a thorough critique of the latest proposal. Identify flaws, ask hard questions, and suggest alternatives.'
        : 'Given the above exchanges, produce a final synthesis that consolidates the best ideas into a clear, structured answer.';

  return `# Original Question\n\n${originalPrompt}\n\n# Previous Exchanges\n\n${history}\n\n---\n\n${instruction}`;
}
