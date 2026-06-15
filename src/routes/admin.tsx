import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { Trash2, Shield, Newspaper, Star, Edit3, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({ component: AdminPage });

type AdminTab = "overview" | "users" | "projects" | "news";

function AdminPage() {
  const { isAdmin, loading, user } = useAuth();
  const nav = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [tab, setTab] = useState<AdminTab>("overview");

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

      <div className="flex gap-2 mb-6 flex-wrap">
        {(["overview", "users", "projects", "news"] as AdminTab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
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

      {tab === "news" && <NewsAutomation />}
    </AppShell>
  );
}

function NewsAutomation() {
  const [settings, setSettings] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const load = async () => {
    const [s, l, p] = await Promise.all([
      supabase.from("news_settings").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("news_run_logs").select("*").order("run_at", { ascending: false }).limit(20),
      supabase.from("quick_learn").select("*").eq("auto_generated", true).order("created_at", { ascending: false }).limit(40),
    ]);
    setSettings(s.data ?? { enabled: true, daily_count: 5 });
    setLogs(l.data ?? []);
    setPosts(p.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const updateSettings = async (patch: any) => {
    if (!settings?.id) return;
    const { error } = await supabase.from("news_settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", settings.id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    load();
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/public/hooks/news-fetch?force=1", { method: "POST" });
      const json = await res.json();
      if (json.ok) toast.success(`Imported ${json.inserted} · skipped ${json.skipped}`);
      else toast.error("Run failed");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Run failed");
    } finally {
      setRunning(false);
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm("Delete this imported post?")) return;
    await supabase.from("quick_learn").delete().eq("id", id);
    setPosts((ps) => ps.filter((p) => p.id !== id));
  };

  const toggleFeatured = async (p: any) => {
    await supabase.from("quick_learn").update({ featured: !p.featured }).eq("id", p.id);
    load();
  };

  if (!settings) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="glass-strong rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <Newspaper className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">News Automation</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <label className="glass rounded-xl p-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Automation</div>
              <div className="text-xs text-muted-foreground">Daily auto-import 5 posts</div>
            </div>
            <input
              type="checkbox"
              checked={!!settings.enabled}
              onChange={(e) => updateSettings({ enabled: e.target.checked })}
              className="h-5 w-5"
            />
          </label>
          <label className="glass rounded-xl p-4">
            <div className="text-sm font-medium mb-1">Daily count</div>
            <input
              type="number"
              min={1}
              max={20}
              defaultValue={settings.daily_count ?? 5}
              onBlur={(e) => updateSettings({ daily_count: Math.max(1, Math.min(20, Number(e.target.value) || 5)) })}
              className="w-full bg-transparent border border-white/15 rounded-lg px-3 py-1.5 text-sm"
            />
          </label>
          <div className="glass rounded-xl p-4 flex flex-col gap-2">
            <div className="text-xs text-muted-foreground">
              Last run: {settings.last_run_at ? new Date(settings.last_run_at).toLocaleString() : "never"}
            </div>
            <button
              onClick={runNow}
              disabled={running}
              className="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full gradient-bg text-white text-sm font-semibold disabled:opacity-60"
            >
              {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {running ? "Running…" : "Run now"}
            </button>
          </div>
        </div>
      </div>

      {/* Imported posts */}
      <div className="glass-strong rounded-2xl p-5">
        <h3 className="text-base font-semibold mb-3">Imported posts ({posts.length})</h3>
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {posts.length === 0 && <div className="text-sm text-muted-foreground">No imported posts yet.</div>}
          {posts.map((p) => (
            <div key={p.id} className="glass rounded-xl p-3 flex items-center gap-3">
              <img src={p.image_url} alt="" className="h-10 w-14 object-cover rounded-md border border-white/10" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{p.title}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {p.source_name || p.source} · {p.category} · {new Date(p.created_at).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => toggleFeatured(p)}
                title={p.featured ? "Unfeature" : "Feature"}
                className={`glass rounded-full p-2 ${p.featured ? "text-amber-400" : ""}`}
              >
                <Star className={`h-4 w-4 ${p.featured ? "fill-current" : ""}`} />
              </button>
              <button onClick={() => setEditing(p)} className="glass rounded-full p-2"><Edit3 className="h-4 w-4" /></button>
              <button onClick={() => deletePost(p.id)} className="glass rounded-full p-2 text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Logs */}
      <div className="glass-strong rounded-2xl p-5">
        <h3 className="text-base font-semibold mb-3">Recent runs</h3>
        <div className="space-y-1.5 text-xs font-mono">
          {logs.length === 0 && <div className="text-sm text-muted-foreground font-sans">No runs yet.</div>}
          {logs.map((l) => (
            <div key={l.id} className="glass rounded-lg px-3 py-2 flex items-center gap-3 flex-wrap">
              <span className="text-muted-foreground">{new Date(l.run_at).toLocaleString()}</span>
              <span className="text-emerald-300">inserted {l.inserted}</span>
              <span className="text-amber-300">skipped {l.skipped}</span>
              {Array.isArray(l.errors) && l.errors.length > 0 && (
                <span className="text-red-300">errors {l.errors.length}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {editing && <EditPostModal post={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function EditPostModal({ post, onClose, onSaved }: { post: any; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(post.title ?? "");
  const [body, setBody] = useState(post.body ?? "");
  const [category, setCategory] = useState(post.category ?? "electronics");
  const [imageUrl, setImageUrl] = useState(post.image_url ?? "");
  const [originalUrl, setOriginalUrl] = useState(post.original_url ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("quick_learn").update({
      title, body, category, image_url: imageUrl, original_url: originalUrl,
    }).eq("id", post.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl glass-strong rounded-2xl p-5 space-y-3">
        <h3 className="text-lg font-semibold">Edit imported post</h3>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-transparent border border-white/15 rounded-lg px-3 py-2 text-sm" placeholder="Title" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} className="w-full bg-transparent border border-white/15 rounded-lg px-3 py-2 text-sm" placeholder="Summary" />
        <div className="grid grid-cols-2 gap-3">
          <input value={category} onChange={(e) => setCategory(e.target.value)} className="bg-transparent border border-white/15 rounded-lg px-3 py-2 text-sm" placeholder="category" />
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="bg-transparent border border-white/15 rounded-lg px-3 py-2 text-sm" placeholder="Image URL" />
        </div>
        <input value={originalUrl} onChange={(e) => setOriginalUrl(e.target.value)} className="w-full bg-transparent border border-white/15 rounded-lg px-3 py-2 text-sm" placeholder="Original article URL" />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-full glass text-sm">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-full gradient-bg text-white text-sm font-semibold">{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
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
