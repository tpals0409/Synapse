import type { Message } from '@synapse/protocol';
import type { RecallCandidate } from './types.ts';

export type RecallContext = {
  recentMessages: Message[];
};

export async function recall(_context: RecallContext): Promise<RecallCandidate[]> {
  throw new Error('engine.recall: not implemented in sprint 0');
}
