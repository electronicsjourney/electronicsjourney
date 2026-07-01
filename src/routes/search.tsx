import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Search as SearchIcon } from "lucide-react";

export const Route = createFileRoute("/search")({ component: SearchPage });

function SearchPage() {
  const [q, setQ] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    if (!q.trim()) { setProjects([]); setUsers([]); setPosts([]); return; }
    const t = setTimeout(async () => {
      const term = `%${q.trim()}%`;
      const raw = q.trim().replace(/^#/, "");
      const [{ data: p }, { data: u }, { data: l }] = await Promise.all([
        supabase.from("projects").select("id,title,description,cover_image,tags,category")
          .eq("status", "published")
          .or(`title.ilike.${term},description.ilike.${term},tagline.ilike.${term},category.ilike.${term},tags.cs.{${raw}}`).limit(50),
        supabase.from("profiles").select("id,username,display_name,avatar_url").or(`username.ilike.${term},display_name.ilike.${term}`).limit(10),
        supabase.from("quick_learn").select("id,title,body,category").or(`title.ilike.${term},body.ilike.${term},category.ilike.${term}`).limit(50),
      ]);
      setProjects(p ?? []); setUsers(u ?? []); setPosts(l ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const projectCats = useMemo(() => countBy(projects, "category"), [projects]);
  const postCats = useMemo(() => countBy(posts, "category"), [posts]);

  return (
    <AppShell>
      <div className="glass-strong rounded-2xl p-3 flex items-center gap-2 mb-6">
        <SearchIcon className="h-5 w-5 text-muted-foreground ml-2" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects, users, learning posts…"
          className="flex-1 bg-transparent outline-none py-2" />
      </div>
      {q && (
        <div className="space-y-8">
          <div className="glass rounded-xl p-3 text-sm flex flex-wrap gap-4">
            <span><b>{projects.length}</b> projects</span>
            <span><b>{users.length}</b> users</span>
            <span><b>{posts.length}</b> Quick Learn</span>
          </div>

          <Section title={`Users (${users.length})`}>
            {users.length === 0 ? <Empty /> : users.map((u) => (
              <Link key={u.id} to="/profile/$username" params={{ username: u.username }} className="glass rounded-xl p-3 flex items-center gap-3 hover:glow-soft">
                <div className="h-10 w-10 rounded-full gradient-bg grid place-items-center text-white font-bold">{u.username[0]?.toUpperCase()}</div>
                <div><div className="font-medium">{u.display_name || u.username}</div><div className="text-xs text-muted-foreground">@{u.username}</div></div>
              </Link>
            ))}
          </Section>

          <Section title={`Projects (${projects.length})`}>
            {projectCats.length > 0 && <CategoryChips items={projectCats} />}
            {projects.length === 0 ? <Empty /> : projects.map((p) => (
              <Link key={p.id} to="/projects/$id" params={{ id: p.id }} className="glass rounded-xl p-3 hover:glow-soft block">
                <div className="font-medium">{p.title}</div>
                {p.category && <div className="text-[11px] text-primary capitalize">{p.category}</div>}
                {p.description && <div className="text-sm text-muted-foreground line-clamp-1">{p.description}</div>}
                {p.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {p.tags.slice(0, 4).map((t: string) => <span key={t} className="text-[10px] text-primary">#{t}</span>)}
                  </div>
                )}
              </Link>
            ))}
          </Section>

          <Section title={`Quick Learn (${posts.length})`}>
            {postCats.length > 0 && <CategoryChips items={postCats} />}
            {posts.length === 0 ? <Empty /> : posts.map((p) => (
              <Link key={p.id} to="/quick-learn" className="glass rounded-xl p-3 hover:glow-soft block">
                <div className="font-medium">{p.title}</div>
                <div className="text-xs text-muted-foreground capitalize">{p.category}</div>
              </Link>
            ))}
          </Section>
        </div>
      )}
    </AppShell>
  );
}

function countBy(arr: any[], key: string): { name: string; count: number }[] {
  const m = new Map<string, number>();
  for (const it of arr) {
    const v = (it?.[key] ?? "").toString().trim();
    if (!v) continue;
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  return Array.from(m.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function CategoryChips({ items }: { items: { name: string; count: number }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {items.map((c) => (
        <span key={c.name} className="text-[11px] px-2 py-1 rounded-full glass capitalize">
          {c.name} <b className="text-primary">{c.count}</b>
        </span>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h2 className="text-lg font-bold mb-2">{title}</h2><div className="space-y-2">{children}</div></div>;
}
function Empty() { return <div className="text-sm text-muted-foreground">No results</div>; }
