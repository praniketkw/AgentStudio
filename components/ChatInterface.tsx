"use client";

import { useRef, useEffect, useState } from "react";
import { Send, Loader2, Bot, User, Wrench, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage, AgentDraft } from "@/lib/types";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { v4 as uuidv4 } from "uuid";

const TOOL_LABELS: Record<string, string> = {
  create_agent: "Creating agent...",
  update_agent: "Updating agent...",
  delete_agent: "Deleting agent...",
  list_agents: "Fetching agents...",
  get_agent: "Loading agent details...",
};

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  streamingText: string;
  activeToolCall: string | null;
  onSendMessage: (content: string) => void;
  onAgentMutation: (mutation: { type: string; data: unknown }) => void;
}

export function ChatInterface({
  messages,
  isLoading,
  streamingText,
  activeToolCall,
  onSendMessage,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    onSendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0 && !isLoading;

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {isEmpty && (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Build your AI Agent</h2>
                <p className="text-muted-foreground text-sm max-w-sm">
                  Describe what kind of agent you want to create. I&apos;ll help you design it,
                  populate all the settings, and save it — all through conversation.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {[
                  "Build a customer support agent",
                  "Create a code review assistant",
                  "Make a research agent",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => onSendMessage(prompt)}
                    className="px-3 py-1.5 text-xs rounded-full border hover:bg-accent transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {activeToolCall && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
                <Wrench className="h-4 w-4 animate-pulse text-primary" />
                {TOOL_LABELS[activeToolCall] || `Running ${activeToolCall}...`}
              </div>
            )}

            {streamingText && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{streamingText}</ReactMarkdown>
                  </div>
                  <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 align-middle" />
                </div>
              </div>
            )}

            {isLoading && !streamingText && !activeToolCall && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="flex items-center gap-1 h-7">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <div className="max-w-2xl mx-auto flex gap-3 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the agent you want to build..."
            className="resize-none min-h-[44px] max-h-[160px] text-sm"
            rows={1}
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="shrink-0 h-11 w-11"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
          isUser ? "bg-secondary" : "bg-primary/10"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4 text-primary" />
        )}
      </div>
      <div
        className={cn(
          "flex-1 min-w-0 max-w-[85%]",
          isUser && "flex justify-end"
        )}
      >
        {isUser ? (
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm inline-block">
            {message.content}
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {message.content ? (
              <ReactMarkdown>{message.content}</ReactMarkdown>
            ) : (
              <div className="flex items-center gap-1 text-muted-foreground text-sm">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Empty response</span>
              </div>
            )}
          </div>
        )}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 flex flex-col gap-1">
            {message.toolCalls.map((tc, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 w-fit"
              >
                <Wrench className="h-3 w-3" />
                <span>{TOOL_LABELS[tc.name] || tc.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function createUserMessage(content: string): ChatMessage {
  return { id: uuidv4(), role: "user", content };
}

export function createAssistantMessage(content: string, toolCalls?: ChatMessage["toolCalls"]): ChatMessage {
  return { id: uuidv4(), role: "assistant", content, toolCalls };
}
