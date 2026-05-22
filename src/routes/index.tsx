import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ProjectCard } from "@/components/ProjectCard";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles, Cpu, Bot, Zap, ArrowRight, Inbox } from "lucide-react";

export const Route = createFileRoute("/")({ component: Index });

const CATEGORIES = [
  { icon: Sparkles, label: "All", value: "all", color: "from-primary to-secondary" },
  { icon: Cpu, label: "Arduino", value: "arduino", color: "from-purple-500 to-blue-500" },
  { icon: Bot, label: "Robotics", value: "robotics", color: "from-blue-500 to-cyan-500" },
  { icon: Zap, label: "IoT", value: "iot", color: "from-pink-500 to-purple-500" },
  { icon: Sparkles, label: "AI Hardware", value: "ai", color: "from-cyan-500 to-purple-500" },
];

function Index() {
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("projects")
        .select("*, profiles!projects_user_id_fkey(username, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(48);
      const withCounts = await Promise.all(
        (data ?? []).map(async (p: any) => {
          const [{ count: likes }, { count: comments }] = await Promise.all([
            supabase.from("project_likes").select("*", { count: "exact", head: true }).eq("project_id", p.id),
            supabase.from("project_comments").select("*", { count: "exact", head: true }).eq("project_id", p.id),
          ]);
          return { ...p, likes_count: likes ?? 0, comments_count: comments ?? 0 };
        })
      );
      setProjects(withCounts);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (activeCat === "all") return projects;
    const needle = activeCat.toLowerCase();
    return projects.filter((p) => {
      const cat = (p.category ?? "").toLowerCase();
      const tags: string[] = (p.tags ?? []).map((t: string) => t.toLowerCase());
      const title = (p.title ?? "").toLowerCase();
      return cat.includes(needle) || tags.some((t) => t.includes(needle)) || title.includes(needle);
    });
  }, [projects, activeCat]);

  return (
    <AppShell>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl glass-strong p-8 md:p-12 mb-10">
        <div className="absolute inset-0 opacity-50" style={{ background: "var(--gradient-glow)" }} />
        <div className="relative max-w-2xl">
          <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 text-xs mb-4">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Welcome{profile ? `, @${profile.username}` : " to EJ"}</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            <span className="gradient-text">Learn. Build.</span><br />Innovate.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            The community for electronics, robotics, Arduino, IoT & AI hardware makers.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/projects/new" className="inline-flex items-center gap-2 rounded-full gradient-bg px-6 py-3 font-medium text-white glow">
              Share a project <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/quick-learn" className="inline-flex items-center gap-2 rounded-full glass px-6 py-3 font-medium">
              Quick Learn
            </Link>
            {!user && (
              <Link to="/signup" className="inline-flex items-center gap-2 rounded-full glass px-6 py-3 font-medium">
                Join free
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-8">
        {CATEGORIES.map(({ icon: Icon, label, value, color }) => {
          const isActive = activeCat === value;
          return (
            <button
              key={value}
              onClick={() => setActiveCat(value)}
              className={`glass rounded-2xl p-4 text-left transition group ${
                isActive ? "ring-2 ring-primary glow-soft -translate-y-0.5" : "hover:glow-soft"
              }`}
            >
              <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${color} grid place-items-center mb-2 transition ${isActive ? "scale-110" : "group-hover:scale-110"}`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div className={`font-medium ${isActive ? "gradient-text" : ""}`}>{label}</div>
            </button>
          );
        })}
      </section>

      {/* Feed */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">
            {activeCat === "all" ? "Trending projects" : `${CATEGORIES.find(c => c.value === activeCat)?.label} projects`}
            {!loading && <span className="ml-2 text-sm font-normal text-muted-foreground">({filtered.length})</span>}
          </h2>
          <Link to="/projects/new" className="text-sm text-primary hover:underline">+ New project</Link>
        </div>
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl aspect-[4/3] animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="mx-auto h-14 w-14 rounded-full glass grid place-items-center mb-4">
              <Inbox className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No posts found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {activeCat === "all"
                ? "Be the first to share a project with the community."
                : `No projects in ${CATEGORIES.find(c => c.value === activeCat)?.label} yet.`}
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              {activeCat !== "all" && (
                <button onClick={() => setActiveCat("all")} className="rounded-full glass px-5 py-2 text-sm font-medium">
                  Show all
                </button>
              )}
              <Link to="/projects/new" className="rounded-full gradient-bg px-5 py-2 text-sm font-medium text-white">
                Share your project
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}
      </section>
    </AppShell>
  );
}
