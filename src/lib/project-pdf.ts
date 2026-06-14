import { jsPDF } from "jspdf";

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "tip" | "warning" | "info"; text: string }
  | { type: "image"; url: string; caption?: string }
  | { type: "youtube"; url: string }
  | { type: "code"; code: string; language?: string };

type Step = { title: string; description: string; images: string[]; notes?: string; code?: string };
type Component = { name: string; quantity: string; link?: string };

async function fetchImageAsDataURL(url: string): Promise<{ data: string; w: number; h: number; fmt: "JPEG" | "PNG" } | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    const data: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = reject;
      img.src = data;
    });
    const fmt = blob.type.includes("png") ? "PNG" : "JPEG";
    return { data, w: dims.w, h: dims.h, fmt };
  } catch {
    return null;
  }
}

export async function generateProjectPDF(project: any) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentW = pageW - margin * 2;
  let y = margin;

  const ensure = (need: number) => {
    if (y + need > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const addImage = async (url: string, maxH = 260) => {
    const img = await fetchImageAsDataURL(url);
    if (!img) return;
    const ratio = img.w / img.h;
    let w = contentW;
    let h = w / ratio;
    if (h > maxH) { h = maxH; w = h * ratio; }
    ensure(h + 10);
    doc.addImage(img.data, img.fmt, margin, y, w, h);
    y += h + 10;
  };

  const writeText = (text: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number } = {}) => {
    const size = opts.size ?? 11;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(opts.color ?? [30, 30, 30]));
    const lines = doc.splitTextToSize(text, contentW);
    for (const line of lines) {
      ensure(size + 4);
      doc.text(line, margin, y);
      y += size + 2;
    }
    y += opts.gap ?? 4;
  };

  // Cover
  if (project.cover_image) {
    await addImage(project.cover_image, 280);
  }

  writeText(project.title || "Untitled", { size: 22, bold: true, gap: 4 });
  if (project.tagline) writeText(project.tagline, { size: 12, color: [90, 90, 90], gap: 8 });

  // Meta
  const meta: string[] = [];
  if (project.difficulty) meta.push(`Difficulty: ${project.difficulty}`);
  if (project.category) meta.push(`Category: ${project.category}`);
  if (project.build_cost) meta.push(`Cost: ${project.build_cost}`);
  if (project.build_time) meta.push(`Time: ${project.build_time}`);
  if (project.profiles?.username) meta.push(`By @${project.profiles.username}`);
  if (meta.length) writeText(meta.join("  •  "), { size: 10, color: [110, 110, 110], gap: 6 });

  if (project.tags?.length) writeText(project.tags.map((t: string) => `#${t}`).join("  "), { size: 10, color: [80, 100, 200], gap: 10 });

  // Components
  const components: Component[] = project.components ?? [];
  if (components.length) {
    writeText("Components", { size: 16, bold: true, gap: 4 });
    for (const c of components) {
      const line = `• ${c.name || "Untitled"}  × ${c.quantity || 1}${c.link ? `   (${c.link})` : ""}`;
      writeText(line, { size: 11 });
    }
    y += 6;
  }

  // Content blocks
  const blocks: Block[] = project.content_blocks ?? [];
  for (const b of blocks) {
    switch (b.type) {
      case "heading": writeText(b.text, { size: 16, bold: true, gap: 4 }); break;
      case "paragraph": writeText(b.text, { size: 11, gap: 6 }); break;
      case "list":
        for (const it of b.items) writeText(`• ${it}`, { size: 11 });
        y += 4; break;
      case "tip":
      case "warning":
      case "info": {
        const label = b.type.toUpperCase();
        writeText(`${label}: ${b.text}`, { size: 11, bold: false, color: [60, 90, 150], gap: 6 });
        break;
      }
      case "image":
        if (b.url) {
          await addImage(b.url);
          if (b.caption) writeText(b.caption, { size: 9, color: [120, 120, 120], gap: 6 });
        }
        break;
      case "youtube":
        if (b.url) writeText(`Video: ${b.url}`, { size: 10, color: [80, 100, 200], gap: 4 });
        break;
      case "code":
        doc.setFont("courier", "normal");
        doc.setFontSize(9);
        doc.setTextColor(40, 40, 40);
        for (const line of (b.code ?? "").split("\n")) {
          const wrapped = doc.splitTextToSize(line || " ", contentW);
          for (const w of wrapped) { ensure(12); doc.text(w, margin, y); y += 11; }
        }
        y += 8;
        break;
    }
  }

  // Steps
  const steps: Step[] = project.steps ?? [];
  if (steps.length) {
    ensure(40);
    writeText("Step-by-step build", { size: 18, bold: true, gap: 6 });
    let i = 1;
    for (const s of steps) {
      writeText(`Step ${i}: ${s.title || ""}`, { size: 14, bold: true, gap: 4 });
      if (s.description) writeText(s.description, { size: 11, gap: 4 });
      for (const url of s.images ?? []) await addImage(url, 220);
      if (s.notes) writeText(`Note: ${s.notes}`, { size: 10, color: [110, 110, 110], gap: 4 });
      if (s.code) {
        doc.setFont("courier", "normal");
        doc.setFontSize(9);
        doc.setTextColor(40, 40, 40);
        for (const line of s.code.split("\n")) {
          const wrapped = doc.splitTextToSize(line || " ", contentW);
          for (const w of wrapped) { ensure(12); doc.text(w, margin, y); y += 11; }
        }
        y += 6;
      }
      y += 8;
      i++;
    }
  }

  // Footer page numbers
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`${p} / ${total}`, pageW - margin, pageH - 20, { align: "right" });
    doc.text(project.title || "Project", margin, pageH - 20);
  }

  const safe = (project.title || "project").replace(/[^a-z0-9\-_ ]/gi, "").trim().slice(0, 60) || "project";
  doc.save(`${safe}.pdf`);
}
