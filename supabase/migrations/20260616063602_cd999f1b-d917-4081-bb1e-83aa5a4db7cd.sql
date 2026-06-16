ALTER TABLE public.quick_learn
  ADD COLUMN IF NOT EXISTS image_type TEXT,
  ADD COLUMN IF NOT EXISTS image_source_name TEXT;