"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AgentsSidebar } from "@/components/AgentsSidebar";
import { ChatInterface, createUserMessage, createAssistantMessage } from "@/components/ChatInterface";
import { AgentDraftPanel } from "@/components/AgentDraftPanel";
import { ApiKeyModal } from "@/components/ApiKeyModal";
import { ProfileModal } from "@/components/ProfileModal";
import { ChatMessage, AgentDraft, Agent, Profile, ChatSessionWithMessages } from "@/lib/types";

type SSEEvent =
  | { type: "text"; text: string }
  | { type: "tool_call"; toolName: string; toolInput: unknown }
  | { type: "agent_mutation"; mutation: { type: string; data: unknown } }
  | { type: "done"; messageId: string }
  | { type: "error"; error: string };

function HomePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [apiKey, setApiKey] = useState<string>("");
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [activeToolCall, setActiveToolCall] = useState<string | null>(null);
  const [agentDraft, setAgentDraft] = useState<AgentDraft | null>(null);
  const [savedAgent, setSavedAgent] = useState<Agent | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Bootstrap API key + profile from localStorage
  useEffect(() => {
    const storedKey = localStorage.getItem("anthropic_api_key");
    if (storedKey) setApiKey(storedKey);
    else setShowApiKeyModal(true);

    const storedProfileId = localStorage.getItem("profile_id");
    if (storedProfileId) {
      fetch("/api/profiles")
        .then((r) => r.json())
        .then((data: Profile[]) => {
          const found = Array.isArray(data) ? data.find((p) => p.id === storedProfileId) : null;
          if (found) setProfile(found);
          else setShowProfileModal(true);
        })
        .catch(() => setShowProfileModal(true));
    } else {
      setShowProfileModal(true);
    }
  }, []);

  const handleApiKeySave = (key: string) => {
    localStorage.setItem("anthropic_api_key", key);
    setApiKey(key);
    setShowApiKeyModal(false);
  };

  const handleProfileSelect = (p: Profile) => {
    localStorage.setItem("profile_id", p.id);
    setProfile(p);
    setShowProfileModal(false);
    resetChatState();
  };

  const resetChatState = () => {
    setMessages([]);
    setSessionId(null);
    setAgentDraft(null);
    setSavedAgent(null);
    setStreamingText("");
    setActiveToolCall(null);
    setSaveError(null);
  };

  const handleNewChat = useCallback(() => {
    resetChatState();
  }, []);

  const handleNewManualAgent = useCallback(() => {
    resetChatState();
    setAgentDraft({
      name: "",
      description: "",
      systemPrompt: "",
      model: "claude-sonnet-4-6",
      tools: [],
      knowledgeSources: [],
    });
  }, []);

  const handleSelectSession = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/sessions/${id}`);
      if (!res.ok) return;
      const session: ChatSessionWithMessages = await res.json();
      setSessionId(id);
      setMessages(
        session.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          toolCalls: Array.isArray((m as unknown as { toolCalls: unknown }).toolCalls)
            ? ((m as unknown as { toolCalls: { name: string; input: Record<string, unknown> }[] }).toolCalls)
            : [],
        }))
      );
      setStreamingText("");
      setActiveToolCall(null);
      // Load linked agent if any
      if (session.agentId) {
        const agentRes = await fetch(`/api/agents/${session.agentId}`);
        if (agentRes.ok) {
          const agent: Agent = await agentRes.json();
          setSavedAgent(agent);
          setAgentDraft(null);
        }
      } else {
        setSavedAgent(null);
        setAgentDraft(null);
      }
    } catch {
      // ignore
    }
  }, []);

  // Handle ?manual=1 and ?session=... URL params from cross-page navigation
  useEffect(() => {
    const manual = searchParams.get("manual");
    const session = searchParams.get("session");
    if (manual === "1") {
      handleNewManualAgent();
      router.replace("/");
    } else if (session) {
      handleSelectSession(session);
      router.replace("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const ensureSession = async (): Promise<string | null> => {
    if (sessionId) return sessionId;
    if (!profile) return null;
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: profile.id }),
      });
      if (!res.ok) return null;
      const s = await res.json();
      setSessionId(s.id);
      setRefreshSignal((x) => x + 1);
      return s.id;
    } catch {
      return null;
    }
  };

  const handleAgentMutation = useCallback(
    (mutation: { type: string; data: unknown }) => {
      const agent = mutation.data as Agent;
      if (mutation.type === "created" || mutation.type === "updated") {
        setSavedAgent(agent);
        setAgentDraft(null);
        setRefreshSignal((s) => s + 1);
      } else if (mutation.type === "deleted") {
        setSavedAgent(null);
        setAgentDraft(null);
        setRefreshSignal((s) => s + 1);
      }
    },
    []
  );

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!apiKey) {
        setShowApiKeyModal(true);
        return;
      }
      if (!profile) {
        setShowProfileModal(true);
        return;
      }

      const activeSessionId = await ensureSession();

      const userMsg = createUserMessage(content);
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setIsLoading(true);
      setStreamingText("");
      setActiveToolCall(null);

      const apiMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
          body: JSON.stringify({
            messages: apiMessages,
            sessionId: activeSessionId,
            profileId: profile.id,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Request failed");
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accText = "";
        const toolCalls: ChatMessage["toolCalls"] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (!json) continue;

            let event: SSEEvent;
            try {
              event = JSON.parse(json);
            } catch {
              continue;
            }

            if (event.type === "text") {
              accText += event.text;
              setStreamingText(accText);
            } else if (event.type === "tool_call") {
              setActiveToolCall(event.toolName);
              toolCalls.push({ name: event.toolName, input: event.toolInput as Record<string, unknown> });
            } else if (event.type === "agent_mutation") {
              handleAgentMutation(event.mutation);
              setActiveToolCall(null);
            } else if (event.type === "done") {
              setStreamingText("");
              setActiveToolCall(null);
              const assistantMsg = createAssistantMessage(accText, toolCalls);
              setMessages((prev) => [...prev, assistantMsg]);
              accText = "";
            } else if (event.type === "error") {
              throw new Error(event.error);
            }
          }
        }
        setRefreshSignal((s) => s + 1);
      } catch (err) {
        const errorMsg = createAssistantMessage(
          `Sorry, something went wrong: ${err instanceof Error ? err.message : "Unknown error"}. Please check your API key in Settings.`
        );
        setMessages((prev) => [...prev, errorMsg]);
        setStreamingText("");
        setActiveToolCall(null);
      } finally {
        setIsLoading(false);
      }
    },
    [apiKey, profile, sessionId, messages, handleAgentMutation]
  );

  const handleSaveAgent = async (data: AgentDraft) => {
    if (!data.name || !data.systemPrompt) {
      setSaveError("Name and system prompt are required.");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      let res: Response;
      if (savedAgent) {
        res = await fetch(`/api/agents/${savedAgent.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        res = await fetch("/api/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name,
            description: data.description || "",
            systemPrompt: data.systemPrompt,
            model: data.model || "claude-sonnet-4-6",
            tools: data.tools || [],
            knowledgeSources: data.knowledgeSources || [],
            profileId: profile?.id,
          }),
        });
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Save failed (${res.status})`);
      }
      const result: Agent = await res.json();
      setSavedAgent(result);
      setAgentDraft(null);
      setRefreshSignal((s) => s + 1);
      // Link session to agent
      if (sessionId) {
        await fetch(`/api/sessions/${sessionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: result.id }),
        }).catch(() => {});
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAgent = async () => {
    if (!savedAgent) return;
    if (!confirm(`Delete "${savedAgent.name}"? This cannot be undone.`)) return;
    await fetch(`/api/agents/${savedAgent.id}`, { method: "DELETE" });
    setSavedAgent(null);
    setRefreshSignal((s) => s + 1);
  };

  return (
    <>
      <ApiKeyModal
        open={showApiKeyModal}
        onSave={handleApiKeySave}
        existingKey={apiKey}
      />
      <ProfileModal
        open={showProfileModal}
        currentProfileId={profile?.id}
        onSelect={handleProfileSelect}
        onClose={() => profile && setShowProfileModal(false)}
      />

      <div className="flex h-screen overflow-hidden bg-background">
        <AgentsSidebar
          profile={profile}
          activeSessionId={sessionId}
          onNewChat={handleNewChat}
          onNewManualAgent={handleNewManualAgent}
          onSelectSession={handleSelectSession}
          onSwitchProfile={() => setShowProfileModal(true)}
          refreshSignal={refreshSignal}
        />

        <main className="flex flex-1 overflow-hidden">
          <ChatInterface
            messages={messages}
            isLoading={isLoading}
            streamingText={streamingText}
            activeToolCall={activeToolCall}
            onSendMessage={handleSendMessage}
            onAgentMutation={handleAgentMutation}
          />

          <AgentDraftPanel
            draft={agentDraft}
            savedAgent={savedAgent}
            onSave={handleSaveAgent}
            onDelete={savedAgent ? handleDeleteAgent : undefined}
            isSaving={isSaving}
            saveError={saveError}
          />
        </main>
      </div>
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <HomePageInner />
    </Suspense>
  );
}
