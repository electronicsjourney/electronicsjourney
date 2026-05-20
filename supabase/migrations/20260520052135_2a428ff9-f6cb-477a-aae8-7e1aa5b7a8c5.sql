
-- Allow tags
ALTER TABLE public.quick_learn ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- Replace admin-only policies with author + admin policies
DROP POLICY IF EXISTS "Admins create quick learn" ON public.quick_learn;
DROP POLICY IF EXISTS "Admins edit quick learn" ON public.quick_learn;
DROP POLICY IF EXISTS "Admins delete quick learn" ON public.quick_learn;

CREATE POLICY "Anyone signed in can create quick learn"
ON public.quick_learn FOR INSERT
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors or admins edit quick learn"
ON public.quick_learn FOR UPDATE
USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authors or admins delete quick learn"
ON public.quick_learn FOR DELETE
USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));
