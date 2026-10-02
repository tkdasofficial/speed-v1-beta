DROP VIEW public.secret_metadata;
CREATE POLICY "no client access" ON public.secrets FOR ALL TO authenticated USING (false) WITH CHECK (false);
REVOKE EXECUTE ON FUNCTION public.owns_project(uuid) FROM anon, public;