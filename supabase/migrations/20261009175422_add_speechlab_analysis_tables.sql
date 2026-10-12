/*
# Add SpeechLab analysis evidence, processing jobs, and rubric templates

1. New Tables
- `findings` stores timestamped, evidence-grounded findings linked to an analysis.
- `feature_measurements` stores individual acoustic measurements linked to an analysis.
- `processing_jobs` tracks the lifecycle of an analysis job through stages.
- Rubric template rows are seeded for common speaking contexts.
2. Security
- RLS enabled on all new tables with owner-scoped policies.
3. Notes
- Findings and measurements reference analyses via foreign key; ownership enforced transitively.
*/

CREATE TABLE IF NOT EXISTS public.findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  title text NOT NULL,
  start_time numeric,
  end_time numeric,
  observed_value text,
  expected_range text,
  confidence text,
  interpretation text,
  exercise text,
  detection_method text NOT NULL DEFAULT 'prototype-rubric-0.1',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feature_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name text NOT NULL,
  start_time numeric,
  end_time numeric,
  measured_value numeric,
  units text,
  reliability text,
  extraction_method text NOT NULL DEFAULT 'prototype-0.1',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'queued',
  status text NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  error_code text,
  error_message text,
  external_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own findings" ON public.findings;
CREATE POLICY "Users can view own findings" ON public.findings FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own findings" ON public.findings;
CREATE POLICY "Users can insert own findings" ON public.findings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own findings" ON public.findings;
CREATE POLICY "Users can update own findings" ON public.findings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own findings" ON public.findings;
CREATE POLICY "Users can delete own findings" ON public.findings FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own measurements" ON public.feature_measurements;
CREATE POLICY "Users can view own measurements" ON public.feature_measurements FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own measurements" ON public.feature_measurements;
CREATE POLICY "Users can insert own measurements" ON public.feature_measurements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own measurements" ON public.feature_measurements;
CREATE POLICY "Users can update own measurements" ON public.feature_measurements FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own measurements" ON public.feature_measurements;
CREATE POLICY "Users can delete own measurements" ON public.feature_measurements FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own processing jobs" ON public.processing_jobs;
CREATE POLICY "Users can view own processing jobs" ON public.processing_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own processing jobs" ON public.processing_jobs;
CREATE POLICY "Users can insert own processing jobs" ON public.processing_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own processing jobs" ON public.processing_jobs;
CREATE POLICY "Users can update own processing jobs" ON public.processing_jobs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own processing jobs" ON public.processing_jobs;
CREATE POLICY "Users can delete own processing jobs" ON public.processing_jobs FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS findings_analysis_idx ON public.findings(analysis_id, created_at);
CREATE INDEX IF NOT EXISTS measurements_analysis_idx ON public.feature_measurements(analysis_id, feature_name);
CREATE INDEX IF NOT EXISTS processing_jobs_analysis_idx ON public.processing_jobs(analysis_id, status);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.rubrics WHERE name = 'Job interview delivery' AND version = '1.0') THEN
    INSERT INTO public.rubrics (name, description, language, version, criteria, active) VALUES
      ('Job interview delivery', 'Delivery criteria for interview-style speaking: clarity, pacing, and confident phrasing.', 'English', '1.0', '[{"criterion":"Pacing","measurement":"Speech rate in aligned windows","preferred_range":"120-180 wpm","auto_evaluated":true},{"criterion":"Pauses","measurement":"Pause interval and placement","preferred_range":"0.3-1.2 s","auto_evaluated":true},{"criterion":"Pitch variation","measurement":"F0 range where reliably estimated","preferred_range":"context-dependent","auto_evaluated":false},{"criterion":"Clarity","measurement":"Not scored without validated method","preferred_range":"N/A","auto_evaluated":false}]'::jsonb, true),
      ('Classroom presentation', 'Criteria for academic presentation delivery: structured pacing and clear emphasis.', 'English', '1.0', '[{"criterion":"Pacing","measurement":"Speech rate in aligned windows","preferred_range":"110-170 wpm","auto_evaluated":true},{"criterion":"Pauses","measurement":"Pause interval at phrase boundaries","preferred_range":"0.3-0.9 s","auto_evaluated":true},{"criterion":"Emphasis","measurement":"Pitch movement on key terms","preferred_range":"context-dependent","auto_evaluated":false},{"criterion":"Clarity","measurement":"Not scored without validated method","preferred_range":"N/A","auto_evaluated":false}]'::jsonb, true),
      ('Declamation', 'Criteria for interpreted oral performance: controlled phrasing and expressive delivery.', 'English', '1.0', '[{"criterion":"Pacing","measurement":"Speech rate variation across passages","preferred_range":"context-dependent","auto_evaluated":true},{"criterion":"Pauses","measurement":"Intentional pause placement","preferred_range":"context-dependent","auto_evaluated":true},{"criterion":"Pitch variation","measurement":"F0 range and contour shape","preferred_range":"context-dependent","auto_evaluated":false},{"criterion":"Energy","measurement":"RMS energy variation","preferred_range":"context-dependent","auto_evaluated":false}]'::jsonb, true),
      ('Persuasive speaking', 'Criteria for persuasive delivery: varied rate, strategic pauses, and vocal emphasis.', 'English', '1.0', '[{"criterion":"Pacing","measurement":"Speech rate in aligned windows","preferred_range":"130-190 wpm","auto_evaluated":true},{"criterion":"Pauses","measurement":"Strategic pause before key points","preferred_range":"0.5-1.5 s","auto_evaluated":true},{"criterion":"Emphasis","measurement":"Pitch and energy on persuasive markers","preferred_range":"context-dependent","auto_evaluated":false},{"criterion":"Clarity","measurement":"Not scored without validated method","preferred_range":"N/A","auto_evaluated":false}]'::jsonb, true),
      ('Extemporaneous speech', 'Criteria for limited-preparation speaking: clear structure and steady pacing.', 'English', '1.0', '[{"criterion":"Pacing","measurement":"Speech rate consistency","preferred_range":"120-170 wpm","auto_evaluated":true},{"criterion":"Pauses","measurement":"Hesitation vs intentional pauses","preferred_range":"context-dependent","auto_evaluated":true},{"criterion":"Filler detection","measurement":"Not scored without validated method","preferred_range":"N/A","auto_evaluated":false},{"criterion":"Clarity","measurement":"Not scored without validated method","preferred_range":"N/A","auto_evaluated":false}]'::jsonb, true),
      ('General public speaking', 'Baseline delivery criteria applicable across most speaking contexts.', 'English', '1.0', '[{"criterion":"Pacing","measurement":"Speech rate in aligned windows","preferred_range":"120-180 wpm","auto_evaluated":true},{"criterion":"Pauses","measurement":"Pause interval and local context","preferred_range":"0.3-1.2 s","auto_evaluated":true},{"criterion":"Pitch variation","measurement":"Voiced F0 movement where reliable","preferred_range":"context-dependent","auto_evaluated":false},{"criterion":"Energy","measurement":"RMS energy consistency","preferred_range":"context-dependent","auto_evaluated":false}]'::jsonb, true);
  END IF;
END $$;
