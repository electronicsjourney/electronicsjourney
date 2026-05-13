
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS difficulty TEXT,
  ADD COLUMN IF NOT EXISTS build_cost TEXT,
  ADD COLUMN IF NOT EXISTS build_time TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS components JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS content_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

UPDATE public.projects SET published_at = created_at WHERE published_at IS NULL AND status = 'published';

DROP POLICY IF EXISTS "Projects viewable by all" ON public.projects;
DROP POLICY IF EXISTS "Published projects viewable by all" ON public.projects;
CREATE POLICY "Published projects viewable by all"
  ON public.projects FOR SELECT
  USING (status = 'published' OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users upload to own folder in media" ON storage.objects;
DROP POLICY IF EXISTS "Users update own files in media" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own files in media" ON storage.objects;
DROP POLICY IF EXISTS "Media is publicly readable" ON storage.objects;

CREATE POLICY "Users upload to own folder in media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own files in media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own files in media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Media is publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');
