"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Plus, Trash2, Edit, Globe, FileText, Folder, Zap, Search } from "lucide-react";
import { AgentsSidebar } from "@/components/AgentsSidebar";
import { ProfileModal } from "@/components/ProfileModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Agent, Profile } from "@/lib/types";

const MODEL_SHORT: Record<string, string> = {
  "claude-opus-4-7": "Opus 4.7",
  "claude-sonnet-4-6": "Sonnet 4.6",
  "claude-haiku-4-5-20251001": "Haiku 4.5",
};

const SOURCE_ICONS = {
  website: Globe,
  file: FileText,
  folder: Folder,
  api: Zap,
};

export default function AgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("profile_id");
    if (!id) {
      setShowProfileModal(true);
      setLoading(false);
      return;
    }
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((data: Profile[]) => {
        const found = data.find((p) => p.id === id);
        if (found) setProfile(found);
        else setShowProfileModal(true);
      });
  }, []);

  useEffect(() => {
    if (!profile) return;
    fetch(`/api/agents?profileId=${profile.id}`)
      .then((r) => r.json())
      .then((data) => setAgents(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [refreshSignal, profile]);

  const handleDelete = async (agent: Agent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${agent.name}"? This cannot be undone.`)) return;
    await fetch(`/api/agents/${agent.id}`, { method: "DELETE" });
    setRefreshSignal((s) => s + 1);
  };

  const filtered = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ProfileModal
        open={showProfileModal}
        currentProfileId={profile?.id}
        onSelect={(p) => {
          localStorage.setItem("profile_id", p.id);
          setProfile(p);
          setShowProfileModal(false);
        }}
        onClose={() => profile && setShowProfileModal(false)}
      />
      <AgentsSidebar
        profile={profile}
        activeSessionId={null}
        onNewChat={() => router.push("/")}
        onNewManualAgent={() => router.push("/?manual=1")}
        onSelectSession={(id) => router.push(`/?session=${id}`)}
        onSwitchProfile={() => setShowProfileModal(true)}
        refreshSignal={refreshSignal}
      />

      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">My Agents</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {agents.length} agent{agents.length !== 1 ? "s" : ""} created
              </p>
            </div>
            <Button onClick={() => router.push("/")} className="gap-2">
              <Plus className="h-4 w-4" />
              New Agent
            </Button>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <Bot className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">
                  {search ? "No agents found" : "No agents yet"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {search
                    ? "Try a different search term"
                    : "Start a conversation to build your first agent"}
                </p>
              </div>
              {!search && (
                <Button onClick={() => router.push("/")} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Build your first agent
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onClick={() => router.push(`/agents/${agent.id}`)}
                  onDelete={(e) => handleDelete(agent, e)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function AgentCard({
  agent,
  onClick,
  onDelete,
}: {
  agent: Agent;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const sources = (agent.knowledgeSources || []) as Array<{ type: string; name: string }>;
  const tools = (agent.tools || []) as Array<{ name: string }>;

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col gap-3 p-4 rounded-lg border bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate">{agent.name}</h3>
            <Badge variant="secondary" className="text-xs mt-0.5">
              {MODEL_SHORT[agent.model] || agent.model}
            </Badge>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground line-clamp-2">{agent.description}</p>

      <div className="flex flex-wrap gap-1.5 mt-auto">
        {sources.slice(0, 3).map((s, i) => {
          const Icon = SOURCE_ICONS[s.type as keyof typeof SOURCE_ICONS] || Globe;
          return (
            <span
              key={i}
              className="flex items-center gap-1 text-xs bg-muted px-1.5 py-0.5 rounded"
            >
              <Icon className="h-3 w-3" />
              {s.name}
            </span>
          );
        })}
        {sources.length > 3 && (
          <span className="text-xs text-muted-foreground">+{sources.length - 3} more</span>
        )}
        {tools.length > 0 && (
          <span className="flex items-center gap-1 text-xs bg-muted px-1.5 py-0.5 rounded">
            <Zap className="h-3 w-3" />
            {tools.length} tool{tools.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Updated {new Date(agent.updatedAt).toLocaleDateString()}
      </p>
    </div>
  );
}
