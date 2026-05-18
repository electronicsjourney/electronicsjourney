
ALTER TABLE public.quick_learn 
  ADD COLUMN IF NOT EXISTS subtitle TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Restrict Quick Learn posting to admins only
DROP POLICY IF EXISTS "Authors create quick learn" ON public.quick_learn;
DROP POLICY IF EXISTS "Authors edit own quick learn" ON public.quick_learn;
DROP POLICY IF EXISTS "Authors delete own quick learn" ON public.quick_learn;

CREATE POLICY "Admins create quick learn"
ON public.quick_learn FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = author_id);

CREATE POLICY "Admins edit quick learn"
ON public.quick_learn FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete quick learn"
ON public.quick_learn FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS quick_learn_published_at_idx ON public.quick_learn(published_at DESC);
