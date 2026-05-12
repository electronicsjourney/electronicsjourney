import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
      setItems(data ?? []);
      await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    };
    load();
    const ch = supabase.channel("notif-page-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  if (!user) return <AppShell><div className="text-center py-20"><Link to="/login" className="text-primary">Sign in</Link> to see notifications</div></AppShell>;

  return (
    <AppShell>
      <h1 className="text-3xl font-bold mb-6">Notifications</h1>
      <div className="space-y-2 max-w-2xl">
        {items.length === 0 && <div className="glass rounded-2xl p-8 text-center text-muted-foreground">No notifications yet</div>}
        {items.map((n) => (
          <Link key={n.id} to={n.link || "/"} className="glass rounded-2xl p-4 flex items-start gap-3 hover:glow-soft transition block">
            <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm">{n.message}</div>
              <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
