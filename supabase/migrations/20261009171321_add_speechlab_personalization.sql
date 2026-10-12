/*
# Add SpeechLab personalization and practice planning

1. Profile additions
- `user_profiles` gains onboarding completion, goals, contexts, experience, coaching priorities, feedback preferences, practice cadence, event date, and free-text goal fields.
- These values are user-owned preferences and do not alter historical analyses or raw measurements.
2. New tables
- `user_preference_history` records meaningful preference changes with the source of the change.
- `practice_plans` stores a versioned, owner-scoped plan generated from preferences and available evidence.
- `practice_activities` stores ordered activities, instructions, targeted features, and explicit completion state.
- `recommendation_feedback` stores owner-scoped feedback on recommendations without deleting the underlying finding.
3. Security
- RLS is enabled on every new table.
- Authenticated users can only access rows where `user_id` matches their session.
- Profile and child-table write policies enforce ownership.
4. Integrity notes
- Preference history is append-only from the client: users can insert and read their own history, but cannot update or delete it.
- Practice activities remain separate from plans so opening an activity never implies completion.
*/

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS primary_goal text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS selected_contexts jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS experience_level text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS coaching_priorities jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS feedback_style text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS detail_level text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS practice_frequency text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS upcoming_event_date date;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS personal_goal text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.user_preference_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_name text NOT NULL,
  previous_value jsonb,
  new_value jsonb NOT NULL,
  source text NOT NULL DEFAULT 'user_edit',
  effective_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.practice_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  goal text NOT NULL,
  associated_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  rubric_id uuid REFERENCES public.rubrics(id) ON DELETE SET NULL,
  plan_version text NOT NULL DEFAULT '1.0',
  status text NOT NULL DEFAULT 'active',
  supporting_analysis_id uuid REFERENCES public.analyses(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.practice_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.practice_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  position integer NOT NULL,
  title text NOT NULL,
  instructions text NOT NULL,
  targeted_features jsonb NOT NULL DEFAULT '[]'::jsonb,
  estimated_minutes integer NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recommendation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id uuid REFERENCES public.analyses(id) ON DELETE SET NULL,
  finding_id uuid,
  practice_activity_id uuid REFERENCES public.practice_activities(id) ON DELETE SET NULL,
  feedback_type text NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preference_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own preference history" ON public.user_preference_history;
CREATE POLICY "Users can view own preference history" ON public.user_preference_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own preference history" ON public.user_preference_history;
CREATE POLICY "Users can insert own preference history" ON public.user_preference_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users cannot update preference history" ON public.user_preference_history;
CREATE POLICY "Users cannot update preference history" ON public.user_preference_history FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "Users cannot delete preference history" ON public.user_preference_history;
CREATE POLICY "Users cannot delete preference history" ON public.user_preference_history FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "Users can view own practice plans" ON public.practice_plans;
CREATE POLICY "Users can view own practice plans" ON public.practice_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own practice plans" ON public.practice_plans;
CREATE POLICY "Users can insert own practice plans" ON public.practice_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own practice plans" ON public.practice_plans;
CREATE POLICY "Users can update own practice plans" ON public.practice_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own practice plans" ON public.practice_plans;
CREATE POLICY "Users can delete own practice plans" ON public.practice_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own practice activities" ON public.practice_activities;
CREATE POLICY "Users can view own practice activities" ON public.practice_activities FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own practice activities" ON public.practice_activities;
CREATE POLICY "Users can insert own practice activities" ON public.practice_activities FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.practice_plans WHERE practice_plans.id = practice_activities.plan_id AND practice_plans.user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can update own practice activities" ON public.practice_activities;
CREATE POLICY "Users can update own practice activities" ON public.practice_activities FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.practice_plans WHERE practice_plans.id = practice_activities.plan_id AND practice_plans.user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can delete own practice activities" ON public.practice_activities;
CREATE POLICY "Users can delete own practice activities" ON public.practice_activities FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own recommendation feedback" ON public.recommendation_feedback;
CREATE POLICY "Users can view own recommendation feedback" ON public.recommendation_feedback FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own recommendation feedback" ON public.recommendation_feedback;
CREATE POLICY "Users can insert own recommendation feedback" ON public.recommendation_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own recommendation feedback" ON public.recommendation_feedback;
CREATE POLICY "Users can update own recommendation feedback" ON public.recommendation_feedback FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own recommendation feedback" ON public.recommendation_feedback;
CREATE POLICY "Users can delete own recommendation feedback" ON public.recommendation_feedback FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS preference_history_user_effective_idx ON public.user_preference_history(user_id, effective_at DESC);
CREATE INDEX IF NOT EXISTS practice_plans_user_updated_idx ON public.practice_plans(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS practice_activities_user_status_idx ON public.practice_activities(user_id, status, position);
CREATE INDEX IF NOT EXISTS recommendation_feedback_user_created_idx ON public.recommendation_feedback(user_id, created_at DESC);