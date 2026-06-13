import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { ProjectCard } from "@/components/ProjectCard";
import { toast } from "sonner";
import { Camera, Pencil, FileText, Zap, FolderOpen } from "lucide-react";

export const Route = createFileRoute("/profile/$username")({ component: ProfilePage });

function ProfilePage() {
  const { username } = Route.useParams();
  const { user, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [quickLearns, setQuickLearns] = useState<any[]>([]);
  const [tab, setTab] = useState<"projects" | "quicklearns" | "drafts">("projects");
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [usernameEdit, setUsernameEdit] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data: p } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
    setProfile(p);
    if (!p) return;
    setBio(p.bio ?? ""); setDisplayName(p.display_name ?? ""); setUsernameEdit(p.username ?? "");

    const { data: pj } = await supabase
      .from("projects").select("*").eq("user_id", p.id).eq("status", "published").order("published_at", { ascending: false });
    setProjects(pj ?? []);

    const { data: ql } = await supabase
      .from("quick_learn").select("*").eq("author_id", p.id).order("published_at", { ascending: false });
    setQuickLearns(ql ?? []);

    if (user?.id === p.id) {
      const { data: dr } = await supabase
        .from("projects").select("*").eq("user_id", p.id).eq("status", "draft").order("updated_at", { ascending: false });
      setDrafts(dr ?? []);
    }

    const [{ count: fcount }, { count: gcount }] = await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", p.id),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", p.id),
    ]);
    setFollowers(fcount ?? 0); setFollowing(gcount ?? 0);
    if (user && user.id !== p.id) {
      const { data: f } = await supabase.from("follows").select().eq("follower_id", user.id).eq("following_id", p.id).maybeSingle();
      setIsFollowing(!!f);
    }
  };

  useEffect(() => { load(); }, [username, user?.id]);

  const toggleFollow = async () => {
    if (!user) return toast.error("Sign in first");
    if (!profile) return;
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profile.id);
      setIsFollowing(false); setFollowers((n) => n - 1);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: profile.id });
      setIsFollowing(true); setFollowers((n) => n + 1);
    }
  };

  const saveProfile = async () => {
    const newUsername = usernameEdit.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (newUsername.length < 3) return toast.error("Username must be at least 3 characters (a-z, 0-9, _)");
    setSaving(true);
    try {
      if (newUsername !== profile.username) {
        const { data: existing } = await supabase.from("profiles").select("id").eq("username", newUsername).maybeSingle();
        if (existing && existing.id !== profile.id) {
          setSaving(false);
          return toast.error("Username already taken");
        }
      }
      const { error } = await supabase.from("profiles")
        .update({ bio, display_name: displayName, username: newUsername }).eq("id", profile.id);
      if (error) throw error;
      toast.success("Profile updated");
      setEditing(false);
      await refreshProfile();
      if (newUsername !== profile.username) {
        window.location.href = `/profile/${newUsername}`;
        return;
      }
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const onAvatarPick = async (file: File | null) => {
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Max 5MB");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatars/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("media").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const url = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
      const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      if (error) throw error;
      toast.success("Avatar updated");
      await refreshProfile();
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  if (!profile) return <AppShell><div className="text-center py-20 text-muted-foreground">Loading…</div></AppShell>;
  const isMe = user?.id === profile.id;

  return (
    <AppShell>
      <div className="glass-strong rounded-3xl p-6 md:p-8 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-40" style={{ background: "var(--gradient-glow)" }} />
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="relative group">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.username}
                className="h-28 w-28 rounded-2xl object-cover glow-soft" />
            ) : (
              <div className="h-28 w-28 rounded-2xl gradient-bg grid place-items-center text-white text-4xl font-bold glow-soft">
                {profile.username[0]?.toUpperCase()}
              </div>
            )}
            {isMe && (
              <>
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition grid place-items-center text-white">
                  <Camera className="h-6 w-6" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => onAvatarPick(e.target.files?.[0] ?? null)} />
              </>
            )}
          </div>
          <div className="flex-1">
            {editing ? (
              <div className="space-y-2">
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name"
                  maxLength={60}
                  className="w-full glass rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary" />
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" rows={2} maxLength={300}
                  className="w-full glass rounded-xl px-3 py-2 outline-none resize-none focus:ring-2 focus:ring-primary" />
                <div className="flex gap-2">
                  <button onClick={saveProfile} className="gradient-bg text-white rounded-full px-4 py-1.5 text-sm glow-soft">Save</button>
                  <button onClick={() => setEditing(false)} className="glass rounded-full px-4 py-1.5 text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl md:text-3xl font-bold">{profile.display_name || profile.username}</h1>
                <p className="text-muted-foreground">@{profile.username}</p>
                {profile.bio && <p className="mt-2 text-sm md:text-base">{profile.bio}</p>}
              </>
            )}
            <div className="flex items-center gap-6 mt-4 text-sm">
              <span><b>{projects.length}</b> <span className="text-muted-foreground">projects</span></span>
              <span><b>{followers}</b> <span className="text-muted-foreground">followers</span></span>
              <span><b>{following}</b> <span className="text-muted-foreground">following</span></span>
              {profile.streak > 0 && <span>🔥 <b>{profile.streak}</b> day streak</span>}
            </div>
          </div>
          <div>
            {isMe ? (
              !editing && (
                <button onClick={() => setEditing(true)} className="glass rounded-full px-4 py-2 text-sm flex items-center gap-2">
                  <Pencil className="h-4 w-4" /> Edit profile
                </button>
              )
            ) : user ? (
              <button onClick={toggleFollow} className={`rounded-full px-6 py-2 text-sm font-medium ${isFollowing ? "glass" : "gradient-bg text-white glow-soft"}`}>
                {isFollowing ? "Following" : "Follow"}
              </button>
            ) : (
              <Link to="/login" className="rounded-full px-6 py-2 text-sm font-medium gradient-bg text-white">Sign in to follow</Link>
            )}
          </div>
        </div>
      </div>

      {isMe && (
        <div className="glass rounded-full p-1 inline-flex mb-4">
          <button onClick={() => setTab("projects")}
            className={`px-4 py-1.5 rounded-full text-sm transition ${tab === "projects" ? "gradient-bg text-white" : "text-muted-foreground"}`}>
            Projects ({projects.length})
          </button>
          <button onClick={() => setTab("drafts")}
            className={`px-4 py-1.5 rounded-full text-sm transition flex items-center gap-1.5 ${tab === "drafts" ? "gradient-bg text-white" : "text-muted-foreground"}`}>
            <FileText className="h-3.5 w-3.5" /> Drafts ({drafts.length})
          </button>
        </div>
      )}

      {tab === "projects" ? (
        projects.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-muted-foreground">No projects yet</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        )
      ) : drafts.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-muted-foreground">No drafts</div>
      ) : (
        <div className="space-y-3">
          {drafts.map((d) => (
            <Link key={d.id} to="/projects/new" search={{ id: d.id } as any}
              className="glass rounded-2xl p-4 flex items-center gap-4 hover:glow-soft transition block">
              {d.cover_image && <img src={d.cover_image} className="h-16 w-24 object-cover rounded-lg" />}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{d.title || "Untitled draft"}</div>
                <div className="text-xs text-muted-foreground">Updated {new Date(d.updated_at).toLocaleString()}</div>
              </div>
              <span className="text-xs glass rounded-full px-3 py-1">Draft</span>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
