import { Link, useLocation } from "@tanstack/react-router";
import { Home, Compass, PlusSquare, Bell, User, Search, Zap, Shield, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const loc = useLocation();
  const [unread, setUnread] = useState(0);
  const [confirmOut, setConfirmOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setUnread(count ?? 0);
    };
    load();
    const ch = supabase
      .channel("notif-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const isActive = (p: string) => loc.pathname === p || (p !== "/" && loc.pathname.startsWith(p));

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      {/* Top nav */}
      <header className="sticky top-0 z-40 glass-strong border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-bg grid place-items-center glow-soft">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg gradient-text hidden sm:inline">Electronics Journey</span>
            <span className="font-bold text-lg gradient-text sm:hidden">EJ</span>
          </Link>
          <Link to="/search" className="flex-1 max-w-md">
            <div className="glass rounded-full px-4 h-9 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
              <Search className="h-4 w-4" />
              <span>Search projects, users, components…</span>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <Link to="/admin" className="p-2 hover:text-primary transition" title="Admin">
                <Shield className="h-5 w-5" />
              </Link>
            )}
            {user ? (
              <button onClick={() => setConfirmOut(true)} className="p-2 hover:text-destructive transition" title="Sign out">
                <LogOut className="h-5 w-5" />
              </button>
            ) : (
              <Link to="/login" className="px-4 h-9 rounded-full gradient-bg text-white text-sm font-medium grid place-items-center glow-soft">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden">
        <div className="glass-strong rounded-full px-2 py-2 flex items-center gap-1 glow-soft">
          <NavIcon to="/" icon={<Home className="h-5 w-5" />} active={isActive("/") && loc.pathname === "/"} />
          <NavIcon to="/quick-learn" icon={<Compass className="h-5 w-5" />} active={isActive("/quick-learn")} />
          <NavIcon to="/projects/new" icon={<PlusSquare className="h-5 w-5" />} active={isActive("/projects/new")} highlight />
          <NavIcon to="/notifications" icon={<Bell className="h-5 w-5" />} active={isActive("/notifications")} badge={unread} />
          <NavIcon
            to={profile ? `/profile/${profile.username}` : "/login"}
            icon={profile?.avatar_url
              ? <img src={profile.avatar_url} className="h-7 w-7 rounded-full object-cover" />
              : <User className="h-5 w-5" />}
            active={isActive("/profile")}
          />
        </div>
      </nav>

      {confirmOut && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center px-4 animate-in fade-in duration-200"
          onClick={() => !signingOut && setConfirmOut(false)}
        >
          <div className="absolute inset-0 bg-background/70 backdrop-blur-xl" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm glass-strong rounded-3xl p-7 glow-soft border border-white/10 animate-in zoom-in-95 duration-200"
          >
            <div className="mx-auto h-14 w-14 rounded-2xl gradient-bg grid place-items-center glow-soft mb-4">
              <Zap className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-center gradient-text">Leaving so soon?</h3>
            <p className="text-sm text-center text-muted-foreground mt-2 leading-relaxed">
              We'll miss your creativity ⚡<br />
              Come back soon to keep building amazing projects.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                disabled={signingOut}
                onClick={() => setConfirmOut(false)}
                className="glass rounded-xl py-3 text-sm font-medium hover:bg-white/5 transition disabled:opacity-50"
              >
                Stay Here
              </button>
              <button
                disabled={signingOut}
                onClick={async () => {
                  setSigningOut(true);
                  await signOut();
                  setSigningOut(false);
                  setConfirmOut(false);
                }}
                className="rounded-xl py-3 text-sm font-medium bg-destructive/90 hover:bg-destructive text-white transition disabled:opacity-60"
              >
                {signingOut ? "Signing out…" : "Logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavIcon({ to, icon, active, badge, highlight }: { to: string; icon: React.ReactNode; active?: boolean; badge?: number; highlight?: boolean }) {
  return (
    <Link
      to={to}
      className={`relative h-11 w-11 grid place-items-center rounded-full transition ${
        highlight ? "gradient-bg text-white glow-soft" : active ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {badge ? (
        <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-[10px] font-bold text-white grid place-items-center">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </Link>
  );
}
