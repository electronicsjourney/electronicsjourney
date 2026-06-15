
-- Extensions for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1) quick_learn additions
ALTER TABLE public.quick_learn
  ADD COLUMN IF NOT EXISTS auto_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_name text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS original_url text,
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;

-- Make author_id nullable so automation can post without a user
ALTER TABLE public.quick_learn ALTER COLUMN author_id DROP NOT NULL;

-- Drop & re-add FK as SET NULL so cascading user deletes don't wipe news
ALTER TABLE public.quick_learn DROP CONSTRAINT IF EXISTS quick_learn_author_id_fkey;
ALTER TABLE public.quick_learn
  ADD CONSTRAINT quick_learn_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Unique index on lowercased original_url for dedupe (partial)
CREATE UNIQUE INDEX IF NOT EXISTS quick_learn_original_url_unique
  ON public.quick_learn (lower(original_url))
  WHERE original_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS quick_learn_featured_idx
  ON public.quick_learn (featured, published_at DESC);

-- 2) news_settings (singleton)
CREATE TABLE IF NOT EXISTS public.news_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  daily_count int NOT NULL DEFAULT 5 CHECK (daily_count BETWEEN 1 AND 20),
  last_run_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.news_settings TO authenticated;
GRANT ALL ON public.news_settings TO service_role;
ALTER TABLE public.news_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "news_settings select admin" ON public.news_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "news_settings update admin" ON public.news_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "news_settings insert admin" ON public.news_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.news_settings (enabled, daily_count)
SELECT true, 5
WHERE NOT EXISTS (SELECT 1 FROM public.news_settings);

-- 3) news_run_logs
CREATE TABLE IF NOT EXISTS public.news_run_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  requested int NOT NULL DEFAULT 0,
  inserted int NOT NULL DEFAULT 0,
  skipped int NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT ON public.news_run_logs TO authenticated;
GRANT ALL ON public.news_run_logs TO service_role;
ALTER TABLE public.news_run_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "news_run_logs select admin" ON public.news_run_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS news_run_logs_run_at_idx
  ON public.news_run_logs (run_at DESC);
