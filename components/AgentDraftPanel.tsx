"use client";

import { useState } from "react";
import {
  Bot,
  Save,
  Trash2,
  Globe,
  FileText,
  Folder,
  Zap,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Agent, AgentDraft, AgentModel, KnowledgeSource } from "@/lib/types";
import { cn } from "@/lib/utils";

const MODEL_LABELS: Record<AgentModel, { label: string; description: string }> = {
  "claude-opus-4-7": { label: "Claude Opus 4.7", description: "Most capable" },
  "claude-sonnet-4-6": { label: "Claude Sonnet 4.6", description: "Recommended" },
  "claude-haiku-4-5-20251001": { label: "Claude Haiku 4.5", description: "Fastest" },
};

const SOURCE_ICONS = {
  website: Globe,
  file: FileText,
  folder: Folder,
  api: Zap,
};

interface AgentDraftPanelProps {
  draft: AgentDraft | null;
  savedAgent: Agent | null;
  onSave: (data: AgentDraft) => void;
  onDelete?: () => void;
  isSaving?: boolean;
  saveError?: string | null;
}

export function AgentDraftPanel({
  draft,
  savedAgent,
  onSave,
  onDelete,
  isSaving,
  saveError,
}: AgentDraftPanelProps) {
  const data = savedAgent || draft;
  const [editedDraft, setEditedDraft] = useState<AgentDraft>({});
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    prompt: true,
    knowledge: false,
    tools: false,
  });
  const [newSource, setNewSource] = useState<Partial<KnowledgeSource>>({
    type: "website",
  });
  const [showAddSource, setShowAddSource] = useState(false);

  const merged = { ...data, ...editedDraft };
  const hasChanges = Object.keys(editedDraft).length > 0;

  const toggle = (section: keyof typeof expandedSections) =>
    setExpandedSections((s) => ({ ...s, [section]: !s[section] }));

  const handleSave = () => {
    onSave(merged as AgentDraft);
    setEditedDraft({});
  };

  const addSource = () => {
    if (!newSource.name || !newSource.value) return;
    const source: KnowledgeSource = {
      id: crypto.randomUUID(),
      type: newSource.type || "website",
      name: newSource.name,
      value: newSource.value,
      description: newSource.description,
    };
    const current = (merged.knowledgeSources || []) as KnowledgeSource[];
    setEditedDraft((d) => ({ ...d, knowledgeSources: [...current, source] }));
    setNewSource({ type: "website" });
    setShowAddSource(false);
  };

  const removeSource = (id: string) => {
    const current = (merged.knowledgeSources || []) as KnowledgeSource[];
    setEditedDraft((d) => ({
      ...d,
      knowledgeSources: current.filter((s) => s.id !== id),
    }));
  };

  if (!data && !draft) {
    return (
      <div className="w-80 border-l bg-card flex flex-col items-center justify-center h-full shrink-0">
        <div className="flex flex-col items-center gap-3 text-center px-6">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Bot className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Agent Preview</p>
          <p className="text-xs text-muted-foreground">
            Start a conversation to build your agent. It will appear here as it&apos;s created.
          </p>
        </div>
      </div>
    );
  }

  return (
    <aside className="w-80 border-l bg-card flex flex-col h-full shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">
            {savedAgent ? "Agent Details" : "Agent Preview"}
          </span>
        </div>
        {savedAgent && (
          <Badge variant="secondary" className="text-xs">
            Saved
          </Badge>
        )}
        {!savedAgent && draft?.name && (
          <Badge variant="outline" className="text-xs">
            Draft
          </Badge>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 flex flex-col gap-4">
          {/* Basic Info */}
          <Section
            title="Basic Info"
            expanded={expandedSections.basic}
            onToggle={() => toggle("basic")}
          >
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Name</Label>
                <Input
                  value={(editedDraft.name ?? merged.name) || ""}
                  onChange={(e) =>
                    setEditedDraft((d) => ({ ...d, name: e.target.value }))
                  }
                  placeholder="Agent name"
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={(editedDraft.description ?? merged.description) || ""}
                  onChange={(e) =>
                    setEditedDraft((d) => ({ ...d, description: e.target.value }))
                  }
                  placeholder="What does this agent do?"
                  className="text-sm min-h-[60px] resize-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Model</Label>
                <Select
                  value={(editedDraft.model ?? merged.model) || "claude-sonnet-4-6"}
                  onValueChange={(v) =>
                    setEditedDraft((d) => ({ ...d, model: v as AgentModel }))
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MODEL_LABELS).map(([value, { label, description }]) => (
                      <SelectItem key={value} value={value}>
                        <span>{label}</span>
                        <span className="text-xs text-muted-foreground ml-1">
                          — {description}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Section>

          {/* System Prompt */}
          <Section
            title="System Prompt"
            expanded={expandedSections.prompt}
            onToggle={() => toggle("prompt")}
          >
            <Textarea
              value={(editedDraft.systemPrompt ?? merged.systemPrompt) || ""}
              onChange={(e) =>
                setEditedDraft((d) => ({ ...d, systemPrompt: e.target.value }))
              }
              placeholder="Instructions for the agent..."
              className="text-xs min-h-[120px] font-mono"
            />
          </Section>

          {/* Knowledge Sources */}
          <Section
            title={`Knowledge Sources (${(merged.knowledgeSources || []).length})`}
            expanded={expandedSections.knowledge}
            onToggle={() => toggle("knowledge")}
          >
            <div className="flex flex-col gap-2">
              {((editedDraft.knowledgeSources ?? merged.knowledgeSources) || []).map(
                (source) => {
                  const s = source as KnowledgeSource;
                  const Icon = SOURCE_ICONS[s.type];
                  return (
                    <div
                      key={s.id}
                      className="flex items-start gap-2 p-2 rounded-md border bg-background"
                    >
                      <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.value}</p>
                      </div>
                      <button
                        onClick={() => removeSource(s.id)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                }
              )}

              {showAddSource ? (
                <div className="flex flex-col gap-2 p-2 rounded-md border bg-background">
                  <Select
                    value={newSource.type}
                    onValueChange={(v) =>
                      setNewSource((s) => ({ ...s, type: v as KnowledgeSource["type"] }))
                    }
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="file">File</SelectItem>
                      <SelectItem value="folder">Folder</SelectItem>
                      <SelectItem value="api">API</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Name"
                    value={newSource.name || ""}
                    onChange={(e) => setNewSource((s) => ({ ...s, name: e.target.value }))}
                    className="h-7 text-xs"
                  />
                  <Input
                    placeholder={
                      newSource.type === "website"
                        ? "https://..."
                        : newSource.type === "api"
                        ? "https://api.example.com/..."
                        : "/path/to/..."
                    }
                    value={newSource.value || ""}
                    onChange={(e) => setNewSource((s) => ({ ...s, value: e.target.value }))}
                    className="h-7 text-xs"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs flex-1" onClick={addSource}>
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
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
                  className="h-7 text-xs gap-1"
                  onClick={() => setShowAddSource(true)}
                >
                  <Plus className="h-3 w-3" />
                  Add Source
                </Button>
              )}
            </div>
          </Section>

          {/* Tools */}
          <Section
            title={`Tools (${(merged.tools || []).length})`}
            expanded={expandedSections.tools}
            onToggle={() => toggle("tools")}
          >
            <div className="flex flex-col gap-2">
              {((editedDraft.tools ?? merged.tools) || []).map((tool, i) => {
                const t = tool as { name: string; description: string };
                return (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-2 rounded-md border bg-background"
                  >
                    <Zap className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                    </div>
                  </div>
                );
              })}
              {(merged.tools || []).length === 0 && (
                <p className="text-xs text-muted-foreground">No tools configured</p>
              )}
            </div>
          </Section>
        </div>
      </ScrollArea>

      <div className="p-3 border-t flex flex-col gap-2">
        {saveError && (
          <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1.5">
            {saveError}
          </p>
        )}
        <Button
          onClick={handleSave}
          disabled={!merged.name || !merged.systemPrompt || isSaving}
          className="w-full gap-2"
          size="sm"
        >
          <Save className="h-3.5 w-3.5" />
          {isSaving ? "Saving..." : savedAgent ? "Save Changes" : "Save Agent"}
          {hasChanges && !isSaving && (
            <span className="ml-auto w-2 h-2 rounded-full bg-orange-400" />
          )}
        </Button>
        {onDelete && savedAgent && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Agent
          </Button>
        )}
      </div>
    </aside>
  );
}

function Section({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={onToggle}
        className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
      >
        {title}
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {expanded && children}
    </div>
  );
}
