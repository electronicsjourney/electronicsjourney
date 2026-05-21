
CREATE TABLE public.quick_learn_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.quick_learn(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quick_learn_comments_post ON public.quick_learn_comments(post_id, created_at);

ALTER TABLE public.quick_learn_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "QL comments viewable by all"
  ON public.quick_learn_comments FOR SELECT USING (true);

CREATE POLICY "Users insert own QL comments"
  ON public.quick_learn_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own QL comments"
  ON public.quick_learn_comments FOR DELETE
  USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.quick_learn_comments;
ALTER TABLE public.quick_learn_comments REPLICA IDENTITY FULL;
