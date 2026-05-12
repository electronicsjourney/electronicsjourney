import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { Trash2, Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const { isAdmin, loading, user } = useAuth();
  const nav = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [tab, setTab] = useState<"overview" | "users" | "projects">("overview");

  useEffect(() => {
    if (!loading && !isAdmin) { toast.error("Admin only"); nav({ to: "/" }); }
  }, [loading, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const [u, p, c, n] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("projects").select("*", { count: "exact", head: true }),
        supabase.from("project_comments").select("*", { count: "exact", head: true }),
        supabase.from("quick_learn").select("*", { count: "exact", head: true }),
      ]);
      setStats({ users: u.count, projects: p.count, comments: c.count, posts: n.count });
      const { data: ulist } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(50);
      setUsers(ulist ?? []);
      const { data: plist } = await supabase.from("projects").select("*, profiles!projects_user_id_fkey(username)").order("created_at", { ascending: false }).limit(50);
      setProjects(plist ?? []);
    })();
  }, [isAdmin]);

  const delProject = async (id: string) => {
    if (!confirm("Delete project?")) return;
    await supabase.from("projects").delete().eq("id", id);
    setProjects((ps) => ps.filter((p) => p.id !== id));
    toast.success("Deleted");
  };

  const broadcast = async () => {
    const msg = prompt("Announcement to all users:");
    if (!msg || !user) return;
    const { data: all } = await supabase.from("profiles").select("id");
    if (!all) return;
    const rows = all.map((u) => ({ user_id: u.id, actor_id: user.id, type: "admin", message: msg, link: "/" }));
    const { error } = await supabase.from("notifications").insert(rows);
    if (error) toast.error(error.message); else toast.success(`Sent to ${rows.length} users`);
  };

  if (loading || !isAdmin) return <AppShell><div className="text-center py-20">Checking access…</div></AppShell>;

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Admin</h1>
          <p className="text-sm text-muted-foreground">Super admin dashboard</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {["overview", "users", "projects"].map((t) => (
          <button key={t} onClick={() => setTab(t as any)}
            className={`px-4 py-2 rounded-full text-sm capitalize ${tab === t ? "gradient-bg text-white" : "glass"}`}>{t}</button>
        ))}
        <button onClick={broadcast} className="ml-auto glass rounded-full px-4 py-2 text-sm">📣 Broadcast</button>
      </div>

      {tab === "overview" && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Users" value={stats.users} />
          <Stat label="Projects" value={stats.projects} />
          <Stat label="Comments" value={stats.comments} />
          <Stat label="Quick Learn" value={stats.posts} />
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-2">
          {users.map((u) => (
            <Link key={u.id} to="/profile/$username" params={{ username: u.username }} className="glass rounded-xl p-3 flex items-center gap-3 hover:glow-soft">
              <div className="h-10 w-10 rounded-full gradient-bg grid place-items-center text-white font-bold">{u.username[0]?.toUpperCase()}</div>
              <div className="flex-1"><div className="font-medium">@{u.username}</div><div className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</div></div>
            </Link>
          ))}
        </div>
      )}

      {tab === "projects" && (
        <div className="space-y-2">
          {projects.map((p) => (
            <div key={p.id} className="glass rounded-xl p-3 flex items-center gap-3">
              <Link to="/projects/$id" params={{ id: p.id }} className="flex-1">
                <div className="font-medium">{p.title}</div>
                <div className="text-xs text-muted-foreground">@{p.profiles?.username}</div>
              </Link>
              <button onClick={() => delProject(p.id)} className="glass rounded-full p-2 text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-strong rounded-2xl p-5">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-3xl font-bold gradient-text mt-1">{value ?? 0}</div>
    </div>
  );
}
