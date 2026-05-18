import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { Heart, Bookmark, Share2, Plus, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/quick-learn")({ component: QuickLearn });

function QuickLearn() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("electronics");

  const load = async () => {
    const { data } = await supabase
      .from("quick_learn")
      .select("*")
      .order("created_at", { ascending: false }).limit(50);
    const withProfiles = await Promise.all((data ?? []).map(async (p: any) => {
      const { data: pr } = await supabase.from("profiles").select("username, avatar_url").eq("id", p.author_id).maybeSingle();
      return { ...p, profiles: pr };
    }));
    setPosts(withProfiles);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Sign in first");
    const { error } = await supabase.from("quick_learn").insert({ author_id: user.id, title, body, category });
    if (error) return toast.error(error.message);
    setTitle(""); setBody(""); setCreating(false);
    toast.success("Posted!");
    load();
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Quick Learn</h1>
        {user && (
          <button onClick={() => setCreating(!creating)} className="gradient-bg text-white rounded-full p-2 glow-soft">
            {creating ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          </button>
        )}
      </div>

      {creating && (
        <form onSubmit={create} className="glass-strong rounded-2xl p-4 mb-6 space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required
            className="w-full glass rounded-xl px-3 py-2 outline-none" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share a tip, news, or concept…" rows={4} required
            className="w-full glass rounded-xl px-3 py-2 outline-none resize-none" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="glass rounded-xl px-3 py-2 outline-none">
            <option value="electronics">Electronics</option>
            <option value="robotics">Robotics</option>
            <option value="ai-hardware">AI Hardware</option>
            <option value="beginner-tips">Beginner Tips</option>
            <option value="cool-projects">Cool Projects</option>
          </select>
          <button className="w-full gradient-bg text-white rounded-xl py-2 font-medium">Post</button>
        </form>
      )}

      <div className="snap-y snap-mandatory overflow-y-auto h-[calc(100vh-12rem)] scrollbar-hide space-y-4 pr-1">
        {posts.length === 0 && <div className="glass rounded-2xl p-12 text-center text-muted-foreground">No posts yet</div>}
        {posts.map((p) => <Card key={p.id} post={p} userId={user?.id} />)}
      </div>
    </AppShell>
  );
}

function Card({ post, userId }: { post: any; userId?: string }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likes, setLikes] = useState(0);

  useEffect(() => {
    (async () => {
      const { count } = await supabase.from("quick_learn_likes").select("*", { count: "exact", head: true }).eq("post_id", post.id);
      setLikes(count ?? 0);
      if (userId) {
        const { data: l } = await supabase.from("quick_learn_likes").select().eq("post_id", post.id).eq("user_id", userId).maybeSingle();
        setLiked(!!l);
        const { data: s } = await supabase.from("quick_learn_saves").select().eq("post_id", post.id).eq("user_id", userId).maybeSingle();
        setSaved(!!s);
      }
    })();
  }, [post.id, userId]);

  const toggleLike = async () => {
    if (!userId) return toast.error("Sign in first");
    if (liked) { await supabase.from("quick_learn_likes").delete().eq("post_id", post.id).eq("user_id", userId); setLiked(false); setLikes((n)=>n-1); }
    else { await supabase.from("quick_learn_likes").insert({ post_id: post.id, user_id: userId }); setLiked(true); setLikes((n)=>n+1); }
  };
  const toggleSave = async () => {
    if (!userId) return toast.error("Sign in first");
    if (saved) { await supabase.from("quick_learn_saves").delete().eq("post_id", post.id).eq("user_id", userId); setSaved(false); }
    else { await supabase.from("quick_learn_saves").insert({ post_id: post.id, user_id: userId }); setSaved(true); }
  };
  const share = async () => {
    if (navigator.share) await navigator.share({ title: post.title, text: post.body });
    else { navigator.clipboard.writeText(post.title + "\n\n" + post.body); toast.success("Copied to clipboard"); }
  };

  return (
    <article className="snap-start glass-strong rounded-3xl p-6 min-h-[60vh] flex flex-col justify-between">
      <div>
        <div className="text-xs gradient-text font-bold mb-2 uppercase tracking-wider">{post.category}</div>
        <h2 className="text-2xl font-bold mb-3">{post.title}</h2>
        <p className="text-muted-foreground whitespace-pre-wrap">{post.body}</p>
      </div>
      <div className="flex items-center justify-between mt-6 pt-4 border-t">
        <div className="text-sm text-muted-foreground">@{post.profiles?.username ?? "anon"}</div>
        <div className="flex items-center gap-1">
          <button onClick={toggleLike} className={`glass rounded-full px-3 py-1.5 flex items-center gap-1 text-sm ${liked ? "text-primary" : ""}`}>
            <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> {likes}
          </button>
          <button onClick={toggleSave} className={`glass rounded-full p-2 ${saved ? "text-primary" : ""}`}><Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} /></button>
          <button onClick={share} className="glass rounded-full p-2"><Share2 className="h-4 w-4" /></button>
        </div>
      </div>
    </article>
  );
}
