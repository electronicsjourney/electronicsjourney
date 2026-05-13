import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };
  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-[oklch(0.10_0.04_270)]/90 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
          <span className="ml-3 text-muted-foreground uppercase tracking-wider">{language || "code"}</span>
        </div>
        <button onClick={copy}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition ${copied ? "bg-primary text-primary-foreground" : "glass hover:text-primary"}`}>
          {copied ? <><Check className="h-3.5 w-3.5" /> Code Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono leading-relaxed text-[oklch(0.92_0.02_270)]">
        <code>{code}</code>
      </pre>
    </div>
  );
}
