export interface Message {
  round: number;
  role: 'proposer' | 'critic' | 'synthesizer';
  provider: string;
  content: string;
}

export interface LLMProvider {
  name: string;
  call(systemPrompt: string, userPrompt: string): Promise<string>;
}
