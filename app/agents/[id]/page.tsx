"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Bot, Save, Trash2, Globe, FileText, Folder, Zap, Plus, X } from "lucide-react";
import { AgentsSidebar } from "@/components/AgentsSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Agent, AgentModel, KnowledgeSource } from "@/lib/types";

const MODEL_LABELS: Record<AgentModel, { label: string; description: string }> = {
  "claude-opus-4-7": { label: "Claude Opus 4.7", description: "Most capable" },
  "claude-sonnet-4-6": { label: "Claude Sonnet 4.6", description: "Recommended" },
  "claude-haiku-4-5-20251001": { label: "Claude Haiku 4.5", description: "Fastest" },
};

const SOURCE_ICONS = { website: Globe, file: FileText, folder: Folder, api: Zap };

export default function AgentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState<Partial<Agent>>({});
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSource, setNewSource] = useState<Partial<KnowledgeSource>>({ type: "website" });

  useEffect(() => {
    fetch(`/api/agents/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setAgent(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const merged = agent ? { ...agent, ...edits } : null;
  const hasChanges = Object.keys(edits).length > 0;

  const handleSave = async () => {
    if (!merged) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edits),
      });
      const updated = await res.json();
      setAgent(updated);
      setEdits({});
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!agent) return;
    if (!confirm(`Delete "${agent.name}"? This cannot be undone.`)) return;
    await fetch(`/api/agents/${id}`, { method: "DELETE" });
    router.push("/agents");
  };

  const addSource = () => {
    if (!newSource.name || !newSource.value || !merged) return;
    const source: KnowledgeSource = {
      id: crypto.randomUUID(),
      type: newSource.type || "website",
      name: newSource.name,
      value: newSource.value,
      description: newSource.description,
    };
    const current = (merged.knowledgeSources || []) as KnowledgeSource[];
    setEdits((e) => ({ ...e, knowledgeSources: [...current, source] }));
    setNewSource({ type: "website" });
    setShowAddSource(false);
  };

  const removeSource = (sourceId: string) => {
    if (!merged) return;
    const current = (merged.knowledgeSources || []) as KnowledgeSource[];
    setEdits((e) => ({
      ...e,
      knowledgeSources: current.filter((s) => s.id !== sourceId),
    }));
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <AgentsSidebar onNewChat={() => router.push("/")} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </main>
      </div>
    );
  }

  if (!merged) {
    return (
      <div className="flex h-screen bg-background">
        <AgentsSidebar onNewChat={() => router.push("/")} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="font-semibold">Agent not found</p>
            <Button variant="link" onClick={() => router.push("/agents")}>
              Back to agents
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const sources = (merged.knowledgeSources || []) as KnowledgeSource[];
  const tools = (merged.tools || []) as Array<{ name: string; description: string }>;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AgentsSidebar onNewChat={() => router.push("/")} />

      <main className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{agent?.name}</h1>
                <p className="text-xs text-muted-foreground">
                  Last updated {new Date(merged.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge variant="outline" className="text-xs text-orange-500 border-orange-500">
                  Unsaved changes
                </Badge>
              )}
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                size="sm"
                className="gap-2"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-destructive hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {/* Basic Info */}
            <Section title="Basic Info">
              <div className="grid grid-cols-1 gap-4">
                <Field label="Name">
                  <Input
                    value={edits.name ?? merged.name}
                    onChange={(e) => setEdits((ed) => ({ ...ed, name: e.target.value }))}
                  />
                </Field>
                <Field label="Description">
                  <Textarea
                    value={edits.description ?? merged.description}
                    onChange={(e) =>
                      setEdits((ed) => ({ ...ed, description: e.target.value }))
                    }
                    className="resize-none"
                    rows={2}
                  />
                </Field>
                <Field label="Model">
                  <Select
                    value={edits.model ?? merged.model}
                    onValueChange={(v) => setEdits((ed) => ({ ...ed, model: v as AgentModel }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MODEL_LABELS).map(([value, { label, description }]) => (
                        <SelectItem key={value} value={value}>
                          {label} — {description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </Section>

            {/* System Prompt */}
            <Section title="System Prompt">
              <Textarea
                value={edits.systemPrompt ?? merged.systemPrompt}
                onChange={(e) =>
                  setEdits((ed) => ({ ...ed, systemPrompt: e.target.value }))
                }
                className="font-mono text-sm resize-none"
                rows={12}
                placeholder="Instructions for the agent..."
              />
            </Section>

            {/* Knowledge Sources */}
            <Section title={`Knowledge Sources (${sources.length})`}>
              <div className="flex flex-col gap-2">
                {sources.map((source) => {
                  const Icon = SOURCE_ICONS[source.type as keyof typeof SOURCE_ICONS] || Globe;
                  return (
                    <div
                      key={source.id}
                      className="flex items-center gap-3 p-3 rounded-md border bg-card"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{source.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{source.value}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {source.type}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeSource(source.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}

                {showAddSource ? (
                  <div className="flex flex-col gap-2 p-3 rounded-md border bg-card">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs mb-1 block">Type</Label>
                        <Select
                          value={newSource.type}
                          onValueChange={(v) =>
                            setNewSource((s) => ({ ...s, type: v as KnowledgeSource["type"] }))
                          }
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="website">Website</SelectItem>
                            <SelectItem value="file">File</SelectItem>
                            <SelectItem value="folder">Folder</SelectItem>
                            <SelectItem value="api">API</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">Name</Label>
                        <Input
                          placeholder="Source name"
                          value={newSource.name || ""}
                          onChange={(e) =>
                            setNewSource((s) => ({ ...s, name: e.target.value }))
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">
                        {newSource.type === "website" || newSource.type === "api"
                          ? "URL"
                          : "Path"}
                      </Label>
                      <Input
                        placeholder={
                          newSource.type === "website"
                            ? "https://..."
                            : newSource.type === "api"
                            ? "https://api.example.com/..."
                            : "/path/to/..."
                        }
                        value={newSource.value || ""}
                        onChange={(e) =>
                          setNewSource((s) => ({ ...s, value: e.target.value }))
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-8" onClick={addSource}>
                        Add Source
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => setShowAddSource(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 w-fit"
                    onClick={() => setShowAddSource(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Add Knowledge Source
                  </Button>
                )}
              </div>
            </Section>

            {/* Tools */}
            <Section title={`Tools (${tools.length})`}>
              {tools.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tools configured.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {tools.map((tool, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-md border bg-card"
                    >
                      <Zap className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{tool.name}</p>
                        <p className="text-xs text-muted-foreground">{tool.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h2>
      <div className="p-4 rounded-lg border bg-card">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}
