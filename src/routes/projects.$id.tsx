import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { ProjectBody } from "./projects.new";
import { CodeBlock } from "@/components/CodeBlock";
import { toast } from "sonner";
import { Heart, Bookmark, MessageCircle, Eye, Trash2, Send, Pencil } from "lucide-react";

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
    const { data: p, error: pErr } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id).maybeSingle();
    if (pErr) console.error("project fetch", pErr);
    if (p) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("username, avatar_url, display_name")
        .eq("id", p.user_id).maybeSingle();
      (p as any).profiles = prof;
    }
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
  const blocks = (project.content_blocks as any[]) ?? [];
  const steps = (project.steps as any[]) ?? [];
  const components = (project.components as any[]) ?? [];

  return (
    <AppShell>
      <article className="max-w-3xl mx-auto space-y-6">
        {/* Hero */}
        {project.cover_image && (
          <div className="relative rounded-3xl overflow-hidden glow-soft">
            <img src={project.cover_image} alt={project.title} className="w-full aspect-video object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </div>
        )}
        <div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{project.title}</h1>
          {project.tagline && <p className="mt-3 text-lg md:text-xl text-muted-foreground">{project.tagline}</p>}
        </div>

        {/* Meta chips */}
        <div className="flex flex-wrap gap-2 text-xs">
          {project.difficulty && <span className="glass rounded-full px-3 py-1">⚙ {project.difficulty}</span>}
          {project.category && <span className="glass rounded-full px-3 py-1">📦 {project.category}</span>}
          {project.build_cost && <span className="glass rounded-full px-3 py-1">💰 {project.build_cost}</span>}
          {project.build_time && <span className="glass rounded-full px-3 py-1">⏱ {project.build_time}</span>}
          {(project.tags ?? []).map((t: string) => (
            <Link to="/search" key={t} search={{ q: t } as any} className="glass rounded-full px-3 py-1 hover:text-primary">#{t}</Link>
          ))}
        </div>

        {/* Author + actions */}
        <div className="flex items-center justify-between glass rounded-2xl p-3">
          <Link to="/profile/$username" params={{ username: project.profiles?.username ?? "" }} className="flex items-center gap-3">
            {project.profiles?.avatar_url ? (
              <img src={project.profiles.avatar_url} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-full gradient-bg grid place-items-center text-white font-bold">
                {project.profiles?.username?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-medium">{project.profiles?.display_name || project.profiles?.username}</div>
              <div className="text-xs text-muted-foreground">@{project.profiles?.username} · {new Date(project.published_at ?? project.created_at).toLocaleDateString()}</div>
            </div>
          </Link>
          <div className="flex items-center gap-1.5">
            <button onClick={toggleLike} className={`glass rounded-full px-3 py-2 flex items-center gap-1.5 transition ${liked ? "text-primary" : ""}`}>
              <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> <span className="text-sm">{likes}</span>
            </button>
            <button onClick={toggleBookmark} className={`glass rounded-full p-2 ${bookmarked ? "text-primary" : ""}`}>
              <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-current" : ""}`} />
            </button>
            {isOwner && (
              <Link to="/projects/new" search={{ id: project.id } as any} className="glass rounded-full p-2"><Pencil className="h-4 w-4" /></Link>
            )}
            {(isOwner || isAdmin) && (
              <button onClick={delProject} className="glass rounded-full p-2 text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="space-y-5">
          {(blocks.length > 0 || steps.length > 0 || components.length > 0) ? (
            <ProjectBody blocks={blocks} components={components} steps={steps} />
          ) : (
            <>
              {project.content && (
                <div className="glass-strong rounded-2xl p-6 whitespace-pre-wrap leading-relaxed">{project.content}</div>
              )}
              {project.code && <CodeBlock code={project.code} language="cpp" />}
            </>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground border-t border-white/10 pt-4">
          <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {project.views ?? 0} views</span>
          <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> {comments.length} comments</span>
          <span className="flex items-center gap-1"><Heart className="h-4 w-4" /> {likes} likes</span>
        </div>

        {/* Comments */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Comments</h2>
          <form onSubmit={addComment} className="flex gap-2">
            <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…"
              maxLength={500}
              className="flex-1 glass rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-primary" />
            <button className="gradient-bg text-white rounded-full px-4 py-2 glow-soft"><Send className="h-4 w-4" /></button>
          </form>
          {comments.map((c) => (
            <div key={c.id} className="glass rounded-2xl p-4 flex gap-3">
              {c.profiles?.avatar_url ? (
                <img src={c.profiles.avatar_url} className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="h-8 w-8 rounded-full gradient-bg grid place-items-center text-white text-sm font-bold flex-shrink-0">
                  {c.profiles?.username?.[0]?.toUpperCase()}
                </div>
              )}
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
