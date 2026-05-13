import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { CodeBlock } from "@/components/CodeBlock";
import { toast } from "sonner";
import {
  Upload, X, ChevronLeft, ChevronRight, Eye, Save, Send, Plus, Trash2,
  Heading1, Type, List, Image as ImageIcon, Code as CodeIcon, Youtube, Lightbulb, AlertTriangle, Info,
  GripVertical,
} from "lucide-react";

export const Route = createFileRoute("/projects/new")({
  component: NewProject,
  validateSearch: (s: Record<string, unknown>) => ({ id: typeof s.id === "string" ? s.id : undefined }),
});

type Block =
  | { id: string; type: "heading"; text: string }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "list"; items: string[] }
  | { id: string; type: "tip" | "warning" | "info"; text: string }
  | { id: string; type: "image"; url: string; caption?: string }
  | { id: string; type: "youtube"; url: string }
  | { id: string; type: "code"; code: string; language: string };

type Step = {
  id: string;
  title: string;
  description: string;
  images: string[];
  notes: string;
  code?: string;
};

type Component = { name: string; quantity: string; link?: string };

const uid = () => Math.random().toString(36).slice(2, 10);

function NewProject() {
  const { user } = useAuth();
  const nav = useNavigate();
  const search = Route.useSearch();
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0); // cover → details → editor → publish/preview
  const [projectId, setProjectId] = useState<string | null>(search.id ?? null);
  const [loading, setLoading] = useState(false);
  const [savingMsg, setSavingMsg] = useState("");

  // form state
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [difficulty, setDifficulty] = useState("Beginner");
  const [buildCost, setBuildCost] = useState("");
  const [buildTime, setBuildTime] = useState("");
  const [category, setCategory] = useState("Arduino");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [components, setComponents] = useState<Component[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [preview, setPreview] = useState(false);

  // load existing draft
  useEffect(() => {
    if (!projectId || !user) return;
    (async () => {
      const { data } = await supabase.from("projects").select("*").eq("id", projectId).maybeSingle();
      if (!data) return;
      setCoverImage(data.cover_image);
      setTitle(data.title ?? "");
      setTagline(data.tagline ?? "");
      setDifficulty(data.difficulty ?? "Beginner");
      setBuildCost(data.build_cost ?? "");
      setBuildTime(data.build_time ?? "");
      setCategory(data.category ?? "Arduino");
      setTags(data.tags ?? []);
      setComponents((data.components as Component[]) ?? []);
      setBlocks((data.content_blocks as Block[]) ?? []);
      setSteps((data.steps as Step[]) ?? []);
      if (data.cover_image) setStage(1);
    })();
  }, [projectId, user]);

  // autosave
  const draftPayload = useMemo(() => ({
    title: title.trim() || "Untitled",
    tagline: tagline.trim() || null,
    difficulty, build_cost: buildCost || null, build_time: buildTime || null, category,
    cover_image: coverImage,
    tags, components, content_blocks: blocks, steps,
    status: "draft" as const,
  }), [title, tagline, difficulty, buildCost, buildTime, category, coverImage, tags, components, blocks, steps]);

  const saveDraft = async (silent = false) => {
    if (!user) return;
    if (!silent) setSavingMsg("Saving…");
    try {
      if (projectId) {
        const { error } = await supabase.from("projects").update(draftPayload).eq("id", projectId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("projects")
          .insert({ ...draftPayload, user_id: user.id }).select().single();
        if (error) throw error;
        setProjectId(data.id);
      }
      setSavingMsg(silent ? "Saved" : "Draft saved");
      setTimeout(() => setSavingMsg(""), 1500);
    } catch (e: any) {
      if (!silent) toast.error(e.message);
    }
  };

  // autosave timer (every 8s if dirty)
  const lastSaved = useRef<string>("");
  useEffect(() => {
    if (!user) return;
    const handle = setInterval(() => {
      const snap = JSON.stringify(draftPayload);
      if (snap !== lastSaved.current && (title || coverImage || blocks.length || steps.length)) {
        lastSaved.current = snap;
        saveDraft(true);
      }
    }, 8000);
    return () => clearInterval(handle);
  }, [draftPayload, user]);

  const publish = async () => {
    if (!title.trim()) { toast.error("Title required"); setStage(1); return; }
    if (!coverImage) { toast.error("Cover image required"); setStage(0); return; }
    setLoading(true);
    try {
      const payload = { ...draftPayload, status: "published", published_at: new Date().toISOString() };
      if (projectId) {
        const { error } = await supabase.from("projects").update(payload).eq("id", projectId);
        if (error) throw error;
        toast.success("Project published!");
        nav({ to: "/projects/$id", params: { id: projectId } });
      } else {
        const { data, error } = await supabase.from("projects")
          .insert({ ...payload, user_id: user!.id }).select().single();
        if (error) throw error;
        toast.success("Project published!");
        nav({ to: "/projects/$id", params: { id: data.id } });
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;
    if (file.size > 8 * 1024 * 1024) { toast.error("Max 8MB"); return null; }
    const path = `${user.id}/projects/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "")}`;
    const { error } = await supabase.storage.from("media").upload(path, file);
    if (error) { toast.error(error.message); return null; }
    return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  };

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

  return (
    <AppShell>
      {/* Top bar */}
      <div className="sticky top-14 z-30 -mx-4 px-4 py-3 mb-4 glass-strong border-b flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          {[
            { i: 0, label: "Cover" },
            { i: 1, label: "Details" },
            { i: 2, label: "Editor" },
            { i: 3, label: "Publish" },
          ].map((s) => (
            <button key={s.i} onClick={() => setStage(s.i as 0 | 1 | 2 | 3)}
              className={`px-3 py-1 rounded-full text-xs transition ${stage === s.i ? "gradient-bg text-white glow-soft" : "glass text-muted-foreground"}`}>
              {s.i + 1}. {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">{savingMsg}</span>
          <button onClick={() => setPreview((v) => !v)} className="glass rounded-full p-2" title="Preview">
            <Eye className="h-4 w-4" />
          </button>
          <button onClick={() => saveDraft(false)} className="glass rounded-full px-3 py-1.5 text-xs flex items-center gap-1.5">
            <Save className="h-3.5 w-3.5" /> Draft
          </button>
          <button onClick={publish} disabled={loading}
            className="gradient-bg text-white rounded-full px-4 py-1.5 text-xs flex items-center gap-1.5 glow-soft disabled:opacity-60">
            <Send className="h-3.5 w-3.5" /> {loading ? "…" : "Publish"}
          </button>
        </div>
      </div>

      {preview ? (
        <PreviewPane
          coverImage={coverImage} title={title} tagline={tagline}
          difficulty={difficulty} buildCost={buildCost} buildTime={buildTime}
          tags={tags} components={components} blocks={blocks} steps={steps}
        />
      ) : (
        <div className="max-w-3xl mx-auto">
          {stage === 0 && (
            <CoverStage coverImage={coverImage} setCoverImage={setCoverImage}
              uploadImage={uploadImage} onNext={() => setStage(1)} />
          )}
          {stage === 1 && (
            <DetailsStage
              title={title} setTitle={setTitle}
              tagline={tagline} setTagline={setTagline}
              difficulty={difficulty} setDifficulty={setDifficulty}
              buildCost={buildCost} setBuildCost={setBuildCost}
              buildTime={buildTime} setBuildTime={setBuildTime}
              category={category} setCategory={setCategory}
              tags={tags} setTags={setTags} tagInput={tagInput} setTagInput={setTagInput}
              components={components} setComponents={setComponents}
              onBack={() => setStage(0)} onNext={() => setStage(2)}
            />
          )}
          {stage === 2 && (
            <EditorStage blocks={blocks} setBlocks={setBlocks}
              steps={steps} setSteps={setSteps} uploadImage={uploadImage}
              onBack={() => setStage(1)} onNext={() => setStage(3)} />
          )}
          {stage === 3 && (
            <PublishStage onBack={() => setStage(2)} onPublish={publish} loading={loading}
              valid={!!title.trim() && !!coverImage} />
          )}
        </div>
      )}
    </AppShell>
  );
}

/* ---------- Stage 0: cover ---------- */
function CoverStage({ coverImage, setCoverImage, uploadImage, onNext }: any) {
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const onFile = async (file: File) => {
    setBusy(true);
    const url = await uploadImage(file);
    if (url) setCoverImage(url);
    setBusy(false);
  };
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Start with a cover image</h1>
        <p className="text-muted-foreground text-sm mt-1">A great cover makes your project stand out.</p>
      </div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault(); setDrag(false);
          const f = e.dataTransfer.files?.[0]; if (f) onFile(f);
        }}
        className={`relative rounded-3xl overflow-hidden transition ${drag ? "glow" : ""}`}
      >
        {coverImage ? (
          <div className="relative">
            <img src={coverImage} className="w-full aspect-video object-cover" />
            <button onClick={() => setCoverImage(null)} className="absolute top-3 right-3 glass-strong rounded-full p-2">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="block cursor-pointer">
            <div className={`aspect-video glass-strong grid place-items-center border-2 border-dashed ${drag ? "border-primary" : "border-white/10"}`}>
              <div className="text-center px-6">
                <div className="h-16 w-16 mx-auto rounded-2xl gradient-bg grid place-items-center glow-soft">
                  <Upload className="h-7 w-7 text-white" />
                </div>
                <p className="mt-4 font-medium">Drag & drop your cover image</p>
                <p className="text-sm text-muted-foreground">or click to browse · PNG, JPG, WebP up to 8MB</p>
                {busy && <p className="text-xs text-primary mt-2">Uploading…</p>}
              </div>
            </div>
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>
        )}
      </div>
      <div className="flex justify-end">
        <button onClick={onNext} disabled={!coverImage}
          className="gradient-bg text-white rounded-full px-6 py-2.5 flex items-center gap-2 glow-soft disabled:opacity-50">
          Continue <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ---------- Stage 1: details ---------- */
function DetailsStage(p: any) {
  const addTag = () => {
    const t = p.tagInput.trim().replace(/^#/, "");
    if (t && !p.tags.includes(t)) p.setTags([...p.tags, t]);
    p.setTagInput("");
  };
  const updateComp = (i: number, patch: Partial<Component>) => {
    const next = [...p.components]; next[i] = { ...next[i], ...patch }; p.setComponents(next);
  };
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Project basics</h1>
      <div className="space-y-3">
        <input value={p.title} onChange={(e) => p.setTitle(e.target.value)} placeholder="Project title"
          maxLength={120}
          className="w-full glass-strong rounded-xl px-4 py-3 text-xl font-bold outline-none focus:ring-2 focus:ring-primary" />
        <input value={p.tagline} onChange={(e) => p.setTagline(e.target.value)} placeholder="Short tagline (one-liner)"
          maxLength={160}
          className="w-full glass-strong rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Difficulty">
          <select value={p.difficulty} onChange={(e) => p.setDifficulty(e.target.value)}
            className="w-full glass rounded-lg px-3 py-2 outline-none">
            {["Beginner", "Intermediate", "Advanced", "Expert"].map((x) => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Category">
          <select value={p.category} onChange={(e) => p.setCategory(e.target.value)}
            className="w-full glass rounded-lg px-3 py-2 outline-none">
            {["Arduino", "ESP32", "Raspberry Pi", "Robotics", "IoT", "AI Hardware", "PCB", "Other"].map((x) => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Est. cost">
          <input value={p.buildCost} onChange={(e) => p.setBuildCost(e.target.value)} placeholder="$25"
            className="w-full glass rounded-lg px-3 py-2 outline-none" />
        </Field>
        <Field label="Build time">
          <input value={p.buildTime} onChange={(e) => p.setBuildTime(e.target.value)} placeholder="2 hours"
            className="w-full glass rounded-lg px-3 py-2 outline-none" />
        </Field>
      </div>

      <Field label="Tags">
        <div className="glass rounded-xl p-2 flex flex-wrap gap-2 items-center">
          {p.tags.map((t: string) => (
            <span key={t} className="rounded-full gradient-bg text-white text-xs px-3 py-1 flex items-center gap-1">
              #{t}
              <button onClick={() => p.setTags(p.tags.filter((x: string) => x !== t))}><X className="h-3 w-3" /></button>
            </span>
          ))}
          <input value={p.tagInput} onChange={(e) => p.setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
            placeholder="add tag…"
            className="flex-1 min-w-32 bg-transparent outline-none px-2 py-1 text-sm" />
        </div>
      </Field>

      <Field label="Components used">
        <div className="space-y-2">
          {p.components.map((c: Component, i: number) => (
            <div key={i} className="glass rounded-xl p-2 grid grid-cols-12 gap-2 items-center">
              <input value={c.name} onChange={(e) => updateComp(i, { name: e.target.value })} placeholder="Name (e.g. Arduino Uno)"
                className="col-span-5 bg-transparent outline-none px-2 py-1.5 text-sm" />
              <input value={c.quantity} onChange={(e) => updateComp(i, { quantity: e.target.value })} placeholder="Qty"
                className="col-span-2 bg-transparent outline-none px-2 py-1.5 text-sm" />
              <input value={c.link ?? ""} onChange={(e) => updateComp(i, { link: e.target.value })} placeholder="Link (optional)"
                className="col-span-4 bg-transparent outline-none px-2 py-1.5 text-sm" />
              <button onClick={() => p.setComponents(p.components.filter((_: any, j: number) => j !== i))}
                className="col-span-1 text-destructive p-1"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <button onClick={() => p.setComponents([...p.components, { name: "", quantity: "1" }])}
            className="glass rounded-full px-3 py-1.5 text-xs flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add component
          </button>
        </div>
      </Field>

      <div className="flex justify-between">
        <button onClick={p.onBack} className="glass rounded-full px-4 py-2 flex items-center gap-2">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <button onClick={p.onNext} disabled={!p.title.trim()}
          className="gradient-bg text-white rounded-full px-6 py-2 flex items-center gap-2 glow-soft disabled:opacity-50">
          Continue <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">{label}</div>
      {children}
    </label>
  );
}

/* ---------- Stage 2: editor ---------- */
function EditorStage({ blocks, setBlocks, steps, setSteps, uploadImage, onBack, onNext }: any) {
  const addBlock = (type: Block["type"]) => {
    const base: any = { id: uid(), type };
    if (type === "list") base.items = [""];
    else if (type === "code") { base.code = ""; base.language = "cpp"; }
    else if (type === "image" || type === "youtube") base.url = "";
    else base.text = "";
    setBlocks([...blocks, base]);
  };
  const updateBlock = (id: string, patch: any) =>
    setBlocks(blocks.map((b: Block) => (b.id === id ? { ...b, ...patch } : b)));
  const removeBlock = (id: string) => setBlocks(blocks.filter((b: Block) => b.id !== id));
  const moveBlock = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= blocks.length) return;
    const next = [...blocks]; [next[i], next[j]] = [next[j], next[i]]; setBlocks(next);
  };

  return (
    <div className="space-y-6">
      {/* Content blocks */}
      <section>
        <h2 className="text-xl font-bold mb-3">Tutorial content</h2>
        <div className="space-y-3">
          {blocks.map((b: Block, i: number) => (
            <BlockEditor key={b.id} block={b} index={i} total={blocks.length}
              onChange={(patch: any) => updateBlock(b.id, patch)}
              onRemove={() => removeBlock(b.id)}
              onMove={(d: -1 | 1) => moveBlock(i, d)}
              uploadImage={uploadImage} />
          ))}
          {blocks.length === 0 && (
            <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
              Add your first block below to start writing.
            </div>
          )}
        </div>
        <BlockToolbar onAdd={addBlock} />
      </section>

      {/* Build steps */}
      <section>
        <h2 className="text-xl font-bold mb-3">Build steps</h2>
        <div className="space-y-3">
          {steps.map((s: Step, i: number) => (
            <StepEditor key={s.id} step={s} index={i} total={steps.length}
              uploadImage={uploadImage}
              onChange={(patch: any) => setSteps(steps.map((x: Step) => x.id === s.id ? { ...x, ...patch } : x))}
              onRemove={() => setSteps(steps.filter((x: Step) => x.id !== s.id))}
              onMove={(d: -1 | 1) => {
                const j = i + d; if (j < 0 || j >= steps.length) return;
                const next = [...steps]; [next[i], next[j]] = [next[j], next[i]]; setSteps(next);
              }} />
          ))}
          <button onClick={() => setSteps([...steps, { id: uid(), title: "", description: "", images: [], notes: "" }])}
            className="glass rounded-full px-3 py-1.5 text-sm flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Add step
          </button>
        </div>
      </section>

      <div className="flex justify-between">
        <button onClick={onBack} className="glass rounded-full px-4 py-2 flex items-center gap-2">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <button onClick={onNext} className="gradient-bg text-white rounded-full px-6 py-2 flex items-center gap-2 glow-soft">
          Continue <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function BlockToolbar({ onAdd }: { onAdd: (t: Block["type"]) => void }) {
  const items: { t: Block["type"]; icon: any; label: string }[] = [
    { t: "heading", icon: Heading1, label: "Heading" },
    { t: "paragraph", icon: Type, label: "Text" },
    { t: "list", icon: List, label: "List" },
    { t: "tip", icon: Lightbulb, label: "Tip" },
    { t: "warning", icon: AlertTriangle, label: "Warning" },
    { t: "info", icon: Info, label: "Info" },
    { t: "image", icon: ImageIcon, label: "Image" },
    { t: "youtube", icon: Youtube, label: "YouTube" },
    { t: "code", icon: CodeIcon, label: "Code" },
  ];
  return (
    <div className="mt-3 glass-strong rounded-2xl p-2 flex flex-wrap gap-1.5 sticky bottom-4">
      {items.map(({ t, icon: Icon, label }) => (
        <button key={t} onClick={() => onAdd(t)}
          className="rounded-xl px-3 py-2 text-xs hover:bg-primary/20 transition flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" /> {label}
        </button>
      ))}
    </div>
  );
}

function BlockEditor({ block, index, total, onChange, onRemove, onMove, uploadImage }: any) {
  const wrap = "glass rounded-2xl p-3 relative group";
  const handle = (
    <div className="absolute -left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition flex flex-col">
      <button onClick={() => onMove(-1)} disabled={index === 0} className="p-0.5 disabled:opacity-30"><ChevronLeft className="h-3 w-3 rotate-90" /></button>
      <GripVertical className="h-3 w-3 text-muted-foreground" />
      <button onClick={() => onMove(1)} disabled={index === total - 1} className="p-0.5 disabled:opacity-30"><ChevronRight className="h-3 w-3 rotate-90" /></button>
    </div>
  );
  const del = (
    <button onClick={onRemove}
      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-destructive p-1 transition">
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
  const onImagePick = async (file: File) => {
    const url = await uploadImage(file); if (url) onChange({ url });
  };

  switch (block.type) {
    case "heading":
      return (
        <div className={wrap}>{handle}{del}
          <input value={block.text} onChange={(e) => onChange({ text: e.target.value })} placeholder="Heading…"
            className="w-full bg-transparent outline-none text-2xl font-bold" />
        </div>
      );
    case "paragraph":
      return (
        <div className={wrap}>{handle}{del}
          <textarea value={block.text} onChange={(e) => onChange({ text: e.target.value })} placeholder="Write here…" rows={3}
            className="w-full bg-transparent outline-none resize-none leading-relaxed" />
        </div>
      );
    case "list":
      return (
        <div className={wrap}>{handle}{del}
          <div className="space-y-1.5">
            {block.items.map((it: string, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-primary">•</span>
                <input value={it}
                  onChange={(e) => { const items = [...block.items]; items[i] = e.target.value; onChange({ items }); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); onChange({ items: [...block.items, ""] }); }
                    if (e.key === "Backspace" && !it && block.items.length > 1) {
                      e.preventDefault(); onChange({ items: block.items.filter((_: any, j: number) => j !== i) });
                    }
                  }}
                  placeholder="List item…" className="flex-1 bg-transparent outline-none" />
              </div>
            ))}
          </div>
        </div>
      );
    case "tip":
    case "warning":
    case "info": {
      const styles = {
        tip: { ring: "border-l-4 border-green-500/60", icon: Lightbulb, label: "Tip" },
        warning: { ring: "border-l-4 border-yellow-500/60", icon: AlertTriangle, label: "Warning" },
        info: { ring: "border-l-4 border-blue-500/60", icon: Info, label: "Info" },
      }[block.type as "tip" | "warning" | "info"];
      const Icon = styles.icon;
      return (
        <div className={`${wrap} ${styles.ring}`}>{handle}{del}
          <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Icon className="h-3.5 w-3.5" /> {styles.label}
          </div>
          <textarea value={block.text} onChange={(e) => onChange({ text: e.target.value })} placeholder={`Add a ${styles.label.toLowerCase()}…`} rows={2}
            className="w-full bg-transparent outline-none resize-none" />
        </div>
      );
    }
    case "image":
      return (
        <div className={wrap}>{handle}{del}
          {block.url ? (
            <img src={block.url} className="w-full rounded-xl" />
          ) : (
            <label className="block aspect-video rounded-xl border-2 border-dashed border-white/10 grid place-items-center cursor-pointer hover:border-primary">
              <div className="text-center text-muted-foreground text-sm">
                <ImageIcon className="h-6 w-6 mx-auto mb-1" /> Click to upload image
              </div>
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && onImagePick(e.target.files[0])} />
            </label>
          )}
          <input value={block.caption ?? ""} onChange={(e) => onChange({ caption: e.target.value })} placeholder="Caption (optional)"
            className="w-full mt-2 bg-transparent outline-none text-sm text-muted-foreground" />
        </div>
      );
    case "youtube":
      return (
        <div className={wrap}>{handle}{del}
          <input value={block.url} onChange={(e) => onChange({ url: e.target.value })} placeholder="Paste YouTube URL"
            className="w-full glass rounded-lg px-3 py-2 outline-none text-sm" />
          {ytId(block.url) && (
            <div className="mt-2 aspect-video rounded-xl overflow-hidden">
              <iframe src={`https://www.youtube.com/embed/${ytId(block.url)}`} className="w-full h-full" allowFullScreen />
            </div>
          )}
        </div>
      );
    case "code":
      return (
        <div className={wrap}>{handle}{del}
          <div className="flex items-center justify-between mb-2">
            <select value={block.language} onChange={(e) => onChange({ language: e.target.value })}
              className="glass rounded-lg px-2 py-1 text-xs outline-none">
              {["cpp", "arduino", "python", "javascript", "json", "bash"].map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <textarea value={block.code} onChange={(e) => onChange({ code: e.target.value })}
            placeholder="// your code here" rows={8}
            className="w-full bg-[oklch(0.10_0.04_270)]/80 rounded-lg px-3 py-2 outline-none font-mono text-sm resize-y" />
        </div>
      );
  }
}

function StepEditor({ step, index, total, onChange, onRemove, onMove, uploadImage }: any) {
  const addImage = async (file: File) => {
    const url = await uploadImage(file); if (url) onChange({ images: [...step.images, url] });
  };
  return (
    <div className="glass-strong rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-full gradient-bg text-white grid place-items-center text-sm font-bold">{index + 1}</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Step</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onMove(-1)} disabled={index === 0} className="glass rounded-full p-1 disabled:opacity-30"><ChevronLeft className="h-3.5 w-3.5 rotate-90" /></button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} className="glass rounded-full p-1 disabled:opacity-30"><ChevronRight className="h-3.5 w-3.5 rotate-90" /></button>
          <button onClick={onRemove} className="glass rounded-full p-1 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <input value={step.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="Step title"
        className="w-full bg-transparent outline-none text-lg font-bold" />
      <textarea value={step.description} onChange={(e) => onChange({ description: e.target.value })} placeholder="What to do in this step…" rows={3}
        className="w-full bg-transparent outline-none resize-none" />
      {step.images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {step.images.map((u: string, i: number) => (
            <div key={i} className="relative group">
              <img src={u} className="w-full aspect-video object-cover rounded-lg" />
              <button onClick={() => onChange({ images: step.images.filter((_: any, j: number) => j !== i) })}
                className="absolute top-1 right-1 glass-strong rounded-full p-1 opacity-0 group-hover:opacity-100">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <label className="glass rounded-full px-3 py-1.5 text-xs cursor-pointer flex items-center gap-1.5">
          <ImageIcon className="h-3.5 w-3.5" /> Add image
          <input type="file" accept="image/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && addImage(e.target.files[0])} />
        </label>
      </div>
      <textarea value={step.notes} onChange={(e) => onChange({ notes: e.target.value })} placeholder="Notes / tips / troubleshooting (optional)" rows={2}
        className="w-full glass rounded-lg px-3 py-2 outline-none resize-none text-sm" />
      <textarea value={step.code ?? ""} onChange={(e) => onChange({ code: e.target.value })} placeholder="Code snippet (optional)" rows={3}
        className="w-full bg-[oklch(0.10_0.04_270)]/80 rounded-lg px-3 py-2 outline-none font-mono text-xs resize-y" />
    </div>
  );
}

/* ---------- Stage 3: publish ---------- */
function PublishStage({ onBack, onPublish, loading, valid }: any) {
  return (
    <div className="glass-strong rounded-3xl p-8 text-center space-y-4">
      <div className="h-16 w-16 mx-auto rounded-2xl gradient-bg grid place-items-center glow">
        <Send className="h-7 w-7 text-white" />
      </div>
      <h2 className="text-2xl font-bold">Ready to publish?</h2>
      <p className="text-muted-foreground text-sm max-w-md mx-auto">Your project will be visible to the entire community. You can edit it anytime.</p>
      {!valid && <p className="text-sm text-destructive">Title and cover image are required.</p>}
      <div className="flex justify-center gap-2 pt-2">
        <button onClick={onBack} className="glass rounded-full px-5 py-2.5">Keep editing</button>
        <button onClick={onPublish} disabled={loading || !valid}
          className="gradient-bg text-white rounded-full px-6 py-2.5 flex items-center gap-2 glow-soft disabled:opacity-50">
          <Send className="h-4 w-4" /> {loading ? "Publishing…" : "Publish project"}
        </button>
      </div>
    </div>
  );
}

/* ---------- Live preview ---------- */
function PreviewPane({ coverImage, title, tagline, difficulty, buildCost, buildTime, tags, components, blocks, steps }: any) {
  return (
    <article className="max-w-3xl mx-auto space-y-6">
      {coverImage && <img src={coverImage} className="w-full aspect-video object-cover rounded-3xl glow-soft" />}
      <div>
        <h1 className="text-3xl md:text-5xl font-bold">{title || "Untitled"}</h1>
        {tagline && <p className="mt-2 text-lg text-muted-foreground">{tagline}</p>}
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {difficulty && <span className="glass rounded-full px-3 py-1">⚙ {difficulty}</span>}
        {buildCost && <span className="glass rounded-full px-3 py-1">💰 {buildCost}</span>}
        {buildTime && <span className="glass rounded-full px-3 py-1">⏱ {buildTime}</span>}
        {tags.map((t: string) => <span key={t} className="glass rounded-full px-3 py-1">#{t}</span>)}
      </div>
      <ProjectBody blocks={blocks} components={components} steps={steps} />
    </article>
  );
}

export function ProjectBody({ blocks, components, steps }: { blocks: Block[]; components: Component[]; steps: Step[] }) {
  return (
    <>
      {components.length > 0 && (
        <section className="glass-strong rounded-2xl p-5">
          <h3 className="text-lg font-bold mb-3">Components</h3>
          <div className="space-y-2">
            {components.map((c, i) => (
              <div key={i} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0">
                <div>
                  <span className="font-medium">{c.name || "Untitled"}</span>
                  <span className="text-muted-foreground text-sm ml-2">× {c.quantity || 1}</span>
                </div>
                {c.link && <a href={c.link} target="_blank" rel="noopener noreferrer" className="text-primary text-sm">Buy →</a>}
              </div>
            ))}
          </div>
        </section>
      )}

      {blocks.map((b) => <RenderedBlock key={b.id} block={b} />)}

      {steps.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-2xl font-bold">Step-by-step build</h3>
          {steps.map((s, i) => (
            <div key={s.id} className="glass-strong rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="h-9 w-9 rounded-full gradient-bg text-white grid place-items-center font-bold glow-soft">{i + 1}</span>
                <h4 className="text-xl font-bold">{s.title || `Step ${i + 1}`}</h4>
              </div>
              {s.description && <p className="whitespace-pre-wrap leading-relaxed">{s.description}</p>}
              {s.images.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {s.images.map((u, j) => <img key={j} src={u} className="w-full aspect-video object-cover rounded-lg" />)}
                </div>
              )}
              {s.notes && <div className="border-l-4 border-primary/60 pl-3 text-sm text-muted-foreground italic">{s.notes}</div>}
              {s.code && <CodeBlock code={s.code} language="cpp" />}
            </div>
          ))}
        </section>
      )}
    </>
  );
}

function RenderedBlock({ block }: { block: Block }) {
  switch (block.type) {
    case "heading": return <h2 className="text-2xl md:text-3xl font-bold mt-6">{block.text}</h2>;
    case "paragraph": return <p className="leading-relaxed whitespace-pre-wrap">{block.text}</p>;
    case "list":
      return <ul className="space-y-1.5 list-disc pl-5">{block.items.map((it, i) => <li key={i}>{it}</li>)}</ul>;
    case "tip":
    case "warning":
    case "info": {
      const styles = {
        tip: { border: "border-green-500/60", bg: "bg-green-500/10", icon: Lightbulb, label: "Tip" },
        warning: { border: "border-yellow-500/60", bg: "bg-yellow-500/10", icon: AlertTriangle, label: "Warning" },
        info: { border: "border-blue-500/60", bg: "bg-blue-500/10", icon: Info, label: "Info" },
      }[block.type];
      const Icon = styles.icon;
      return (
        <div className={`rounded-2xl p-4 border-l-4 ${styles.border} ${styles.bg} flex gap-3`}>
          <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div><div className="font-bold text-sm uppercase tracking-wider mb-1">{styles.label}</div><div className="whitespace-pre-wrap">{block.text}</div></div>
        </div>
      );
    }
    case "image":
      return block.url ? (
        <figure>
          <img src={block.url} className="w-full rounded-2xl" />
          {block.caption && <figcaption className="text-center text-sm text-muted-foreground mt-2">{block.caption}</figcaption>}
        </figure>
      ) : null;
    case "youtube": {
      const id = ytId(block.url);
      return id ? (
        <div className="aspect-video rounded-2xl overflow-hidden">
          <iframe src={`https://www.youtube.com/embed/${id}`} className="w-full h-full" allowFullScreen />
        </div>
      ) : null;
    }
    case "code": return <CodeBlock code={block.code} language={block.language} />;
  }
}

function ytId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}
