type ConversationState =
  | { step: "awaiting_origin" }
  | { step: "awaiting_destination"; origin: string };

const store = new Map<number, ConversationState>();

export function getConversationState(chatId: number): ConversationState | undefined {
  return store.get(chatId);
}

export function setConversationState(chatId: number, state: ConversationState): void {
  store.set(chatId, state);
}

export function clearConversationState(chatId: number): void {
  store.delete(chatId);
}
