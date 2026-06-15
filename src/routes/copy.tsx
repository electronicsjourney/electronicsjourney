import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

export const Route = createFileRoute("/copy")({
  component: CopyPage,
  head: () => ({ meta: [{ title: "Copy code" }] }),
});

function decode(s: string): string {
  try {
    // url-safe base64
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

function CopyPage() {
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.replace(/^#/, "");
    const hashParams = new URLSearchParams(hash.includes("=") ? hash : `c=${hash}`);
    const raw = params.get("c") || hashParams.get("c") || "";
    const text = decode(raw);
    setCode(text);
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => { try { window.close(); } catch {} }, 700);
      })
      .catch((e) => setErr(String(e?.message || e)));
  }, []);

  const copyNow = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setErr(null);
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  };

  return (
    <div className="min-h-screen px-4 py-10 flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold">Code snippet</h1>
          <button
            onClick={copyNow}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition ${
              copied ? "bg-primary text-primary-foreground" : "glass hover:text-primary"
            }`}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copy code
              </>
            )}
          </button>
        </div>
        {err && (
          <p className="text-xs text-amber-500 mb-2">
            Auto-copy blocked by the browser. Tap “Copy code”.
          </p>
        )}
        <pre className="rounded-2xl border border-white/10 bg-[oklch(0.10_0.04_270)]/90 text-[oklch(0.92_0.02_270)] p-4 overflow-x-auto text-sm font-mono leading-relaxed whitespace-pre-wrap">
          <code>{code || "(no code)"}</code>
        </pre>
      </div>
    </div>
  );
}
