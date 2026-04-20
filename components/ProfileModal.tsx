"use client";

import { useEffect, useState } from "react";
import { User, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Profile } from "@/lib/types";

interface ProfileModalProps {
  open: boolean;
  onSelect: (profile: Profile) => void;
  currentProfileId?: string | null;
  onClose?: () => void;
}

export function ProfileModal({ open, onSelect, currentProfileId, onClose }: ProfileModalProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((data) => setProfiles(Array.isArray(data) ? data : []))
      .catch(() => setProfiles([]))
      .finally(() => setLoading(false));
  }, [open]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) return;
      const profile: Profile = await res.json();
      setProfiles((p) => [...p, profile]);
      setNewName("");
      onSelect(profile);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this profile and all its chats and agents?")) return;
    await fetch(`/api/profiles/${id}`, { method: "DELETE" });
    setProfiles((p) => p.filter((pr) => pr.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose a Profile</DialogTitle>
          <DialogDescription>
            Profiles keep your chat history and agents separate.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
          {loading && (
            <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
          )}
          {!loading && profiles.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No profiles yet. Create one below.
            </p>
          )}
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md border hover:bg-accent transition-colors text-left ${
                currentProfileId === p.id ? "bg-accent border-primary" : ""
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <span className="flex-1 text-sm font-medium truncate">{p.name}</span>
              <button
                onClick={(e) => handleDelete(p.id, e)}
                className="text-muted-foreground hover:text-destructive p-1"
                aria-label="Delete profile"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 pt-3 border-t">
          <p className="text-xs font-medium text-muted-foreground">Create new profile</p>
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Your name"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              disabled={creating}
            />
            <Button onClick={handleCreate} disabled={!newName.trim() || creating} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
