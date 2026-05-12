import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

export const Route = createFileRoute("/projects/new")({ component: NewProject });

function NewProject() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [code, setCode] = useState("");
  const [tags, setTags] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!user) {
    return (
      <AppShell>
        <div className="glass-strong rounded-2xl p-8 text-center max-w-md mx-auto">
          <p className="mb-4">Sign in to share a project.</p>
          <a href="/login" className="rounded-full gradient-bg px-6 py-2 text-white inline-block">Sign in</a>
        </div>
      </AppShell>
    );
  }

  const onPick = (f: File | null) => {
    setCoverFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title required");
    setLoading(true);
    try {
      let cover_image: string | null = null;
      if (coverFile) {
        const path = `${user.id}/${Date.now()}-${coverFile.name}`;
        const { error: upErr } = await supabase.storage.from("media").upload(path, coverFile);
        if (upErr) throw upErr;
        cover_image = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
      }
      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          content: content.trim() || null,
          code: code.trim() || null,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          cover_image,
        })
        .select()
        .single();
      if (error) throw error;
      toast.success("Project published!");
      nav({ to: "/projects/$id", params: { id: data.id } });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Share a project</h1>
        <form onSubmit={submit} className="space-y-4">
          <div className="glass-strong rounded-2xl p-4">
            <label className="block">
              {preview ? (
                <div className="relative">
                  <img src={preview} className="w-full aspect-video object-cover rounded-xl" />
                  <button type="button" onClick={() => onPick(null)} className="absolute top-2 right-2 glass-strong rounded-full p-1.5">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="aspect-video glass rounded-xl grid place-items-center cursor-pointer hover:glow-soft transition">
                  <div className="text-center">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">Upload cover image</p>
                  </div>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project title" required
            className="w-full glass-strong rounded-xl px-4 py-3 text-lg font-semibold outline-none focus:ring-2 focus:ring-primary" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" rows={2}
            className="w-full glass-strong rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary resize-none" />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Full write-up: how it works, parts list, etc." rows={6}
            className="w-full glass-strong rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary resize-none" />
          <textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder="// Arduino / firmware code (optional)" rows={6}
            className="w-full glass-strong rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary resize-none font-mono text-sm" />
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags, comma, separated"
            className="w-full glass-strong rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
          <button disabled={loading} className="w-full gradient-bg text-white rounded-xl py-3 font-medium glow-soft disabled:opacity-60">
            {loading ? "Publishing…" : "Publish project"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
