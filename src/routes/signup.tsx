import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Zap } from "lucide-react";

export const Route = createFileRoute("/signup")({ component: Signup });

function Signup() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (data.session) {
      toast.success("Account created!");
      nav({ to: "/" });
    } else {
      toast.success("Check your email to confirm your account.");
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) return toast.error(result.error.message);
    if (result.redirected) return;
    nav({ to: "/" });
  };

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-md glass-strong rounded-3xl p-8 glow-soft">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-10 w-10 rounded-xl gradient-bg grid place-items-center"><Zap className="h-5 w-5 text-white" /></div>
          <div>
            <div className="font-bold text-lg gradient-text">Join EJ</div>
            <div className="text-xs text-muted-foreground">Learn. Build. Innovate.</div>
          </div>
        </div>

        <button onClick={google} className="w-full glass rounded-xl py-3 flex items-center justify-center gap-2 hover:glow-soft transition mb-4">
          <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#fff" d="M21.35 11.1H12v3.2h5.35c-.23 1.4-1.65 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.95S8.78 6.5 12 6.5c1.83 0 3.06.78 3.76 1.45l2.57-2.48C16.7 3.95 14.55 3 12 3 6.99 3 3 6.99 3 12s3.99 9 9 9c5.2 0 8.65-3.65 8.65-8.8 0-.6-.07-1.05-.15-1.5z"/></svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-4 text-xs text-muted-foreground">
          <div className="h-px bg-border flex-1" /> OR <div className="h-px bg-border flex-1" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full glass rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
          <input type="password" required minLength={6} placeholder="Password (min 6)" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full glass rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
          <button disabled={loading} className="w-full gradient-bg text-white rounded-xl py-3 font-medium glow-soft disabled:opacity-60">
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>

        <div className="mt-4 text-sm text-center text-muted-foreground">
          Already have one? <Link to="/login" className="text-primary font-medium">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
