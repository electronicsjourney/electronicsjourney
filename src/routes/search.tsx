import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
      const [{ data: p }, { data: u }, { data: l }] = await Promise.all([
        supabase.from("projects").select("id,title,description,cover_image").or(`title.ilike.${term},description.ilike.${term}`).limit(10),
        supabase.from("profiles").select("id,username,display_name,avatar_url").or(`username.ilike.${term},display_name.ilike.${term}`).limit(10),
        supabase.from("quick_learn").select("id,title,body,category").or(`title.ilike.${term},body.ilike.${term}`).limit(10),
      ]);
      setProjects(p ?? []); setUsers(u ?? []); setPosts(l ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <AppShell>
      <div className="glass-strong rounded-2xl p-3 flex items-center gap-2 mb-6">
        <SearchIcon className="h-5 w-5 text-muted-foreground ml-2" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects, users, learning posts…"
          className="flex-1 bg-transparent outline-none py-2" />
      </div>
      {q && (
        <div className="space-y-8">
          <Section title="Users">
            {users.length === 0 ? <Empty /> : users.map((u) => (
              <Link key={u.id} to="/profile/$username" params={{ username: u.username }} className="glass rounded-xl p-3 flex items-center gap-3 hover:glow-soft">
                <div className="h-10 w-10 rounded-full gradient-bg grid place-items-center text-white font-bold">{u.username[0]?.toUpperCase()}</div>
                <div><div className="font-medium">{u.display_name || u.username}</div><div className="text-xs text-muted-foreground">@{u.username}</div></div>
              </Link>
            ))}
          </Section>
          <Section title="Projects">
            {projects.length === 0 ? <Empty /> : projects.map((p) => (
              <Link key={p.id} to="/projects/$id" params={{ id: p.id }} className="glass rounded-xl p-3 hover:glow-soft block">
                <div className="font-medium">{p.title}</div>
                {p.description && <div className="text-sm text-muted-foreground line-clamp-1">{p.description}</div>}
              </Link>
            ))}
          </Section>
          <Section title="Quick Learn">
            {posts.length === 0 ? <Empty /> : posts.map((p) => (
              <Link key={p.id} to="/quick-learn" className="glass rounded-xl p-3 hover:glow-soft block">
                <div className="font-medium">{p.title}</div>
                <div className="text-xs text-muted-foreground">{p.category}</div>
              </Link>
            ))}
          </Section>
        </div>
      )}
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h2 className="text-lg font-bold mb-2">{title}</h2><div className="space-y-2">{children}</div></div>;
}
function Empty() { return <div className="text-sm text-muted-foreground">No results</div>; }
