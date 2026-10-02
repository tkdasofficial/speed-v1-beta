CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text CHECK (char_length(display_name) <= 100),
  avatar_url text CHECK (char_length(avatar_url) <= 2048),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name) VALUES (NEW.id, left(coalesce(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), 100));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9-]{1,120}$'),
  description text CHECK (char_length(description) <= 2000),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','building','error')),
  current_version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);
CREATE INDEX ON public.projects(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own projects" ON public.projects FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.owns_project(_project_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.projects WHERE id = _project_id AND user_id = auth.uid())
$$;

CREATE TABLE public.project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_path text NOT NULL CHECK (char_length(file_path) BETWEEN 1 AND 1024),
  file_name text NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 255),
  drive_file_id text CHECK (char_length(drive_file_id) <= 255),
  mime_type text CHECK (char_length(mime_type) <= 255),
  size_bytes bigint CHECK (size_bytes >= 0),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, file_path)
);
CREATE INDEX ON public.project_files(project_id);

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text CHECK (char_length(title) <= 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.conversations(project_id);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content text NOT NULL CHECK (char_length(content) <= 100000),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.messages(conversation_id, created_at);
CREATE INDEX ON public.messages(project_id);

CREATE TABLE public.generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  model text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','succeeded','failed','cancelled')),
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz, finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.generations(project_id);

CREATE TABLE public.ai_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  generation_id uuid REFERENCES public.generations(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('code_generation','file_modification','dependency_install','terminal_exec','debugging','project_analysis')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','succeeded','failed','cancelled')),
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  started_at timestamptz, finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.ai_tasks(project_id);
CREATE INDEX ON public.ai_tasks(generation_id);

CREATE TABLE public.runtime_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  workflow_id text, run_id text, job_id text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed','cancelled')),
  exit_code integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz, ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.runtime_sessions(project_id);

CREATE TABLE public.runtime_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.runtime_sessions(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stream text NOT NULL DEFAULT 'stdout' CHECK (stream IN ('stdout','stderr','system')),
  line text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.runtime_logs(session_id, id);

CREATE TABLE public.project_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  label text CHECK (char_length(label) <= 200),
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, version_number)
);

CREATE TABLE public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE CHECK (provider IN ('supabase','firebase')),
  name text NOT NULL,
  description text,
  is_available boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.integrations (provider, name, description, is_available) VALUES
 ('supabase','Supabase','Database, auth and storage', true),
 ('firebase','Firebase','Coming soon', false);

CREATE TABLE public.project_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  integration_id uuid NOT NULL REFERENCES public.integrations(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','connected','error','revoked')),
  external_ref text CHECK (char_length(external_ref) <= 255),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, integration_id)
);

-- Secrets: encrypted server-side (AES-256-GCM); no client access at all
CREATE TABLE public.secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  project_integration_id uuid REFERENCES public.project_integrations(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (name ~ '^[A-Za-z_][A-Za-z0-9_]{0,127}$'),
  ciphertext text NOT NULL,
  iv text NOT NULL,
  key_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX secrets_scope_name ON public.secrets (user_id, coalesce(project_id,'00000000-0000-0000-0000-000000000000'::uuid), name);
GRANT ALL ON public.secrets TO service_role;
ALTER TABLE public.secrets ENABLE ROW LEVEL SECURITY;

-- Safe metadata view of own secrets (no ciphertext)
CREATE VIEW public.secret_metadata WITH (security_invoker = false) AS
  SELECT id, project_id, project_integration_id, name, created_at, updated_at FROM public.secrets WHERE user_id = auth.uid();
GRANT SELECT ON public.secret_metadata TO authenticated;

-- Grants + RLS for project-scoped tables
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['project_files','conversations','messages','generations','ai_tasks','runtime_sessions','runtime_logs','project_versions','project_integrations'] LOOP
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('CREATE POLICY "owner read" ON public.%I FOR SELECT TO authenticated USING (public.owns_project(project_id))', t);
  END LOOP;
  -- Tables users may write directly; runtime, generations, tasks and integrations are written by the server only
  FOREACH t IN ARRAY ARRAY['project_files','conversations','messages','project_versions'] LOOP
    EXECUTE format('GRANT INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('CREATE POLICY "owner insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.owns_project(project_id))', t);
    EXECUTE format('CREATE POLICY "owner update" ON public.%I FOR UPDATE TO authenticated USING (public.owns_project(project_id)) WITH CHECK (public.owns_project(project_id))', t);
    EXECUTE format('CREATE POLICY "owner delete" ON public.%I FOR DELETE TO authenticated USING (public.owns_project(project_id))', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['profiles','projects','project_files','conversations','messages','generations','ai_tasks','runtime_sessions','runtime_logs','project_versions','integrations','project_integrations','secrets'] LOOP
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
  END LOOP;
END $$;

-- Messages must belong to a conversation in the same project
CREATE OR REPLACE FUNCTION public.check_message_project() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.conversations WHERE id = NEW.conversation_id AND project_id = NEW.project_id) THEN
    RAISE EXCEPTION 'conversation does not belong to project';
  END IF; RETURN NEW;
END; $$;
CREATE TRIGGER messages_project_check BEFORE INSERT OR UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.check_message_project();

GRANT SELECT ON public.integrations TO anon, authenticated;
GRANT ALL ON public.integrations TO service_role;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catalog readable" ON public.integrations FOR SELECT TO anon, authenticated USING (true);

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;