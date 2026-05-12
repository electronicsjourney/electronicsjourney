import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { toast } from "sonner";
import { Heart, Bookmark, MessageCircle, Eye, Trash2, Send } from "lucide-react";

export const Route = createFileRoute("/projects/$id")({ component: ProjectPage });

function ProjectPage() {
  const { id } = Route.useParams();
  const { user, isAdmin } = useAuth();
  const nav = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState<any[]>([]);
  const [comment, setComment] = useState("");

  const load = async () => {
    const { data: p } = await supabase
      .from("projects")
      .select("*, profiles!projects_user_id_fkey(username, avatar_url, display_name)")
      .eq("id", id).maybeSingle();
    setProject(p);
    if (p) {
      await supabase.from("projects").update({ views: (p.views ?? 0) + 1 }).eq("id", id);
      const { count } = await supabase.from("project_likes").select("*", { count: "exact", head: true }).eq("project_id", id);
      setLikes(count ?? 0);
      if (user) {
        const { data: l } = await supabase.from("project_likes").select().eq("project_id", id).eq("user_id", user.id).maybeSingle();
        setLiked(!!l);
        const { data: b } = await supabase.from("project_bookmarks").select().eq("project_id", id).eq("user_id", user.id).maybeSingle();
        setBookmarked(!!b);
      }
      const { data: c } = await supabase
        .from("project_comments")
        .select("*, profiles!project_comments_user_id_fkey(username, avatar_url)")
        .eq("project_id", id).order("created_at", { ascending: true });
      setComments(c ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id, user?.id]);

  const toggleLike = async () => {
    if (!user) return toast.error("Sign in first");
    if (liked) {
      await supabase.from("project_likes").delete().eq("project_id", id).eq("user_id", user.id);
      setLiked(false); setLikes((n) => n - 1);
    } else {
      await supabase.from("project_likes").insert({ project_id: id, user_id: user.id });
      setLiked(true); setLikes((n) => n + 1);
    }
  };

  const toggleBookmark = async () => {
    if (!user) return toast.error("Sign in first");
    if (bookmarked) {
      await supabase.from("project_bookmarks").delete().eq("project_id", id).eq("user_id", user.id);
      setBookmarked(false);
    } else {
      await supabase.from("project_bookmarks").insert({ project_id: id, user_id: user.id });
      setBookmarked(true);
    }
  };

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Sign in first");
    if (!comment.trim()) return;
    const { error } = await supabase.from("project_comments").insert({ project_id: id, user_id: user.id, content: comment.trim() });
    if (error) return toast.error(error.message);
    setComment("");
    load();
  };

  const delProject = async () => {
    if (!confirm("Delete this project?")) return;
    await supabase.from("projects").delete().eq("id", id);
    toast.success("Deleted");
    nav({ to: "/" });
  };

  if (loading) return <AppShell><div className="glass rounded-2xl aspect-video animate-pulse" /></AppShell>;
  if (!project) return <AppShell><div className="text-center py-20 text-muted-foreground">Project not found</div></AppShell>;

  const isOwner = user?.id === project.user_id;

  return (
    <AppShell>
      <article className="max-w-3xl mx-auto space-y-6">
        {project.cover_image && (
          <img src={project.cover_image} alt={project.title} className="w-full aspect-video object-cover rounded-2xl" />
        )}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">{project.title}</h1>
          {project.description && <p className="mt-2 text-lg text-muted-foreground">{project.description}</p>}
        </div>
        <div className="flex items-center justify-between glass rounded-2xl p-3">
          <Link to="/profile/$username" params={{ username: project.profiles?.username ?? "" }} className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full gradient-bg grid place-items-center text-white font-bold">
              {project.profiles?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="font-medium">@{project.profiles?.username}</div>
              <div className="text-xs text-muted-foreground">{new Date(project.created_at).toLocaleDateString()}</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={toggleLike} className={`glass rounded-full px-4 py-2 flex items-center gap-2 transition ${liked ? "text-primary" : ""}`}>
              <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> {likes}
            </button>
            <button onClick={toggleBookmark} className={`glass rounded-full p-2 ${bookmarked ? "text-primary" : ""}`}>
              <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-current" : ""}`} />
            </button>
            {(isOwner || isAdmin) && (
              <button onClick={delProject} className="glass rounded-full p-2 text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {project.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {project.tags.map((t: string) => (
              <span key={t} className="glass rounded-full px-3 py-1 text-xs">#{t}</span>
            ))}
          </div>
        )}

        {project.content && (
          <div className="glass-strong rounded-2xl p-6 whitespace-pre-wrap">{project.content}</div>
        )}

        {project.code && (
          <div className="glass-strong rounded-2xl overflow-hidden">
            <div className="px-4 py-2 border-b text-xs text-muted-foreground">Code</div>
            <pre className="p-4 overflow-x-auto text-sm font-mono"><code>{project.code}</code></pre>
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {project.views ?? 0} views</span>
          <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> {comments.length} comments</span>
        </div>

        {/* Comments */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Comments</h2>
          <form onSubmit={addComment} className="flex gap-2">
            <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…"
              className="flex-1 glass rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-primary" />
            <button className="gradient-bg text-white rounded-full px-4 py-2 glow-soft"><Send className="h-4 w-4" /></button>
          </form>
          {comments.map((c) => (
            <div key={c.id} className="glass rounded-2xl p-4 flex gap-3">
              <div className="h-8 w-8 rounded-full gradient-bg grid place-items-center text-white text-sm font-bold flex-shrink-0">
                {c.profiles?.username?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">@{c.profiles?.username}</div>
                <div className="text-sm">{c.content}</div>
              </div>
            </div>
          ))}
          {comments.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Be the first to comment</p>}
        </section>
      </article>
    </AppShell>
  );
}
