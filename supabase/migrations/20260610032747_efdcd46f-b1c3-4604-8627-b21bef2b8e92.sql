
DROP POLICY IF EXISTS "Anyone signed in can create quick learn" ON public.quick_learn;
DROP POLICY IF EXISTS "Authors or admins edit quick learn" ON public.quick_learn;
DROP POLICY IF EXISTS "Authors or admins delete quick learn" ON public.quick_learn;

CREATE POLICY "Only admins create quick learn" ON public.quick_learn
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins update quick learn" ON public.quick_learn
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins delete quick learn" ON public.quick_learn
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
