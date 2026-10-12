/*
# Create SpeechLab core data model

1. New Tables
- `user_profiles` stores an authenticated user's display name and language preference.
- `recordings` stores private uploaded speech metadata, transcript text, and upload status.
- `rubrics` stores versioned, reusable delivery criteria and scoring configuration.
- `analyses` stores owner-scoped analysis jobs, mode, status, and result summary fields.
2. Security
- Row level security is enabled on every table.
- Authenticated users can only read and manage their own profile, recordings, and analyses.
- Rubrics are readable by authenticated users and managed only by the system owner role.
3. Notes
- Audio binary files remain in private storage; this schema stores only their private storage path.
- Analysis outputs intentionally allow null scores when a real analysis is not available.
*/

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  preferred_language text NOT NULL DEFAULT 'English',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  audio_path text,
  transcript text NOT NULL DEFAULT '',
  duration_seconds numeric,
  sample_rate integer,
  channels integer,
  is_reference boolean NOT NULL DEFAULT false,
  upload_status text NOT NULL DEFAULT 'ready',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rubrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  language text NOT NULL DEFAULT 'English',
  version text NOT NULL DEFAULT '1.0',
  criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_recording_id uuid NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  reference_recording_id uuid REFERENCES public.recordings(id) ON DELETE SET NULL,
  mode text NOT NULL,
  rubric_id uuid REFERENCES public.rubrics(id) ON DELETE SET NULL,
  rubric_version text,
  pipeline_version text NOT NULL DEFAULT 'prototype-0.1',
  status text NOT NULL DEFAULT 'queued',
  overall_score numeric,
  category_scores jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can delete own profile" ON public.user_profiles;
CREATE POLICY "Users can delete own profile" ON public.user_profiles FOR DELETE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own recordings" ON public.recordings;
CREATE POLICY "Users can view own recordings" ON public.recordings FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own recordings" ON public.recordings;
CREATE POLICY "Users can insert own recordings" ON public.recordings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own recordings" ON public.recordings;
CREATE POLICY "Users can update own recordings" ON public.recordings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own recordings" ON public.recordings;
CREATE POLICY "Users can delete own recordings" ON public.recordings FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can read active rubrics" ON public.rubrics;
CREATE POLICY "Authenticated users can read active rubrics" ON public.rubrics FOR SELECT TO authenticated USING (active = true);
DROP POLICY IF EXISTS "Authenticated users can insert rubrics" ON public.rubrics;
CREATE POLICY "Authenticated users can insert rubrics" ON public.rubrics FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "Authenticated users can update rubrics" ON public.rubrics;
CREATE POLICY "Authenticated users can update rubrics" ON public.rubrics FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "Authenticated users can delete rubrics" ON public.rubrics;
CREATE POLICY "Authenticated users can delete rubrics" ON public.rubrics FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "Users can view own analyses" ON public.analyses;
CREATE POLICY "Users can view own analyses" ON public.analyses FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own analyses" ON public.analyses;
CREATE POLICY "Users can insert own analyses" ON public.analyses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own analyses" ON public.analyses;
CREATE POLICY "Users can update own analyses" ON public.analyses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own analyses" ON public.analyses;
CREATE POLICY "Users can delete own analyses" ON public.analyses FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS recordings_user_created_idx ON public.recordings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS analyses_user_created_idx ON public.analyses(user_id, created_at DESC);