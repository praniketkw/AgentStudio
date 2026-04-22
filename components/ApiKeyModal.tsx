"use client";

import { useState } from "react";
import { Key, ExternalLink, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ApiKeyModalProps {
  open: boolean;
  onSave: (key: string) => void;
  existingKey?: string;
}

export function ApiKeyModal({ open, onSave, existingKey }: ApiKeyModalProps) {
  const [key, setKey] = useState(existingKey || "");
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);

  const handleSave = () => {
    const trimmed = key.trim();
    if (!trimmed.startsWith("sk-ant-")) {
      setError("Key must start with sk-ant-");
      return;
    }
    setError("");
    onSave(trimmed);
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Enter your Anthropic API Key
          </DialogTitle>
          <DialogDescription>
            Your key is stored only in your browser and never sent to our servers. It is
            used directly to call the Anthropic API.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="api-key">API Key</Label>
            <div className="relative">
              <Input
                id="api-key"
                type={show ? "text" : "password"}
                placeholder="sk-ant-api03-..."
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                className="pr-10"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <a
            href="https://console.anthropic.com/account/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors w-fit"
          >
            <ExternalLink className="h-3 w-3" />
            Get your key from console.anthropic.com
          </a>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={!key.trim()} className="w-full">
            Save & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
