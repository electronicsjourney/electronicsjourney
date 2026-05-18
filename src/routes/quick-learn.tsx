import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
  Heart, Bookmark, Share2, Plus, X, ChevronLeft, ChevronRight,
  Sparkles, ExternalLink, Trash2, Upload, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/quick-learn")({ component: QuickLearn });

type Post = {
  id: string;
  title: string;
  subtitle: string | null;
  body: string;
  category: string;
  image_url: string | null;
  source: string | null;
  author_id: string;
  published_at: string;
  created_at: string;
};

const CATEGORIES = [
  "electronics", "robotics", "ai-hardware", "circuit-tricks",
  "components", "industry-news", "engineering", "beginner-tips",
];

function QuickLearn() {
  const { user, isAdmin } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [editorOpen, setEditorOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("quick_learn")
      .select("*")
      .order("published_at", { ascending: false })
      .limit(100);
    setPosts((data ?? []) as Post[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const total = posts.length;
  const current = total > 0 ? posts[((index % total) + total) % total] : null;

  const go = useCallback((delta: number) => {
    if (total === 0) return;
    setDir(delta > 0 ? 1 : -1);
    setIndex((i) => i + delta);
  }, [total]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editorOpen) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") { e.preventDefault(); go(1); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); go(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, editorOpen]);

  // Wheel / touchpad swipe
  const wheelLock = useRef(0);
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (editorOpen) return;
      const now = Date.now();
      if (now - wheelLock.current < 600) return;
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(d) < 20) return;
      wheelLock.current = now;
      go(d > 0 ? 1 : -1);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [go, editorOpen]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 80;
    if (info.offset.x < -threshold || info.velocity.x < -500) go(1);
    else if (info.offset.x > threshold || info.velocity.x > 500) go(-1);
  };

  return (
    <div className="fixed inset-0 bg-[#05060a] text-white overflow-hidden select-none">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-[#6366f1]/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-[#a855f7]/20 blur-[140px]" />
        <div className="absolute top-1/3 left-1/2 h-[380px] w-[380px] rounded-full bg-[#06b6d4]/10 blur-[120px]" />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 md:px-8 pt-4 md:pt-6">
        <Link to="/" className="flex items-center gap-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 px-3 py-1.5 text-sm hover:bg-white/10 transition">
          <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 px-3 py-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
            <span className="font-semibold tracking-wider">QUICK LEARN</span>
          </div>
          {isAdmin && (
            <button
              onClick={() => setEditorOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-1.5 text-xs font-semibold shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] transition"
            >
              <Plus className="h-3.5 w-3.5" /> New
            </button>
          )}
        </div>
      </div>

      {/* Progress dots */}
      {total > 0 && (
        <div className="absolute top-16 md:top-20 left-1/2 -translate-x-1/2 z-30 flex gap-1.5">
          {posts.slice(0, Math.min(total, 12)).map((_, i) => {
            const active = ((index % total) + total) % total === i;
            return (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${active ? "w-6 bg-white" : "w-1.5 bg-white/30"}`}
              />
            );
          })}
          {total > 12 && <div className="text-[10px] text-white/40 ml-1">+{total - 12}</div>}
        </div>
      )}

      {/* Main swipe area */}
      <div className="absolute inset-0 flex items-center justify-center px-3 md:px-12 pt-24 md:pt-28 pb-24 md:pb-16">
        {loading ? (
          <CardSkeleton />
        ) : !current ? (
          <div className="text-center text-white/60">
            <p className="text-xl mb-2">No Quick Learn posts yet</p>
            {isAdmin && <p className="text-sm">Tap "New" to publish the first one</p>}
          </div>
        ) : (
          <AnimatePresence custom={dir} mode="wait">
            <motion.div
              key={current.id + "-" + index}
              custom={dir}
              initial={{ opacity: 0, x: dir * 80, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -dir * 80, scale: 0.96 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              className="w-full max-w-3xl h-full max-h-[calc(100dvh-9rem)] cursor-grab active:cursor-grabbing"
            >
              <PostCard post={current} userId={user?.id} isAdmin={isAdmin} onDeleted={() => { load(); setIndex(0); }} />
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Side arrows (desktop hint) */}
      {total > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 h-12 w-12 items-center justify-center rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition"
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={() => go(1)}
            className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 h-12 w-12 items-center justify-center rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition"
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Bottom hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 text-[11px] text-white/40 tracking-wide">
        Swipe · Drag · Arrow keys
      </div>

      {/* Editor */}
      <AnimatePresence>
        {editorOpen && isAdmin && user && (
          <Editor
            userId={user.id}
            onClose={() => setEditorOpen(false)}
            onSaved={() => { setEditorOpen(false); setIndex(0); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Card ---------------- */

function PostCard({ post, userId, isAdmin, onDeleted }: {
  post: Post; userId?: string; isAdmin: boolean; onDeleted: () => void;
}) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likes, setLikes] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { count } = await supabase.from("quick_learn_likes")
        .select("*", { count: "exact", head: true }).eq("post_id", post.id);
      if (!alive) return;
      setLikes(count ?? 0);
      if (userId) {
        const { data: l } = await supabase.from("quick_learn_likes").select().eq("post_id", post.id).eq("user_id", userId).maybeSingle();
        const { data: s } = await supabase.from("quick_learn_saves").select().eq("post_id", post.id).eq("user_id", userId).maybeSingle();
        if (!alive) return;
        setLiked(!!l); setSaved(!!s);
      } else { setLiked(false); setSaved(false); }
    })();
    return () => { alive = false; };
  }, [post.id, userId]);

  const toggleLike = async () => {
    if (!userId) return toast.error("Sign in to like");
    if (liked) {
      await supabase.from("quick_learn_likes").delete().eq("post_id", post.id).eq("user_id", userId);
      setLiked(false); setLikes((n) => n - 1);
    } else {
      await supabase.from("quick_learn_likes").insert({ post_id: post.id, user_id: userId });
      setLiked(true); setLikes((n) => n + 1);
    }
  };
  const toggleSave = async () => {
    if (!userId) return toast.error("Sign in to save");
    if (saved) {
      await supabase.from("quick_learn_saves").delete().eq("post_id", post.id).eq("user_id", userId);
      setSaved(false);
    } else {
      await supabase.from("quick_learn_saves").insert({ post_id: post.id, user_id: userId });
      setSaved(true);
    }
  };
  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: post.title, text: post.subtitle ?? post.body.slice(0, 120), url }); } catch {}
    } else {
      navigator.clipboard.writeText(`${post.title}\n\n${post.body}\n\n${url}`);
      toast.success("Copied to clipboard");
    }
  };
  const remove = async () => {
    if (!confirm("Delete this Quick Learn post?")) return;
    const { error } = await supabase.from("quick_learn").delete().eq("id", post.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    onDeleted();
  };

  return (
    <article className="relative h-full w-full rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-xl shadow-[0_30px_120px_-30px_rgba(99,102,241,0.5)] flex flex-col">
      {/* Image */}
      <div className="relative w-full aspect-[16/9] md:aspect-[21/9] overflow-hidden bg-gradient-to-br from-indigo-900/40 to-purple-900/40 shrink-0">
        {post.image_url ? (
          <img
            src={post.image_url}
            alt={post.title}
            loading="lazy"
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="h-full w-full grid place-items-center">
            <Sparkles className="h-16 w-16 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#05060a] via-[#05060a]/40 to-transparent" />
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="rounded-full bg-cyan-400/20 backdrop-blur-md border border-cyan-300/30 text-cyan-200 text-[10px] font-bold uppercase tracking-[0.15em] px-2.5 py-1">
            {post.category}
          </span>
        </div>
        {isAdmin && (
          <button onClick={remove}
            className="absolute top-4 right-4 h-8 w-8 grid place-items-center rounded-full bg-red-500/20 backdrop-blur-md border border-red-400/30 hover:bg-red-500/40 transition">
            <Trash2 className="h-4 w-4 text-red-200" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 md:px-10 py-5 md:py-7 scrollbar-hide">
        <h1 className="text-2xl md:text-4xl font-extrabold leading-[1.15] tracking-tight bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent">
          {post.title}
        </h1>
        {post.subtitle && (
          <p className="mt-2 md:mt-3 text-base md:text-lg text-white/70 leading-relaxed">
            {post.subtitle}
          </p>
        )}
        <div className="mt-4 md:mt-6 text-[15px] md:text-[17px] leading-[1.75] text-white/85 whitespace-pre-wrap">
          {post.body}
        </div>
        {post.source && (
          <a href={post.source} target="_blank" rel="noreferrer"
            className="mt-5 inline-flex items-center gap-1.5 text-xs text-cyan-300 hover:text-cyan-200">
            <ExternalLink className="h-3.5 w-3.5" /> Source
          </a>
        )}
        <div className="mt-6 text-[11px] uppercase tracking-wider text-white/40">
          {new Date(post.published_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </div>
      </div>

      {/* Action bar */}
      <div className="shrink-0 border-t border-white/10 bg-black/30 backdrop-blur-md px-5 md:px-10 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ActionBtn active={liked} onClick={toggleLike} icon={<Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />} label={String(likes)} />
          <ActionBtn active={saved} onClick={toggleSave} icon={<Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />} />
          <ActionBtn onClick={share} icon={<Share2 className="h-4 w-4" />} />
        </div>
        <div className="text-[11px] text-white/40 tracking-wide">Electronics Journey</div>
      </div>
    </article>
  );
}

function ActionBtn({ active, onClick, icon, label }: { active?: boolean; onClick: () => void; icon: React.ReactNode; label?: string }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm border transition ${
        active ? "bg-indigo-500/20 border-indigo-400/40 text-indigo-200" : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
      }`}>
      {icon}{label && <span className="text-xs font-medium">{label}</span>}
    </button>
  );
}

function CardSkeleton() {
  return (
    <div className="w-full max-w-3xl h-full max-h-[calc(100dvh-9rem)] rounded-3xl overflow-hidden border border-white/10 bg-white/[0.02] animate-pulse">
      <div className="aspect-[16/9] md:aspect-[21/9] bg-white/5" />
      <div className="p-8 space-y-3">
        <div className="h-8 w-2/3 bg-white/10 rounded" />
        <div className="h-4 w-1/2 bg-white/5 rounded" />
        <div className="h-3 w-full bg-white/5 rounded mt-6" />
        <div className="h-3 w-11/12 bg-white/5 rounded" />
        <div className="h-3 w-10/12 bg-white/5 rounded" />
      </div>
    </div>
  );
}

/* ---------------- Editor ---------------- */

function Editor({ userId, onClose, onSaved }: { userId: string; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
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

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0]; if (f) uploadFile(f);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return toast.error("Title and body required");
    setSaving(true);
    const { error } = await supabase.from("quick_learn").insert({
      author_id: userId,
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      body: body.trim(),
      category,
      source: source.trim() || null,
      image_url: imageUrl,
      published_at: new Date().toISOString(),
    });
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
          <h2 className="text-xl font-bold text-white">New Quick Learn</h2>
          <button type="button" onClick={onClose} className="h-9 w-9 grid place-items-center rounded-full bg-white/5 hover:bg-white/10 text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Image dropzone */}
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
                className="absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full bg-black/60 text-white">
                <X className="h-4 w-4" />
              </button>
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
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-semibold outline-none focus:border-indigo-400" />
          <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Subtitle (optional)" maxLength={200}
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white/90 outline-none focus:border-indigo-400" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write the story…" rows={6} required
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-400 resize-none leading-relaxed" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-400">
              {CATEGORIES.map((c) => <option key={c} value={c} className="bg-[#0b0d14]">{c}</option>)}
            </select>
            <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source URL (optional)" type="url"
              className="bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-400" />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-white/70 hover:text-white">Cancel</button>
          <button type="submit" disabled={saving || uploading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold shadow-[0_0_25px_rgba(99,102,241,0.5)] disabled:opacity-60">
            {saving ? "Publishing…" : "Publish"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
