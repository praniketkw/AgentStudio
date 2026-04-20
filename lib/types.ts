export type AgentModel =
  | "claude-opus-4-7"
  | "claude-sonnet-4-6"
  | "claude-haiku-4-5-20251001";

export type KnowledgeSourceType = "website" | "file" | "folder" | "api";

export interface KnowledgeSource {
  id: string;
  type: KnowledgeSourceType;
  name: string;
  value: string;
  description?: string;
}

export interface AgentTool {
  name: string;
  description: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  model: AgentModel;
  tools: AgentTool[];
  knowledgeSources: KnowledgeSource[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentDraft {
  name?: string;
  description?: string;
  systemPrompt?: string;
  model?: AgentModel;
  tools?: AgentTool[];
  knowledgeSources?: KnowledgeSource[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  result?: unknown;
}

export interface Profile {
  id: string;
  name: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  profileId: string;
  title: string;
  agentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatSessionWithMessages extends ChatSession {
  messages: ChatMessage[];
}
