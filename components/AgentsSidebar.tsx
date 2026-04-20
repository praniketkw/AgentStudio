"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Bot,
  Plus,
  Settings,
  LayoutGrid,
  MessageSquare,
  User,
  Trash2,
  PencilLine,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Agent, ChatSession, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AgentsSidebarProps {
  profile?: Profile | null;
  activeSessionId?: string | null;
  onNewChat: () => void;
  onNewManualAgent?: () => void;
  onSelectSession?: (sessionId: string) => void;
  onSwitchProfile?: () => void;
  refreshSignal?: number;
}

export function AgentsSidebar({
  profile: profileProp,
  activeSessionId,
  onNewChat,
  onNewManualAgent,
  onSelectSession,
  onSwitchProfile,
  refreshSignal,
}: AgentsSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [internalProfile, setInternalProfile] = useState<Profile | null>(null);
  const profile = profileProp ?? internalProfile;

  // Fall back to localStorage when no profile prop is passed (e.g. agent detail pages)
  useEffect(() => {
    if (profileProp !== undefined) return;
    const id = localStorage.getItem("profile_id");
    if (!id) return;
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((data: Profile[]) => {
        const found = data.find((p) => p.id === id);
        if (found) setInternalProfile(found);
      })
      .catch(() => {});
  }, [profileProp]);

  useEffect(() => {
    if (!profile) {
      setAgents([]);
      setSessions([]);
      return;
    }
    fetch(`/api/agents?profileId=${profile.id}`)
      .then((r) => r.json())
      .then((data) => setAgents(Array.isArray(data) ? data : []))
      .catch(() => setAgents([]));
    fetch(`/api/sessions?profileId=${profile.id}`)
      .then((r) => r.json())
      .then((data) => setSessions(Array.isArray(data) ? data : []))
      .catch(() => setSessions([]));
  }, [refreshSignal, profile]);

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this chat?")) return;
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    setSessions((s) => s.filter((x) => x.id !== id));
    if (activeSessionId === id) onNewChat();
  };

  return (
    <aside className="w-64 flex flex-col border-r bg-card h-full shrink-0">
      <div className="flex items-center gap-2 px-4 py-4 border-b">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
          <Bot className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-sm">Agent Builder</span>
      </div>

      <div className="px-3 py-3 flex flex-col gap-2 border-b">
        <Button
          className="w-full justify-start gap-2"
          size="sm"
          onClick={() => {
            router.push("/");
            onNewChat();
          }}
        >
          <Sparkles className="h-4 w-4" />
          New Chat
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          size="sm"
          onClick={() => {
            if (onNewManualAgent) {
              router.push("/");
              onNewManualAgent();
            } else {
              router.push("/?manual=1");
            }
          }}
        >
          <PencilLine className="h-4 w-4" />
          New Agent (Manual)
        </Button>
      </div>

      <nav className="px-3 py-2 flex flex-col gap-1 border-b">
        <Button
          variant={pathname === "/agents" ? "secondary" : "ghost"}
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => router.push("/agents")}
        >
          <LayoutGrid className="h-4 w-4" />
          My Agents
          {agents.length > 0 && (
            <span className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded-full">
              {agents.length}
            </span>
          )}
        </Button>
      </nav>

      <ScrollArea className="flex-1">
        <div className="px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mb-2">
            Chats
          </p>
          <div className="flex flex-col gap-0.5">
            {sessions.length === 0 && (
              <p className="text-xs text-muted-foreground px-1 py-2">No chats yet.</p>
            )}
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  if (onSelectSession) onSelectSession(s.id);
                  else router.push(`/?session=${s.id}`);
                }}
                className={cn(
                  "group w-full text-left px-2 py-1.5 rounded-md text-xs hover:bg-accent transition-colors flex items-center gap-2",
                  activeSessionId === s.id && "bg-accent"
                )}
              >
                <MessageSquare className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate flex-1">{s.title}</span>
                <span
                  onClick={(e) => handleDeleteSession(s.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                  role="button"
                  tabIndex={0}
                >
                  <Trash2 className="h-3 w-3" />
                </span>
              </button>
            ))}
          </div>

          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mt-4 mb-2">
            Agents
          </p>
          <div className="flex flex-col gap-1">
            {agents.length === 0 && (
              <p className="text-xs text-muted-foreground px-1 py-2">No agents yet.</p>
            )}
            {agents.slice(0, 20).map((agent) => (
              <button
                key={agent.id}
                onClick={() => router.push(`/agents/${agent.id}`)}
                className={cn(
                  "w-full text-left px-2 py-2 rounded-md text-sm hover:bg-accent transition-colors",
                  pathname === `/agents/${agent.id}` && "bg-accent"
                )}
              >
                <div className="flex items-center gap-2">
                  <Bot className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">{agent.name}</span>
                </div>
                {agent.description && (
                  <p className="text-xs text-muted-foreground truncate pl-5 mt-0.5">
                    {agent.description}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      </ScrollArea>

      <div className="mt-auto border-t flex flex-col">
        {profile && onSwitchProfile && (
          <button
            onClick={onSwitchProfile}
            className="flex items-center gap-2 px-3 py-2.5 hover:bg-accent transition-colors text-left"
          >
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{profile.name}</p>
              <p className="text-[10px] text-muted-foreground">Switch profile</p>
            </div>
          </button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 rounded-none"
          onClick={() => router.push("/settings")}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </div>
    </aside>
  );
}
