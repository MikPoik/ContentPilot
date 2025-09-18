// Legacy compatibility exports - all functionality has been moved to modular services
export { generateChatResponse, generateConversationTitle, generateEmbedding, extractProfileInfo, extractMemoriesFromConversation, type ChatResponseWithMetadata } from "./ai/chat";
export type { WorkflowPhaseDecision } from "./ai/workflow";
export type { WebSearchDecision } from "./ai/search";