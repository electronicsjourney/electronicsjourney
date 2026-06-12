
-- Public read tables
GRANT SELECT ON public.projects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;

GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.quick_learn TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.quick_learn TO authenticated;
GRANT ALL ON public.quick_learn TO service_role;

GRANT SELECT ON public.project_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.project_comments TO authenticated;
GRANT ALL ON public.project_comments TO service_role;

GRANT SELECT ON public.project_likes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.project_likes TO authenticated;
GRANT ALL ON public.project_likes TO service_role;

GRANT SELECT ON public.project_bookmarks TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.project_bookmarks TO authenticated;
GRANT ALL ON public.project_bookmarks TO service_role;

GRANT SELECT ON public.quick_learn_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.quick_learn_comments TO authenticated;
GRANT ALL ON public.quick_learn_comments TO service_role;

GRANT SELECT ON public.quick_learn_likes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.quick_learn_likes TO authenticated;
GRANT ALL ON public.quick_learn_likes TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quick_learn_saves TO authenticated;
GRANT ALL ON public.quick_learn_saves TO service_role;

GRANT SELECT ON public.follows TO anon, authenticated;
GRANT INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
