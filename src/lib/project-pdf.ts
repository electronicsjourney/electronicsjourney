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

// Brand palette (RGB)
const C = {
  ink: [22, 22, 28] as [number, number, number],
  body: [55, 60, 72] as [number, number, number],
  mute: [120, 124, 138] as [number, number, number],
  line: [225, 228, 235] as [number, number, number],
  panel: [246, 247, 250] as [number, number, number],
  brand: [88, 80, 236] as [number, number, number], // indigo/violet
  brandSoft: [232, 230, 252] as [number, number, number],
  codeBg: [24, 26, 38] as [number, number, number],
  codeFg: [232, 234, 245] as [number, number, number],
  tip: [16, 122, 92] as [number, number, number],
  warn: [200, 110, 20] as [number, number, number],
  info: [40, 100, 200] as [number, number, number],
};

async function fetchImage(url: string): Promise<{ data: string; w: number; h: number; fmt: "JPEG" | "PNG" } | null> {
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
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  // Fix jsPDF gappy-text bug
  (doc as any).setCharSpace?.(0);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = margin;
  let pageIndex = 0;

  const setFont = (weight: "normal" | "bold" | "italic" = "normal", family: "helvetica" | "courier" | "times" = "helvetica") => {
    doc.setFont(family, weight);
  };
  const setColor = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
  const setDraw = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);

  // Header / footer painted after content per page
  const paintChrome = () => {
    const total = doc.getNumberOfPages();
    for (let p = 2; p <= total; p++) {
      doc.setPage(p);
      // top bar
      setFill(C.brand);
      doc.rect(0, 0, pageW, 4, "F");
      // title strip
      setFont("bold");
      doc.setFontSize(9);
      setColor(C.ink);
      doc.text((project.title || "Project").toUpperCase(), margin, 22);
      setFont("normal");
      setColor(C.mute);
      doc.text(`Page ${p - 1} of ${total - 1}`, pageW - margin, 22, { align: "right" });
      // divider
      setDraw(C.line);
      doc.setLineWidth(0.5);
      doc.line(margin, 30, pageW - margin, 30);
      // footer
      setColor(C.mute);
      doc.setFontSize(8);
      setFont("normal");
      doc.text(project.profiles?.username ? `electronicsjourney.lovable.app  •  @${project.profiles.username}` : "electronicsjourney.lovable.app", margin, pageH - 22);
      doc.text(new Date().toLocaleDateString(), pageW - margin, pageH - 22, { align: "right" });
    }
  };

  const newPage = () => {
    doc.addPage();
    pageIndex++;
    y = 56; // below header
  };

  const ensure = (need: number) => {
    if (y + need > pageH - 50) newPage();
  };

  const addImage = async (url: string, maxH = 260, opts: { rounded?: boolean } = {}) => {
    const img = await fetchImage(url);
    if (!img) return;
    const ratio = img.w / img.h;
    let w = contentW;
    let h = w / ratio;
    if (h > maxH) { h = maxH; w = h * ratio; }
    ensure(h + 12);
    const x = margin + (contentW - w) / 2;
    if (opts.rounded) {
      // subtle frame
      setDraw(C.line);
      doc.setLineWidth(0.75);
      doc.roundedRect(x - 2, y - 2, w + 4, h + 4, 6, 6, "S");
    }
    doc.addImage(img.data, img.fmt, x, y, w, h, undefined, "FAST");
    y += h + 14;
  };

  const wrap = (text: string, size: number, weight: "normal" | "bold" = "normal") => {
    setFont(weight);
    doc.setFontSize(size);
    return doc.splitTextToSize(text || "", contentW) as string[];
  };

  const writeLines = (lines: string[], size: number, lineGap = 4, color: [number, number, number] = C.body, weight: "normal" | "bold" = "normal") => {
    setFont(weight);
    doc.setFontSize(size);
    setColor(color);
    const lh = size * 1.35;
    for (const ln of lines) {
      ensure(lh);
      doc.text(ln, margin, y + size);
      y += lh;
    }
    y += lineGap;
  };

  const sectionHeader = (text: string) => {
    ensure(46);
    y += 8;
    // accent bar
    setFill(C.brand);
    doc.rect(margin, y, 4, 22, "F");
    setFont("bold");
    doc.setFontSize(18);
    setColor(C.ink);
    doc.text(text, margin + 14, y + 17);
    y += 34;
  };

  const subHeader = (text: string) => {
    ensure(28);
    y += 4;
    setFont("bold");
    doc.setFontSize(13);
    setColor(C.ink);
    doc.text(text, margin, y + 12);
    y += 22;
  };

  // ── COVER PAGE ───────────────────────────────────────────────
  // full-bleed cover image with gradient-ish overlay band, then title block below
  if (project.cover_image) {
    const img = await fetchImage(project.cover_image);
    if (img) {
      const coverH = 360;
      const ratio = img.w / img.h;
      let cw = pageW;
      let ch = cw / ratio;
      if (ch < coverH) { ch = coverH; cw = ch * ratio; }
      if (ch > coverH) ch = coverH;
      const cx = (pageW - cw) / 2;
      doc.addImage(img.data, img.fmt, cx, 0, cw, ch, undefined, "FAST");
      // dark gradient band at bottom (simulated with stacked rects)
      for (let i = 0; i < 60; i++) {
        const alpha = i / 60;
        doc.setFillColor(15, 15, 25);
        (doc as any).setGState?.(new (doc as any).GState({ opacity: alpha * 0.85 }));
        doc.rect(0, ch - 60 + i, pageW, 1, "F");
      }
      (doc as any).setGState?.(new (doc as any).GState({ opacity: 1 }));
    }
  } else {
    // solid brand cover
    setFill(C.brand);
    doc.rect(0, 0, pageW, 360, "F");
  }

  // brand pill
  y = 400;
  setFill(C.brandSoft);
  doc.roundedRect(margin, y, 110, 22, 11, 11, "F");
  setFont("bold");
  doc.setFontSize(9);
  setColor(C.brand);
  doc.text("PROJECT GUIDE", margin + 14, y + 15);
  y += 38;

  // big title
  setFont("bold");
  doc.setFontSize(32);
  setColor(C.ink);
  const titleLines = doc.splitTextToSize(project.title || "Untitled Project", contentW) as string[];
  for (const ln of titleLines.slice(0, 3)) {
    doc.text(ln, margin, y + 28);
    y += 36;
  }

  if (project.tagline) {
    y += 6;
    setFont("normal");
    doc.setFontSize(13);
    setColor(C.mute);
    const tg = doc.splitTextToSize(project.tagline, contentW) as string[];
    for (const ln of tg.slice(0, 3)) { doc.text(ln, margin, y + 14); y += 20; }
  }

  // meta card
  y = Math.max(y + 16, pageH - 230);
  setFill(C.panel);
  doc.roundedRect(margin, y, contentW, 110, 10, 10, "F");
  setDraw(C.line);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentW, 110, 10, 10, "S");

  const metaCells = [
    ["Difficulty", project.difficulty || "—"],
    ["Category", project.category || "—"],
    ["Build cost", project.build_cost || "—"],
    ["Build time", project.build_time || "—"],
  ];
  const colW = contentW / metaCells.length;
  metaCells.forEach(([label, value], i) => {
    const cx = margin + i * colW + 16;
    setFont("normal");
    doc.setFontSize(8);
    setColor(C.mute);
    doc.text(label.toUpperCase(), cx, y + 26);
    setFont("bold");
    doc.setFontSize(12);
    setColor(C.ink);
    const v = doc.splitTextToSize(String(value), colW - 24) as string[];
    doc.text(v[0] || "—", cx, y + 46);
  });

  // author row inside card
  setDraw(C.line);
  doc.line(margin + 16, y + 64, margin + contentW - 16, y + 64);
  setFont("normal");
  doc.setFontSize(9);
  setColor(C.mute);
  doc.text("AUTHOR", margin + 16, y + 80);
  setFont("bold");
  doc.setFontSize(11);
  setColor(C.ink);
  const author = project.profiles?.display_name || project.profiles?.username || "Unknown";
  doc.text(`${author}${project.profiles?.username ? `  ·  @${project.profiles.username}` : ""}`, margin + 16, y + 96);

  // tags right side
  if (project.tags?.length) {
    const tagsText = project.tags.slice(0, 6).map((t: string) => `#${t}`).join("  ");
    setFont("normal");
    doc.setFontSize(9);
    setColor(C.brand);
    doc.text(tagsText, margin + contentW - 16, y + 96, { align: "right" });
  }

  // ── CONTENT PAGES ────────────────────────────────────────────
  newPage();

  // Overview / description
  if (project.tagline) {
    sectionHeader("Overview");
    writeLines(wrap(project.tagline, 11), 11, 10, C.body);
  }

  // Components
  const components: Component[] = project.components ?? [];
  if (components.length) {
    sectionHeader("Components & Materials");
    // table
    const rowH = 24;
    const headerH = 22;
    ensure(headerH + rowH + 8);
    // header
    setFill(C.ink);
    doc.rect(margin, y, contentW, headerH, "F");
    setFont("bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("COMPONENT", margin + 12, y + 15);
    doc.text("QTY", margin + contentW * 0.62, y + 15);
    doc.text("LINK", margin + contentW * 0.74, y + 15);
    y += headerH;

    components.forEach((c, i) => {
      ensure(rowH);
      if (i % 2 === 0) {
        setFill(C.panel);
        doc.rect(margin, y, contentW, rowH, "F");
      }
      setFont("normal");
      doc.setFontSize(10);
      setColor(C.ink);
      const name = doc.splitTextToSize(c.name || "Untitled", contentW * 0.58) as string[];
      doc.text(name[0], margin + 12, y + 16);
      setColor(C.body);
      doc.text(`× ${c.quantity || 1}`, margin + contentW * 0.62, y + 16);
      if (c.link) {
        setColor(C.brand);
        const linkLabel = c.link.length > 38 ? c.link.slice(0, 38) + "…" : c.link;
        doc.textWithLink(linkLabel, margin + contentW * 0.74, y + 16, { url: c.link });
      } else {
        setColor(C.mute);
        doc.text("—", margin + contentW * 0.74, y + 16);
      }
      y += rowH;
    });
    // border
    setDraw(C.line);
    doc.setLineWidth(0.5);
    doc.rect(margin, y - rowH * components.length - headerH, contentW, headerH + rowH * components.length, "S");
    y += 10;
  }

  // Content blocks
  const blocks: Block[] = project.content_blocks ?? [];
  if (blocks.length) {
    let hasIntroHeading = blocks.some((b) => b.type === "heading");
    if (!hasIntroHeading) sectionHeader("Details");

    for (const b of blocks) {
      switch (b.type) {
        case "heading":
          sectionHeader(b.text);
          break;
        case "paragraph":
          writeLines(wrap(b.text, 11), 11, 8, C.body);
          break;
        case "list":
          for (const it of b.items) {
            const lines = wrap(`•  ${it}`, 11);
            writeLines(lines, 11, 2, C.body);
          }
          y += 6;
          break;
        case "tip":
        case "warning":
        case "info": {
          const color = b.type === "tip" ? C.tip : b.type === "warning" ? C.warn : C.info;
          const label = b.type === "tip" ? "TIP" : b.type === "warning" ? "WARNING" : "INFO";
          const lines = wrap(b.text, 10);
          const boxH = lines.length * 14 + 26;
          ensure(boxH + 6);
          setFill([color[0], color[1], color[2]]);
          doc.rect(margin, y, 3, boxH, "F");
          setFill(C.panel);
          doc.rect(margin + 3, y, contentW - 3, boxH, "F");
          setFont("bold");
          doc.setFontSize(8);
          setColor(color);
          doc.text(label, margin + 14, y + 16);
          setFont("normal");
          doc.setFontSize(10);
          setColor(C.body);
          let ly = y + 32;
          for (const ln of lines) { doc.text(ln, margin + 14, ly); ly += 14; }
          y += boxH + 8;
          break;
        }
        case "image":
          if (b.url) {
            await addImage(b.url, 280, { rounded: true });
            if (b.caption) {
              setFont("italic");
              doc.setFontSize(9);
              setColor(C.mute);
              const cap = doc.splitTextToSize(b.caption, contentW) as string[];
              for (const ln of cap) { ensure(12); doc.text(ln, margin, y + 10); y += 12; }
              y += 6;
            }
          }
          break;
        case "youtube":
          if (b.url) {
            ensure(36);
            setFill(C.brandSoft);
            doc.roundedRect(margin, y, contentW, 28, 6, 6, "F");
            setFont("bold");
            doc.setFontSize(9);
            setColor(C.brand);
            doc.text("▶  VIDEO", margin + 12, y + 18);
            setFont("normal");
            setColor(C.body);
            doc.textWithLink(b.url.length > 70 ? b.url.slice(0, 70) + "…" : b.url, margin + 70, y + 18, { url: b.url });
            y += 36;
          }
          break;
        case "code":
          await drawCode(doc, b.code ?? "", { margin, contentW, pageH, y, setState: (ny) => (y = ny), ensure, newPage });
          break;
      }
    }
  }

  // Steps
  const steps: Step[] = project.steps ?? [];
  if (steps.length) {
    sectionHeader("Step-by-step Build");
    let i = 1;
    for (const s of steps) {
      ensure(60);
      // numbered badge
      setFill(C.brand);
      doc.circle(margin + 12, y + 12, 12, "F");
      setFont("bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text(String(i), margin + 12, y + 16, { align: "center" });
      // step title
      setFont("bold");
      doc.setFontSize(14);
      setColor(C.ink);
      const tl = doc.splitTextToSize(s.title || `Step ${i}`, contentW - 40) as string[];
      doc.text(tl[0], margin + 32, y + 16);
      // small label
      setFont("normal");
      doc.setFontSize(8);
      setColor(C.mute);
      doc.text(`STEP ${i} OF ${steps.length}`, margin + 32, y + 30);
      y += 42;

      if (s.description) {
        writeLines(wrap(s.description, 11), 11, 6, C.body);
      }
      for (const url of s.images ?? []) await addImage(url, 240, { rounded: true });
      if (s.notes) {
        const lines = wrap(s.notes, 10);
        const boxH = lines.length * 14 + 24;
        ensure(boxH + 6);
        setFill(C.brandSoft);
        doc.roundedRect(margin, y, contentW, boxH, 6, 6, "F");
        setFont("bold");
        doc.setFontSize(8);
        setColor(C.brand);
        doc.text("NOTE", margin + 14, y + 16);
        setFont("normal");
        doc.setFontSize(10);
        setColor(C.body);
        let ly = y + 30;
        for (const ln of lines) { doc.text(ln, margin + 14, ly); ly += 14; }
        y += boxH + 8;
      }
      if (s.code) {
        await drawCode(doc, s.code, { margin, contentW, pageH, y, setState: (ny) => (y = ny), ensure, newPage });
      }
      // separator
      ensure(20);
      setDraw(C.line);
      doc.setLineWidth(0.5);
      doc.line(margin, y + 4, margin + contentW, y + 4);
      y += 18;
      i++;
    }
  }

  // If nothing was added beyond cover
  if (!blocks.length && !steps.length && !components.length && project.content) {
    sectionHeader("Details");
    writeLines(wrap(project.content, 11), 11, 8, C.body);
  }

  paintChrome();

  const safe = (project.title || "project").replace(/[^a-z0-9\-_ ]/gi, "").trim().slice(0, 60) || "project";
  doc.save(`${safe}.pdf`);
}

function toUrlSafeB64(s: string): string {
  try {
    const bytes = new TextEncoder().encode(s);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch {
    return "";
  }
}

function drawCode(
  doc: jsPDF,
  code: string,
  ctx: { margin: number; contentW: number; pageH: number; y: number; setState: (y: number) => void; ensure: (n: number) => void; newPage: () => void }
) {
  const pad = 12;
  const fontSize = 9;
  const lineH = 12;
  const headerH = 24;
  doc.setFont("courier", "normal");
  doc.setFontSize(fontSize);
  const allLines: string[] = [];
  for (const raw of code.split("\n")) {
    const wrapped = doc.splitTextToSize(raw || " ", ctx.contentW - pad * 2) as string[];
    allLines.push(...wrapped);
  }

  // Always send the user to the live published site so the copy link works
  // regardless of where the PDF was generated (preview vs prod). The FULL code
  // is encoded once and reused on every chunk of a multi-page block, so a
  // single tap copies the entire snippet — never just one page.
  const base = "https://electronicsjourney.lovable.app";
  const copyUrl = `${base}/copy#c=${toUrlSafeB64(code)}`;

  let idx = 0;
  let y = ctx.y;
  let first = true;
  while (idx < allLines.length) {
    const available = ctx.pageH - 50 - y - pad * 2 - headerH;
    const maxLines = Math.max(1, Math.floor(available / lineH));
    if (maxLines < 4 && idx === 0) {
      ctx.newPage();
      y = 56;
      continue;
    }
    const chunk = allLines.slice(idx, idx + maxLines);
    const boxH = chunk.length * lineH + pad * 2 + headerH;
    doc.setFillColor(C.codeBg[0], C.codeBg[1], C.codeBg[2]);
    doc.roundedRect(ctx.margin, y, ctx.contentW, boxH, 6, 6, "F");
    doc.setFillColor(255, 95, 86); doc.circle(ctx.margin + pad + 2, y + 12, 3, "F");
    doc.setFillColor(255, 189, 46); doc.circle(ctx.margin + pad + 12, y + 12, 3, "F");
    doc.setFillColor(39, 201, 63); doc.circle(ctx.margin + pad + 22, y + 12, 3, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(170, 175, 195);
    doc.text(first ? "CODE" : "CODE (cont.)", ctx.margin + pad + 36, y + 15);
    const pillLabel = "Copy code";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const pillW = doc.getTextWidth(pillLabel) + 18;
    const pillX = ctx.margin + ctx.contentW - pad - pillW;
    const pillY = y + 4;
    doc.setFillColor(C.brand[0], C.brand[1], C.brand[2]);
    doc.roundedRect(pillX, pillY, pillW, 16, 8, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.textWithLink(pillLabel, pillX + 9, pillY + 11, { url: copyUrl });
    (doc as any).link?.(pillX, pillY, pillW, 16, { url: copyUrl });

    doc.setTextColor(C.codeFg[0], C.codeFg[1], C.codeFg[2]);
    doc.setFont("courier", "normal");
    doc.setFontSize(fontSize);
    let ly = y + headerH + pad + fontSize - 2;
    for (const ln of chunk) {
      doc.text(ln, ctx.margin + pad, ly);
      ly += lineH;
    }
    y += boxH + 8;
    idx += chunk.length;
    first = false;
    if (idx < allLines.length) {
      ctx.newPage();
      y = 56;
    }
  }
  ctx.setState(y);
}
