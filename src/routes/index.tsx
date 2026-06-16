import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Inbox, Heart, Eye, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({ component: Index });

const FILTERS = ["All", "Arduino", "ESP32", "Robotics", "IoT", "AI Hardware", "Beginner", "Advanced"];
const CATEGORY_FILTERS = ["Arduino", "ESP32", "Robotics", "IoT", "AI Hardware"];
const DIFFICULTY_FILTERS = ["Beginner", "Advanced"];
const DIFF_COLORS: Record<string, string> = {
  Beginner: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  Intermediate: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  Advanced: "bg-rose-500/20 text-rose-300 border-rose-500/30",
};

function getProjectCategory(project: any) {
  if (project.category?.trim()) return project.category.trim();
  const normalizedTags = (project.tags ?? []).map((tag: string) => tag.toLowerCase());
  return CATEGORY_FILTERS.find((category) => normalizedTags.includes(category.toLowerCase())) ?? null;
}

function Index() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState("All");
  const [stats, setStats] = useState({ projects: 0, makers: 0, quickLearn: 0 });

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) {
        console.error("Failed to load projects", error);
        setProjects([]);
        setLoading(false);
        return;
      }
      const rows = data ?? [];
      const userIds = Array.from(new Set(rows.map((p: any) => p.user_id).filter(Boolean)));
      const { data: authors, error: authorsError } = userIds.length
        ? await supabase.from("profiles").select("id, username, avatar_url, display_name").in("id", userIds)
        : { data: [], error: null };
      if (authorsError) console.error("Failed to load project authors", authorsError);
      const authorsById = new Map((authors ?? []).map((author: any) => [author.id, author]));
      const withCounts = await Promise.all(
        rows.map(async (p: any) => {
          const { count: likes } = await supabase
            .from("project_likes").select("*", { count: "exact", head: true }).eq("project_id", p.id);
          return { ...p, category: getProjectCategory(p), profiles: authorsById.get(p.user_id) ?? null, likes_count: likes ?? 0 };
        })
      );
      setProjects(withCounts);
      setLoading(false);

      const [{ count: mc }, { count: qc }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("quick_learn").select("*", { count: "exact", head: true }),
      ]);
      setStats({ projects: withCounts.length, makers: mc ?? 0, quickLearn: qc ?? 0 });
    })();
  }, []);

  const filtered = useMemo(() => {
    if (active === "All") return projects;
    const lower = active.toLowerCase();
    return projects.filter((p) => {
      const cat = (p.category ?? "").toLowerCase();
      const diff = (p.difficulty ?? "").toLowerCase();
      const tags = (p.tags ?? []).map((t: string) => t.toLowerCase());
      const title = (p.title ?? "").toLowerCase();

      if (DIFFICULTY_FILTERS.includes(active)) {
        return diff === lower;
      }
      if (CATEGORY_FILTERS.includes(active)) {
        return cat === lower || tags.includes(lower) || title.includes(lower);
      }
      return [cat, diff, title, ...tags].join(" ").includes(lower);
    });
  }, [projects, active]);

  return (
    <AppShell>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl glass-strong p-8 md:p-14 mb-8">
        <div className="absolute inset-0 opacity-60" style={{ background: "var(--gradient-glow)" }} />
        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 text-xs mb-5">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>India's maker community</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            <span className="gradient-text">Build. Learn.</span><br />Innovate.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            India's maker community for Arduino, IoT, Robotics & AI Hardware.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/projects/new" className="inline-flex items-center gap-2 rounded-full gradient-bg px-6 py-3 font-medium text-white glow">
              Share a project <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/quick-learn" className="inline-flex items-center gap-2 rounded-full glass px-6 py-3 font-medium">
              Quick Learn
            </Link>
            {!user && (
              <Link to="/signup" className="inline-flex items-center gap-2 rounded-full border border-primary/50 text-primary px-6 py-3 font-medium hover:bg-primary/10 transition">
                Join free
              </Link>
            )}
          </div>
          <div className="mt-6 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{stats.projects.toLocaleString()}</span> projects shared ·{" "}
            <span className="font-semibold text-foreground">{stats.makers.toLocaleString()}</span> makers joined ·{" "}
            <span className="font-semibold text-foreground">{stats.quickLearn.toLocaleString()}</span> Quick Learn posts
          </div>
        </div>
      </section>

      {/* Filter pills */}
      <div className="mb-6 -mx-4 px-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 min-w-max pb-2">
          {FILTERS.map((f) => {
            const isOn = active === f;
            return (
              <button
                key={f}
                onClick={() => setActive(f)}
                className={`px-4 h-9 rounded-full text-sm font-medium whitespace-nowrap transition border ${
                  isOn
                    ? "gradient-bg text-white border-transparent glow-soft"
                    : "glass border-white/10 hover:border-primary/40"
                }`}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feed */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">
            {active === "All" ? "Trending projects" : `${active} projects`}
            {!loading && <span className="ml-2 text-sm font-normal text-muted-foreground">({filtered.length})</span>}
          </h2>
          <Link to="/projects/new" className="text-sm text-primary hover:underline">+ New project</Link>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl aspect-[4/3] animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="mx-auto h-14 w-14 rounded-full glass grid place-items-center mb-4">
              <Inbox className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No projects found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {active === "All" ? "Be the first to share a project." : `No projects match "${active}" yet.`}
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              {active !== "All" && (
                <button onClick={() => setActive("All")} className="rounded-full glass px-5 py-2 text-sm font-medium">
                  Show all
                </button>
              )}
              <Link to="/projects/new" className="rounded-full gradient-bg px-5 py-2 text-sm font-medium text-white">
                Share your project
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p) => <ProjectFeedCard key={p.id} project={p} />)}
          </div>
        )}
      </section>

      <Footer />
    </AppShell>
  );
}

function ProjectFeedCard({ project }: { project: any }) {
  const author = project.profiles ?? {};
  const diffClass = DIFF_COLORS[project.difficulty] ?? "bg-primary/15 text-primary border-primary/30";
  return (
    <Link
      to="/projects/$id"
      params={{ id: project.id }}
      className="group glass rounded-2xl overflow-hidden hover:glow-soft transition-all hover:-translate-y-1 flex flex-col"
    >
      <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 relative overflow-hidden">
        {project.cover_image ? (
          <img src={project.cover_image} alt={project.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="w-full h-full grid place-items-center text-5xl opacity-30">⚡</div>
        )}
        {project.category && (
          <span className="absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-wide glass-strong rounded-full px-2.5 py-1">
            {project.category}
          </span>
        )}
        {project.difficulty && (
          <span className={`absolute top-3 right-3 text-[10px] font-semibold rounded-full px-2.5 py-1 border ${diffClass}`}>
            {project.difficulty}
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col gap-3 flex-1">
        <h3 className="font-semibold line-clamp-2 group-hover:gradient-text transition">{project.title}</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {author.avatar_url ? (
            <img src={author.avatar_url} className="h-6 w-6 rounded-full object-cover" alt="" />
          ) : (
            <div className="h-6 w-6 rounded-full gradient-bg grid place-items-center text-[10px] font-bold text-white">
              {(author.username?.[0] ?? "?").toUpperCase()}
            </div>
          )}
          <span className="truncate">@{author.username ?? "anon"}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto pt-1 border-t border-white/5">
          <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {project.likes_count ?? 0}</span>
          <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {project.views ?? 0}</span>
        </div>
      </div>
    </Link>
  );
}
