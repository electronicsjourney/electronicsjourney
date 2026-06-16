import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Bookmark, Share2, Plus, X, Sparkles, ExternalLink, Trash2, Upload,
  ArrowLeft, MessageCircle, TrendingUp, Clock, Flame, Layers, Send,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/quick-learn")({ component: QuickLearn });

type Profile = { id: string; username: string; display_name: string | null; avatar_url: string | null };
type Post = {
  id: string;
  title: string;
  subtitle: string | null;
  body: string;
  category: string;
  image_url: string | null;
  source: string | null;
  author_id: string | null;
  tags: string[] | null;
  published_at: string;
  created_at: string;
  auto_generated?: boolean | null;
  source_name?: string | null;
  source_url?: string | null;
  original_url?: string | null;
  image_type?: string | null;
  image_source_name?: string | null;
  featured?: boolean | null;
  // enriched
  author?: Profile | null;
  likes?: number;
  comments?: number;
};

const CATEGORIES = [
  "arduino", "esp32", "raspberry-pi", "robotics", "ai-hardware",
  "semiconductor", "engineering", "electronics",
  "iot", "circuit-tips", "components", "beginner", "advanced",
];

type FilterKey = "all" | "recent" | "popular" | "liked" | string;
const FILTERS: { key: FilterKey; label: string; icon: any }[] = [
  { key: "all", label: "All", icon: Layers },
  { key: "popular", label: "Most Popular", icon: TrendingUp },
  { key: "recent", label: "Recent", icon: Clock },
  { key: "liked", label: "Most Liked", icon: Flame },
];

/* ====================== PAGE ====================== */

function QuickLearn() {
  const { user, isAdmin } = useAuth();
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [commentsFor, setCommentsFor] = useState<Post | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("quick_learn")
      .select("*")
      .order("published_at", { ascending: false })
      .limit(200);
    const list = (data ?? []) as Post[];

    // Enrich authors + counts in parallel
    const authorIds = Array.from(new Set(list.map((p) => p.author_id).filter(Boolean) as string[]));
    const ids = list.map((p) => p.id);
    const [authorsRes, likesRes, commentsRes] = await Promise.all([
      authorIds.length
        ? supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", authorIds)
        : Promise.resolve({ data: [] as Profile[] } as any),
      ids.length
        ? supabase.from("quick_learn_likes").select("post_id").in("post_id", ids)
        : Promise.resolve({ data: [] as { post_id: string }[] } as any),
      Promise.resolve({ data: [] as { post_id: string }[] } as any),
    ]);
    const authorMap = new Map<string, Profile>();
    (authorsRes.data ?? []).forEach((p: Profile) => authorMap.set(p.id, p));
    const likeCount = new Map<string, number>();
    (likesRes.data ?? []).forEach((r: any) => likeCount.set(r.post_id, (likeCount.get(r.post_id) ?? 0) + 1));

    const enriched = list.map((p) => ({
      ...p,
      author: p.author_id ? authorMap.get(p.author_id) ?? null : null,
      likes: likeCount.get(p.id) ?? 0,
      comments: 0,
    }));
    // Featured first, then by published_at desc (which is already the SQL order)
    enriched.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
    setAllPosts(enriched);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* derived feed */
  const feed = useMemo(() => {
    let f = [...allPosts];
    if (filter === "recent") f.sort((a, b) => +new Date(b.published_at) - +new Date(a.published_at));
    else if (filter === "popular" || filter === "liked")
      f.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
    else if (filter !== "all") {
      const sub = allPosts.filter(
        (p) => p.category === filter || (p.tags ?? []).includes(filter),
      );
      // never empty — fall back to all
      f = sub.length ? sub : [...allPosts];
    }
    return f;
  }, [allPosts, filter]);

  const trending = useMemo(
    () => [...allPosts].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0)).slice(0, 5),
    [allPosts],
  );

  /* scroll snap tracking */
  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll<HTMLElement>("[data-card]"));
    if (!items.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const idx = Number((visible.target as HTMLElement).dataset.idx ?? 0);
          setActiveIdx(idx);
        }
      },
      { root: el, threshold: [0.55, 0.8] },
    );
    items.forEach((i) => obs.observe(i));
    return () => obs.disconnect();
  }, [feed]);

  // reset scroll when filter changes
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    setActiveIdx(0);
  }, [filter]);

  return (
    <div className="fixed inset-0 bg-[#05060a] text-white overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-[#6366f1]/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-[#a855f7]/20 blur-[140px]" />
      </div>

      {/* Top bar */}
      <header className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-3 md:px-6 h-14 md:h-16 border-b border-white/5 bg-black/30 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Link to="/" className="h-9 w-9 grid place-items-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2 px-3 h-9 rounded-full bg-white/5 border border-white/10">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            <span className="text-sm font-bold tracking-wider">QUICK LEARN</span>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setEditorOpen(true)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-sm font-semibold shadow-[0_0_25px_rgba(99,102,241,0.45)] hover:shadow-[0_0_35px_rgba(99,102,241,0.65)] transition"
          >
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Create</span>
          </button>
        )}
      </header>

      {/* 3-column layout */}
      <div className="absolute inset-0 pt-14 md:pt-16 flex">
        {/* LEFT — filters (desktop) */}
        <aside className="hidden md:flex w-64 lg:w-72 shrink-0 border-r border-white/5 bg-black/20 backdrop-blur-md flex-col p-4 gap-1 overflow-y-auto">
          <div className="text-[11px] uppercase tracking-[0.15em] text-white/40 font-semibold px-2 mb-2">Discover</div>
          {FILTERS.map((f) => (
            <FilterButton key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)} icon={<f.icon className="h-4 w-4" />} label={f.label} />
          ))}
          <div className="text-[11px] uppercase tracking-[0.15em] text-white/40 font-semibold px-2 mt-5 mb-2">Categories</div>
          {CATEGORIES.map((c) => (
            <FilterButton key={c} active={filter === c} onClick={() => setFilter(c)} label={c.replace("-", " ")} />
          ))}
        </aside>

        {/* MOBILE filter chips */}
        <div className="md:hidden absolute top-14 inset-x-0 z-20 bg-black/40 backdrop-blur-md border-b border-white/5">
          <div className="flex gap-2 overflow-x-auto px-3 py-2 scrollbar-hide">
            {[...FILTERS, ...CATEGORIES.map((c) => ({ key: c, label: c.replace("-", " "), icon: null as any }))].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`shrink-0 px-3.5 h-8 rounded-full text-xs font-semibold capitalize border transition ${
                  filter === f.key
                    ? "bg-gradient-to-r from-indigo-500 to-purple-500 border-transparent text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* CENTER — feed */}
        <main className="flex-1 min-w-0 relative">
          <div
            ref={scrollerRef}
            className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide pt-12 md:pt-0"
            style={{ scrollBehavior: "smooth" }}
          >
            {loading ? (
              <FeedSkeleton />
            ) : feed.length === 0 ? (
              <EmptyHint canCreate={isAdmin} onCreate={() => isAdmin && setEditorOpen(true)} />
            ) : (
              feed.map((post, i) => (
                <section
                  key={post.id}
                  data-card
                  data-idx={i}
                  className="snap-start h-full w-full flex items-center justify-center px-3 md:px-8 py-4 md:py-6"
                >
                  <PostCard
                    post={post}
                    userId={user?.id}
                    canDelete={isAdmin || user?.id === post.author_id}
                    onDeleted={load}
                    onOpenComments={() => setCommentsFor(post)}
                  />
                </section>
              ))
            )}
          </div>

          {/* progress rail */}
          {feed.length > 0 && (
            <div className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 flex-col gap-1.5 z-10">
              {feed.slice(0, Math.min(feed.length, 14)).map((_, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all ${i === activeIdx ? "h-6 bg-white" : "h-1.5 bg-white/25"}`}
                />
              ))}
            </div>
          )}
        </main>

        {/* RIGHT — trending */}
        <aside className="hidden lg:flex w-80 shrink-0 border-l border-white/5 bg-black/20 backdrop-blur-md flex-col p-5 gap-4 overflow-y-auto">
          <div>
            <div className="text-[11px] uppercase tracking-[0.15em] text-white/40 font-semibold mb-3">Now Reading</div>
            {feed[activeIdx]?.author ? (
              <CreatorMini p={feed[activeIdx].author!} />
            ) : (
              <div className="text-sm text-white/40">—</div>
            )}
          </div>
          <div className="h-px bg-white/5" />
          <div>
            <div className="text-[11px] uppercase tracking-[0.15em] text-white/40 font-semibold mb-3 flex items-center gap-1.5">
              <Flame className="h-3 w-3 text-orange-400" /> Trending Now
            </div>
            <div className="space-y-2">
              {trending.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => {
                    const idx = feed.findIndex((x) => x.id === p.id);
                    if (idx >= 0) {
                      const el = scrollerRef.current?.querySelector<HTMLElement>(`[data-idx="${idx}"]`);
                      el?.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  className="w-full text-left flex gap-3 p-2 -mx-2 rounded-xl hover:bg-white/5 transition"
                >
                  <div className="text-lg font-bold text-white/30 w-5">{i + 1}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold line-clamp-2">{p.title}</div>
                    <div className="text-[11px] text-white/40 mt-0.5 flex items-center gap-2">
                      <span className="capitalize">{p.category}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{p.likes ?? 0}</span>
                    </div>
                  </div>
                </button>
              ))}
              {trending.length === 0 && <div className="text-xs text-white/40">No posts yet</div>}
            </div>
          </div>
        </aside>
      </div>

      {/* Editor */}
      <AnimatePresence>
        {editorOpen && user && isAdmin && (
          <Editor
            userId={user.id}
            onClose={() => setEditorOpen(false)}
            onSaved={() => { setEditorOpen(false); load(); }}
          />
        )}
      </AnimatePresence>

      {/* Comments */}
      <AnimatePresence>
        {commentsFor && (
          <CommentsPanel post={commentsFor} userId={user?.id} onClose={() => setCommentsFor(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ====================== FILTER BTN ====================== */

function FilterButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon?: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 h-9 rounded-xl text-sm font-medium capitalize transition ${
        active
          ? "bg-gradient-to-r from-indigo-500/30 to-purple-500/20 border border-indigo-400/30 text-white shadow-[0_0_20px_rgba(99,102,241,0.25)]"
          : "text-white/65 hover:text-white hover:bg-white/5 border border-transparent"
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

/* ====================== CARD ====================== */

function PostCard({ post, userId, canDelete, onDeleted, onOpenComments }: {
  post: Post; userId?: string; canDelete: boolean; onDeleted: () => void; onOpenComments: () => void;
}) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likes, setLikes] = useState(post.likes ?? 0);

  useEffect(() => { setLikes(post.likes ?? 0); }, [post.likes]);

  useEffect(() => {
    let alive = true;
    if (!userId) { setLiked(false); setSaved(false); return; }
    (async () => {
      const [l, s] = await Promise.all([
        supabase.from("quick_learn_likes").select().eq("post_id", post.id).eq("user_id", userId).maybeSingle(),
        supabase.from("quick_learn_saves").select().eq("post_id", post.id).eq("user_id", userId).maybeSingle(),
      ]);
      if (!alive) return;
      setLiked(!!l.data); setSaved(!!s.data);
    })();
    return () => { alive = false; };
  }, [post.id, userId]);

  const toggleLike = async () => {
    if (!userId) return toast.error("Sign in to like");
    if (liked) {
      setLiked(false); setLikes((n) => n - 1);
      await supabase.from("quick_learn_likes").delete().eq("post_id", post.id).eq("user_id", userId);
    } else {
      setLiked(true); setLikes((n) => n + 1);
      await supabase.from("quick_learn_likes").insert({ post_id: post.id, user_id: userId });
    }
  };
  const toggleSave = async () => {
    if (!userId) return toast.error("Sign in to save");
    if (saved) {
      setSaved(false);
      await supabase.from("quick_learn_saves").delete().eq("post_id", post.id).eq("user_id", userId);
    } else {
      setSaved(true);
      await supabase.from("quick_learn_saves").insert({ post_id: post.id, user_id: userId });
    }
  };
  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: post.title, text: post.subtitle ?? post.body.slice(0, 120), url }); } catch {}
    } else {
      navigator.clipboard.writeText(`${post.title}\n\n${url}`);
      toast.success("Link copied");
    }
  };
  const remove = async () => {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("quick_learn").delete().eq("id", post.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    onDeleted();
  };

  return (
    <article className="relative w-full max-w-2xl h-full max-h-[calc(100dvh-7rem)] md:max-h-[calc(100dvh-8rem)] rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] backdrop-blur-xl shadow-[0_30px_120px_-30px_rgba(99,102,241,0.5)] flex flex-col">
      {/* Image */}
      <div className="relative w-full shrink-0 overflow-hidden bg-gradient-to-br from-indigo-900/40 to-purple-900/40 h-[32vh] min-h-[180px] max-h-[300px] sm:h-[34vh] sm:max-h-[340px] md:h-[38vh] md:max-h-[380px] lg:h-[40vh] lg:max-h-[420px]">
        {post.image_url ? (
          <img src={post.image_url} alt={post.title} loading="lazy" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="h-full w-full grid place-items-center"><Sparkles className="h-14 w-14 text-white/20" /></div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />
        <span className="absolute top-3 left-3 rounded-full bg-cyan-400/20 backdrop-blur-md border border-cyan-300/30 text-cyan-200 text-[10px] font-bold uppercase tracking-[0.15em] px-2.5 py-1">
          {post.category}
        </span>
        {post.auto_generated && (
          <span className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400/20 backdrop-blur-md border border-amber-300/30 text-amber-100 text-[10px] font-bold uppercase tracking-[0.15em] px-2.5 py-1">
            News · {post.source_name || post.source || "Source"}
          </span>
        )}
        {post.featured && (
          <span className="absolute bottom-3 left-3 rounded-full bg-fuchsia-500/30 backdrop-blur-md border border-fuchsia-300/40 text-fuchsia-100 text-[10px] font-bold uppercase tracking-[0.15em] px-2.5 py-1">
            ★ Featured
          </span>
        )}
        {canDelete && (
          <button onClick={remove} className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full bg-red-500/20 backdrop-blur-md border border-red-400/30 hover:bg-red-500/40 transition">
            <Trash2 className="h-4 w-4 text-red-200" />
          </button>
        )}
      </div>

      {/* Body — designed to fit without scrolling */}
      <div className="flex-1 min-h-0 overflow-hidden px-5 md:px-8 py-4 md:py-5 flex flex-col">
        <h1 className="text-lg md:text-2xl font-extrabold leading-[1.2] tracking-tight bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent line-clamp-2">
          {post.title}
        </h1>
        {post.subtitle && (
          <p className="mt-1.5 text-xs md:text-sm text-white/70 leading-snug line-clamp-1">{post.subtitle}</p>
        )}
        <p className="mt-3 text-[14px] md:text-[15px] leading-[1.55] text-white/85 line-clamp-6">
          {post.body}
        </p>

        {/* Source attribution + Read Original (always visible for auto news) */}
        {post.auto_generated ? (
          <div className="mt-auto pt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-white/55">
              Source: <span className="text-white/80 font-medium">{post.source_name || post.source || "Original publisher"}</span>
              {post.image_type === "fallback" && post.image_source_name && (
                <span className="ml-2 text-white/40">· Image: {post.image_source_name}</span>
              )}
            </span>
            {post.original_url && (
              <a
                href={post.original_url}
                target="_blank"
                rel="noreferrer nofollow"
                className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-gradient-to-r from-amber-400 to-rose-500 text-black text-xs font-bold shadow-[0_0_20px_rgba(251,191,36,0.35)] hover:brightness-110 transition"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Read Original Article
              </a>
            )}
          </div>
        ) : post.source ? (
          <a href={post.source} target="_blank" rel="noreferrer" className="mt-auto pt-3 inline-flex items-center gap-1.5 text-xs text-cyan-300 hover:text-cyan-200">
            <ExternalLink className="h-3.5 w-3.5" /> Source
          </a>
        ) : null}
      </div>

      {/* Author + actions */}
      <div className="shrink-0 border-t border-white/10 bg-black/40 backdrop-blur-xl px-4 md:px-6 py-3 flex items-center justify-between gap-3">
        {post.author ? (
          <Link to="/profile/$username" params={{ username: post.author.username }} className="flex items-center gap-2.5 min-w-0">
            {post.author.avatar_url ? (
              <img src={post.author.avatar_url} className="h-9 w-9 rounded-full object-cover border border-white/15" />
            ) : (
              <div className="h-9 w-9 rounded-full grid place-items-center bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-bold">
                {post.author.username[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{post.author.display_name || post.author.username}</div>
              <div className="text-[11px] text-white/50 truncate">@{post.author.username} · {timeAgo(post.published_at)}</div>
            </div>
          </Link>
        ) : post.auto_generated ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-full grid place-items-center bg-gradient-to-br from-amber-400 to-rose-500 text-sm font-bold">
              {(post.source_name || "N")[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{post.source_name || "News"}</div>
              <div className="text-[11px] text-white/50 truncate">Electronics Journey News · {timeAgo(post.published_at)}</div>
            </div>
          </div>
        ) : <div />}

        <div className="flex items-center gap-1.5">
          <ActionBtn active={liked} onClick={toggleLike} icon={<Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />} label={String(likes)} />
          <ActionBtn onClick={onOpenComments} icon={<MessageCircle className="h-4 w-4" />} />
          <ActionBtn active={saved} onClick={toggleSave} icon={<Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />} />
          <ActionBtn onClick={share} icon={<Share2 className="h-4 w-4" />} />
        </div>
      </div>
    </article>
  );
}

function ActionBtn({ active, onClick, icon, label }: { active?: boolean; onClick: () => void; icon: React.ReactNode; label?: string }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm border transition ${
        active ? "bg-indigo-500/25 border-indigo-400/40 text-indigo-200" : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
      }`}>
      {icon}{label && <span className="text-xs font-medium">{label}</span>}
    </button>
  );
}

function CreatorMini({ p }: { p: Profile }) {
  return (
    <Link to="/profile/$username" params={{ username: p.username }} className="flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-white/5 transition">
      {p.avatar_url ? (
        <img src={p.avatar_url} className="h-12 w-12 rounded-full object-cover border border-white/15" />
      ) : (
        <div className="h-12 w-12 rounded-full grid place-items-center bg-gradient-to-br from-indigo-500 to-purple-500 font-bold">
          {p.username[0]?.toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <div className="font-semibold truncate">{p.display_name || p.username}</div>
        <div className="text-xs text-white/50 truncate">@{p.username}</div>
      </div>
    </Link>
  );
}

function FeedSkeleton() {
  return (
    <div className="h-full w-full grid place-items-center px-3 md:px-8">
      <div className="w-full max-w-2xl h-[80vh] rounded-3xl overflow-hidden border border-white/10 bg-white/[0.02] animate-pulse">
        <div className="aspect-[16/10] bg-white/5" />
        <div className="p-6 space-y-3">
          <div className="h-7 w-2/3 bg-white/10 rounded" />
          <div className="h-4 w-1/2 bg-white/5 rounded" />
          <div className="h-3 w-full bg-white/5 rounded mt-6" />
          <div className="h-3 w-11/12 bg-white/5 rounded" />
          <div className="h-3 w-10/12 bg-white/5 rounded" />
        </div>
      </div>
    </div>
  );
}

function EmptyHint({ canCreate, onCreate }: { canCreate: boolean; onCreate: () => void }) {
  return (
    <div className="h-full w-full grid place-items-center px-6 text-center">
      <div>
        <Sparkles className="h-12 w-12 mx-auto text-cyan-300 mb-3" />
        <p className="text-xl font-semibold mb-1">No posts yet</p>
        <p className="text-sm text-white/60 mb-5">{canCreate ? "Publish the first Quick Learn post." : "Daily news will appear here automatically."}</p>
        {canCreate && (
          <button onClick={onCreate} className="px-5 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 font-semibold shadow-[0_0_25px_rgba(99,102,241,0.5)]">Create the first post</button>
        )}
      </div>
    </div>
  );
}

/* ====================== COMMENTS ====================== */

type Comment = { id: string; content: string; user_id: string; created_at: string; author?: Profile | null };

function CommentsPanel({ post, userId, onClose }: { post: Post; userId?: string; onClose: () => void }) {
  const [items, setItems] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const hydrateAuthors = useCallback(async (list: Comment[]) => {
    const ids = Array.from(new Set(list.map((c) => c.user_id)));
    if (!ids.length) return list;
    const { data: pp } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", ids);
    const map = new Map<string, Profile>();
    (pp ?? []).forEach((p: any) => map.set(p.id, p));
    return list.map((c) => ({ ...c, author: map.get(c.user_id) ?? null }));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("quick_learn_comments" as any)
      .select("*")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Couldn't load comments");
      setLoading(false);
      return;
    }
    const list = await hydrateAuthors((data ?? []) as any as Comment[]);
    setItems(list);
    setLoading(false);
  }, [post.id, hydrateAuthors]);

  useEffect(() => { load(); }, [load]);

  // Realtime updates
  useEffect(() => {
    const ch = supabase
      .channel(`ql-comments-${post.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "quick_learn_comments", filter: `post_id=eq.${post.id}` },
        async (payload) => {
          const c = payload.new as any as Comment;
          setItems((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]));
          const [withAuthor] = await hydrateAuthors([c]);
          setItems((prev) => prev.map((x) => (x.id === c.id ? withAuthor : x)));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [post.id, hydrateAuthors]);

  const send = async () => {
    if (!userId) return toast.error("Sign in to comment");
    const body = text.trim();
    if (!body) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic: Comment = {
      id: tempId, content: body, user_id: userId, created_at: new Date().toISOString(),
    };
    const [withAuthor] = await hydrateAuthors([optimistic]);
    setItems((prev) => [...prev, withAuthor]);
    setText("");
    setSending(true);

    const { data, error } = await supabase
      .from("quick_learn_comments" as any)
      .insert({ post_id: post.id, user_id: userId, content: body })
      .select()
      .single();
    setSending(false);
    if (error) {
      setItems((prev) => prev.filter((c) => c.id !== tempId));
      setText(body);
      return toast.error(error.message || "Failed to post comment");
    }
    setItems((prev) => prev.map((c) => (c.id === tempId ? { ...withAuthor, ...(data as any) } : c)));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex md:items-center md:justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-lg h-[80vh] md:h-[70vh] md:rounded-2xl rounded-t-3xl bg-[#0b0d14] border border-white/10 flex flex-col mt-auto md:mt-0"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <h3 className="font-semibold">Comments</h3>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-full bg-white/5 hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {loading ? (
            <div className="text-sm text-white/50">Loading…</div>
          ) : items.length === 0 ? (
            <div className="text-center text-sm text-white/50 py-10">No comments yet. Start the conversation.</div>
          ) : items.map((c) => (
            <div key={c.id} className="flex gap-3">
              {c.author?.avatar_url ? (
                <img src={c.author.avatar_url} className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <div className="h-9 w-9 rounded-full grid place-items-center bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-bold">
                  {(c.author?.username ?? "?")[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm"><span className="font-semibold">{c.author?.display_name || c.author?.username || "User"}</span> <span className="text-white/40 text-xs">· {timeAgo(c.created_at)}</span></div>
                <div className="text-sm text-white/85 whitespace-pre-wrap break-words">{c.content}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-white/10 flex gap-2">
          <input
            value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder={userId ? "Add a comment…" : "Sign in to comment"}
            disabled={!userId || sending}
            className="flex-1 bg-white/[0.05] border border-white/10 rounded-full px-4 py-2 text-sm outline-none focus:border-indigo-400 disabled:opacity-50"
          />
          <button onClick={send} disabled={!userId || sending || !text.trim()} className="h-9 w-9 grid place-items-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 disabled:opacity-50">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ====================== EDITOR ====================== */

function Editor({ userId, onClose, onSaved }: { userId: string; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [tagsText, setTagsText] = useState("");
  const [source, setSource] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Image files only");
    if (file.size > 8 * 1024 * 1024) return toast.error("Max 8MB");
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `quick-learn/${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) { setUploading(false); return toast.error(error.message); }
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    setImageUrl(data.publicUrl);
    setUploading(false);
  };
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) uploadFile(f); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return toast.error("Title and body required");
    setSaving(true);
    const tags = tagsText.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 8);
    const { error } = await supabase.from("quick_learn").insert({
      author_id: userId,
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      body: body.trim(),
      category,
      tags,
      source: source.trim() || null,
      image_url: imageUrl,
      published_at: new Date().toISOString(),
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Published");
    onSaved();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md grid place-items-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.form
        initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={save}
        className="w-full max-w-2xl my-8 rounded-3xl bg-[#0b0d14] border border-white/10 p-6 md:p-8 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">New Quick Learn</h2>
          <button type="button" onClick={onClose} className="h-9 w-9 grid place-items-center rounded-full bg-white/5 hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`relative aspect-[16/9] rounded-2xl border-2 border-dashed transition cursor-pointer overflow-hidden ${
            dragOver ? "border-indigo-400 bg-indigo-500/10" : "border-white/15 bg-white/[0.02] hover:bg-white/[0.04]"
          }`}
        >
          {imageUrl ? (
            <>
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={(e) => { e.stopPropagation(); setImageUrl(null); }}
                className="absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full bg-black/60"><X className="h-4 w-4" /></button>
            </>
          ) : (
            <div className="absolute inset-0 grid place-items-center text-white/60">
              <div className="text-center">
                <Upload className="h-7 w-7 mx-auto mb-2" />
                <div className="text-sm">{uploading ? "Uploading…" : "Drop image or click"}</div>
                <div className="text-xs text-white/40 mt-1">PNG, JPG · max 8MB</div>
              </div>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />
        </div>

        <div className="space-y-3 mt-5">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Headline" required maxLength={140}
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-lg font-semibold outline-none focus:border-indigo-400" />
          <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Subtitle (optional)" maxLength={200}
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white/90 outline-none focus:border-indigo-400" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share your tip, news, or insight…" rows={6} required
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-indigo-400 resize-none leading-relaxed" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-indigo-400 capitalize">
              {CATEGORIES.map((c) => <option key={c} value={c} className="bg-[#0b0d14]">{c.replace("-", " ")}</option>)}
            </select>
            <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="tags, comma, separated"
              className="bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-indigo-400" />
          </div>
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source URL (optional)" type="url"
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-indigo-400" />
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-white/70 hover:text-white">Cancel</button>
          <button type="submit" disabled={saving || uploading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 font-semibold shadow-[0_0_25px_rgba(99,102,241,0.5)] disabled:opacity-60">
            {saving ? "Publishing…" : "Publish"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

/* ====================== UTILS ====================== */

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - +new Date(iso)) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
