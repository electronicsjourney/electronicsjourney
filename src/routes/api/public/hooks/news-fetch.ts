import { createFileRoute } from "@tanstack/react-router";
import { FEEDS } from "@/lib/news/feeds";
import { parseFeed, type FeedItem } from "@/lib/news/parser";
import { classify } from "@/lib/news/categorize";
import { fallbackImage } from "@/lib/news/fallback-images";
import { summarize } from "@/lib/news/summarize";

type FetchResult = {
  ok: boolean;
  inserted: number;
  skipped: number;
  errors: { source?: string; message: string }[];
  details: any;
};

export const Route = createFileRoute("/api/public/hooks/news-fetch")({
  server: {
    handlers: {
      GET: async ({ request }) => runHandler(request),
      POST: async ({ request }) => runHandler(request),
    },
  },
});

async function runHandler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const forced = url.searchParams.get("force") === "1";
  const adminOverride = url.searchParams.get("count");
  const result = await runNewsFetch({ forced, count: adminOverride ? Number(adminOverride) : undefined });
  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 500,
    headers: { "Content-Type": "application/json" },
  });
}

async function runNewsFetch(opts: { forced?: boolean; count?: number }): Promise<FetchResult> {
  const errors: { source?: string; message: string }[] = [];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Read settings
  const { data: settingsRow } = await supabaseAdmin
    .from("news_settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const settings = settingsRow ?? { enabled: true, daily_count: 5 };
  const requested = Math.max(1, Math.min(20, opts.count ?? settings.daily_count ?? 5));

  if (!settings.enabled && !opts.forced) {
    const out: FetchResult = { ok: true, inserted: 0, skipped: 0, errors: [], details: { reason: "automation disabled" } };
    await logRun(supabaseAdmin, requested, out);
    return out;
  }

  // Idempotency: skip if we already ran today and posted enough auto items
  if (!opts.forced) {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const { count: postedToday } = await supabaseAdmin
      .from("quick_learn")
      .select("*", { count: "exact", head: true })
      .eq("auto_generated", true)
      .gte("created_at", startOfDay.toISOString());
    if ((postedToday ?? 0) >= requested) {
      const out: FetchResult = { ok: true, inserted: 0, skipped: 0, errors: [], details: { reason: "already filled", postedToday } };
      await logRun(supabaseAdmin, requested, out);
      return out;
    }
  }

  // Fetch feeds in parallel
  const feedFetches = await Promise.all(
    FEEDS.map(async (f) => {
      try {
        const res = await fetch(f.url, {
          headers: {
            "User-Agent": "ElectronicsJourneyNewsBot/1.0 (+https://electronicsjourney.lovable.app)",
            Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8",
          },
        });
        if (!res.ok) {
          errors.push({ source: f.name, message: `HTTP ${res.status}` });
          return { feed: f, items: [] as FeedItem[] };
        }
        const xml = await res.text();
        return { feed: f, items: parseFeed(xml).slice(0, 12) };
      } catch (e: any) {
        errors.push({ source: f.name, message: String(e?.message ?? e) });
        return { feed: f, items: [] as FeedItem[] };
      }
    }),
  );

  // Build candidate list (flat) with metadata
  type Candidate = {
    title: string;
    link: string;
    description: string;
    image?: string;
    category: string;
    sourceName: string;
    sourceUrl: string;
    pubDate: number;
  };

  const candidates: Candidate[] = [];
  for (const { feed, items } of feedFetches) {
    for (const it of items) {
      const cat = classify(`${it.title} ${it.description}`, feed.defaultCategory);
      const ts = Date.parse(it.pubDate || "");
      candidates.push({
        title: it.title,
        link: it.link,
        description: it.description,
        image: it.image,
        category: cat,
        sourceName: feed.name,
        sourceUrl: feed.site,
        pubDate: Number.isFinite(ts) ? ts : Date.now(),
      });
    }
  }

  // Sort newest first
  candidates.sort((a, b) => b.pubDate - a.pubDate);

  // Dedupe against existing original_url (case-insensitive)
  const urls = candidates.map((c) => c.link.toLowerCase());
  const { data: existing } = await supabaseAdmin
    .from("quick_learn")
    .select("original_url, title")
    .or(`original_url.in.(${urls.slice(0, 200).map((u) => `"${u.replace(/"/g, "")}"`).join(",")})`)
    .limit(500);
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  (existing ?? []).forEach((r: any) => {
    if (r.original_url) seenUrls.add(String(r.original_url).toLowerCase());
    if (r.title) seenTitles.add(String(r.title).toLowerCase());
  });

  // Round-robin by category to diversify
  const buckets = new Map<string, Candidate[]>();
  for (const c of candidates) {
    if (seenUrls.has(c.link.toLowerCase())) continue;
    if (seenTitles.has(c.title.toLowerCase())) continue;
    if (!buckets.has(c.category)) buckets.set(c.category, []);
    buckets.get(c.category)!.push(c);
  }
  const picked: Candidate[] = [];
  const cats = Array.from(buckets.keys());
  let safety = 0;
  while (picked.length < requested && cats.length && safety++ < 200) {
    let progressed = false;
    for (const cat of cats) {
      if (picked.length >= requested) break;
      const bucket = buckets.get(cat)!;
      const next = bucket.shift();
      if (next) { picked.push(next); progressed = true; }
    }
    if (!progressed) break;
  }

  // Insert picked items one by one (with per-item try/catch)
  let inserted = 0;
  let skipped = 0;
  const inserts: any[] = [];

  for (const c of picked) {
    try {
      const summary = await summarize({ title: c.title, description: c.description, source: c.sourceName });
      const image = c.image && /^https?:\/\//i.test(c.image) ? c.image : fallbackImage(c.category);
      const { error } = await supabaseAdmin.from("quick_learn").insert({
        title: c.title.slice(0, 280),
        body: summary,
        subtitle: null,
        category: c.category,
        image_url: image,
        source: c.sourceName,
        source_name: c.sourceName,
        source_url: c.sourceUrl,
        original_url: c.link,
        auto_generated: true,
        tags: [c.category, "news", "auto"],
        published_at: new Date(c.pubDate).toISOString(),
      });
      if (error) {
        // Most common: unique violation on original_url (race condition)
        if (/duplicate|unique/i.test(error.message)) {
          skipped++;
        } else {
          errors.push({ source: c.sourceName, message: error.message });
        }
      } else {
        inserted++;
        inserts.push({ title: c.title, source: c.sourceName, category: c.category });
      }
    } catch (e: any) {
      errors.push({ source: c.sourceName, message: String(e?.message ?? e) });
    }
  }

  // Persist last_run_at
  try {
    if (settingsRow?.id) {
      await supabaseAdmin
        .from("news_settings")
        .update({ last_run_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", settingsRow.id);
    }
  } catch {/* ignore */}

  const out: FetchResult = {
    ok: true,
    inserted,
    skipped,
    errors,
    details: { feeds: feedFetches.length, candidates: candidates.length, picked: picked.length, inserts },
  };
  await logRun(supabaseAdmin, requested, out);
  return out;
}

async function logRun(supabaseAdmin: any, requested: number, r: FetchResult) {
  try {
    await supabaseAdmin.from("news_run_logs").insert({
      requested,
      inserted: r.inserted,
      skipped: r.skipped,
      errors: r.errors,
      details: r.details,
    });
  } catch {/* ignore */}
}
