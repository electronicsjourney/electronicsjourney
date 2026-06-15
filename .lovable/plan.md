# Automated Quick Learn News Engine

## 1. Database changes (one migration)

Extend `quick_learn` and add a settings + log table.

- `quick_learn`: add `auto_generated boolean default false`, `source_name text`, `source_url text`, `original_url text unique`, `featured boolean default false`, `category text` (if not present).
- `news_settings` (singleton row): `enabled bool`, `daily_count int default 5`, `last_run_at timestamptz`.
- `news_run_logs`: `id`, `run_at`, `requested`, `inserted`, `skipped`, `errors jsonb`, `details jsonb`.
- RLS: `quick_learn` already covered. `news_settings` + `news_run_logs` readable/writable only by admins via `has_role(auth.uid(),'admin')`. Service role full access for cron route.
- Unique index on `lower(original_url)` to block duplicates.

## 2. News fetcher (server route, public/cron callable)

Create `src/routes/api/public/hooks/news-fetch.ts`:

- POST handler. Verifies caller via Supabase `apikey` header (the project's anon key) — standard pg_cron pattern. Idempotent: skips if already ran today and the requested count is filled.
- Reads `news_settings`. If `enabled=false`, exits with a log entry.
- Fetches a curated set of RSS feeds (Arduino, Raspberry Pi, Espressif, NVIDIA, Intel, OpenAI, Hackaday, IEEE Spectrum, AnandTech, SemiEngineering) using `fetch` + a tiny inline RSS/Atom parser (no native deps — Worker-safe).
- For each item: extract title, link, pubDate, description, enclosure/media:content image, source name. Classify into one of the fixed categories by keyword matching on title+description+source.
- De-dupe against `quick_learn.original_url` (case-insensitive) and recent titles.
- Pick the top N (default 5) most recent unseen items, balanced across categories (round-robin per category).
- For each pick: generate a 50–120 word beginner-friendly summary via Lovable AI Gateway (`google/gemini-2.5-flash`, free tier). Fallback to source description trimmed if AI call fails.
- Insert into `quick_learn` with `auto_generated=true`, attribution fields, category, image URL (or category fallback from a static map of licensed Unsplash URLs), `user_id` = a designated "Electronics Journey News" system profile (created in migration; `is_system=true` on profiles).
- Wrap each item in try/catch; collect successes/failures into `news_run_logs`. Returns JSON summary.

Retry: route accepts `?retry=1` to top up only the missing count for today.

## 3. Daily cron

Insert (via supabase insert tool, not migration) a pg_cron job that POSTs to `https://project--7d5fb99a-73ed-451c-95fa-0a25019514fe.lovable.app/api/public/hooks/news-fetch` once per day at 06:00 UTC with the anon key in `apikey`.

## 4. UX — Quick Learn feed

- `quick-learn.tsx` cards: when `auto_generated`, render a small "News · {source_name}" badge and a "Read original →" link (`original_url`) alongside existing actions. Otherwise unchanged. Featured posts get a subtle highlight + sort to top.
- Filters already include category; ensure new categories appear.

## 5. Admin panel additions (`/admin`)

New "News Automation" section (admin-gated):
- Toggle automation on/off.
- Number input for daily count (1–10).
- "Run now" button → calls the route.
- Recent runs table from `news_run_logs` (last 20).
- Imported posts table: list `auto_generated=true` posts with Edit / Delete / Feature toggle. Edit opens a small dialog (title, summary, category, image, original_url).

## 6. PDF code copy — fix the "redirect" complaint

Current behavior: each code block's pill links to `/copy?c=<base64 of full code>`. User sees a redirect. Two improvements:

- The copy URL is built from `window.location.origin` at generation time, so PDFs made from the preview link sent users to the preview domain. Switch to the stable published origin (`https://electronicsjourney.lovable.app`) so the copy page always loads on the live site regardless of where the PDF was generated.
- Encode the **entire** code once and use the same URL on every chunk of a multi-page block (already done — verify and add a comment so it isn't regressed). The `/copy` page already auto-copies on load and shows "Copied" instantly, then user can close the tab — a single click does copy the full code. We'll also auto-close the tab on successful auto-copy after 600ms so it feels like an in-place action rather than a navigation.
- For very long code (URL > 7000 chars), fall back to a hash fragment (`#c=...`) which avoids server URL limits.

## Files

- `supabase/migrations/<ts>_news_engine.sql` (new)
- `src/routes/api/public/hooks/news-fetch.ts` (new)
- `src/lib/news/feeds.ts`, `src/lib/news/parser.ts`, `src/lib/news/categorize.ts`, `src/lib/news/summarize.ts`, `src/lib/news/fallback-images.ts` (new helpers)
- `src/routes/quick-learn.tsx` (edit — show attribution + featured)
- `src/routes/admin.tsx` (edit — news automation section)
- `src/lib/project-pdf.ts` (edit — stable copy URL + hash fallback)
- `src/routes/copy.tsx` (edit — auto-close on success, read hash too)
- pg_cron insert (via insert tool after route deploys)

## Notes

- Uses Lovable AI Gateway (no extra key) for summaries.
- No new user-facing secrets required.
- All schedule + fetching code is Worker-safe (no `child_process`, `sharp`, `fs.watch`).
- Existing Quick Learn user flow is untouched; automated posts share the same table and just carry extra flags.
