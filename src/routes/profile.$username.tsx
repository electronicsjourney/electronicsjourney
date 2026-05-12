import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { ProjectCard } from "@/components/ProjectCard";
import { toast } from "sonner";

export const Route = createFileRoute("/profile/$username")({ component: ProfilePage });

function ProfilePage() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [displayName, setDisplayName] = useState("");

  const load = async () => {
    const { data: p } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
    setProfile(p);
    if (!p) return;
    setBio(p.bio ?? ""); setDisplayName(p.display_name ?? "");
    const { data: pj } = await supabase
      .from("projects").select("*").eq("user_id", p.id).order("created_at", { ascending: false });
    setProjects(pj ?? []);
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
    const { error } = await supabase.from("profiles").update({ bio, display_name: displayName }).eq("id", profile.id);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    setEditing(false);
    load();
  };

  if (!profile) return <AppShell><div className="text-center py-20 text-muted-foreground">User not found</div></AppShell>;
  const isMe = user?.id === profile.id;

  return (
    <AppShell>
      <div className="glass-strong rounded-3xl p-6 md:p-8 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="h-24 w-24 rounded-2xl gradient-bg grid place-items-center text-white text-3xl font-bold glow-soft">
            {profile.username[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            {editing ? (
              <div className="space-y-2">
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name"
                  className="w-full glass rounded-xl px-3 py-2 outline-none" />
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" rows={2}
                  className="w-full glass rounded-xl px-3 py-2 outline-none resize-none" />
                <div className="flex gap-2">
                  <button onClick={saveProfile} className="gradient-bg text-white rounded-full px-4 py-1.5 text-sm">Save</button>
                  <button onClick={() => setEditing(false)} className="glass rounded-full px-4 py-1.5 text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold">{profile.display_name || profile.username}</h1>
                <p className="text-muted-foreground">@{profile.username}</p>
                {profile.bio && <p className="mt-2">{profile.bio}</p>}
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
              !editing && <button onClick={() => setEditing(true)} className="glass rounded-full px-4 py-2 text-sm">Edit profile</button>
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

      <h2 className="text-xl font-bold mb-3">Projects</h2>
      {projects.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-muted-foreground">No projects yet</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}
    </AppShell>
  );
}
