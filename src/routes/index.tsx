import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ProjectCard } from "@/components/ProjectCard";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles, Cpu, Bot, Zap, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("projects")
        .select("*, profiles!projects_user_id_fkey(username, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(12);
      // counts
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
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {[
          { icon: Cpu, label: "Arduino", color: "from-purple-500 to-blue-500" },
          { icon: Bot, label: "Robotics", color: "from-blue-500 to-cyan-500" },
          { icon: Zap, label: "IoT", color: "from-pink-500 to-purple-500" },
          { icon: Sparkles, label: "AI Hardware", color: "from-cyan-500 to-purple-500" },
        ].map(({ icon: Icon, label, color }) => (
          <Link
            key={label}
            to="/search"
            className="glass rounded-2xl p-4 hover:glow-soft transition group"
          >
            <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${color} grid place-items-center mb-2 group-hover:scale-110 transition`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="font-medium">{label}</div>
          </Link>
        ))}
      </section>

      {/* Trending */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Trending projects</h2>
          <Link to="/projects/new" className="text-sm text-primary hover:underline">+ New project</Link>
        </div>
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl aspect-[4/3] animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <p className="text-muted-foreground">No projects yet. Be the first to share!</p>
            <Link to="/projects/new" className="mt-4 inline-flex rounded-full gradient-bg px-6 py-2 text-sm font-medium text-white">
              Share your project
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}
      </section>
    </AppShell>
  );
}
