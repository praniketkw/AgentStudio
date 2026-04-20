"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Key, Trash2, CheckCircle } from "lucide-react";
import { AgentsSidebar } from "@/components/AgentsSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("anthropic_api_key");
    if (stored) setApiKey(stored);
  }, []);

  const handleSave = () => {
    const trimmed = apiKey.trim();
    if (!trimmed.startsWith("sk-ant-")) {
      setError("Key must start with sk-ant-");
      return;
    }
    localStorage.setItem("anthropic_api_key", trimmed);
    setError("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    if (!confirm("Remove your API key? You will need to re-enter it to use the app.")) return;
    localStorage.removeItem("anthropic_api_key");
    setApiKey("");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AgentsSidebar onNewChat={() => router.push("/")} />

      <main className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-8">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Settings</h1>
          </div>

          <div className="flex flex-col gap-6">
            <div className="p-6 rounded-lg border bg-card flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Anthropic API Key</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Your API key is stored in your browser&apos;s local storage and never sent to our
                servers. It is used directly to call the Anthropic API when you interact with the
                agent builder.
              </p>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="api-key">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="sk-ant-api03-..."
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setError("");
                      setSaved(false);
                    }}
                  />
                  <Button onClick={handleSave} disabled={!apiKey.trim()}>
                    {saved ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        Saved
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Need a key?{" "}
                  <a
                    href="https://console.anthropic.com/account/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Get one from console.anthropic.com
                  </a>
                </p>
                {apiKey && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-destructive hover:text-destructive"
                    onClick={handleClear}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove Key
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
