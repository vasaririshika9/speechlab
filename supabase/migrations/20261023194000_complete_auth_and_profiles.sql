/*
# SpeechLab Complete Authentication and Profile Automation Migration

1. Changes:
   - Adds `email` and `is_verified` columns to `user_profiles` if not present.
   - Adds automated function `public.handle_new_user()` to automatically populate `public.user_profiles` when a user signs up in `auth.users`.
   - Creates `on_auth_user_created` trigger on `auth.users`.
   - Ensures strict Row Level Security (RLS) on `user_profiles` so users can only read and modify their own records.
2. Security:
   - Security Definer trigger guarantees identity synchronization without granting broad client write permissions.
   - Users can only query their own verified profile data (`auth.uid() = id`).
*/

-- 1. Ensure user_profiles table has email, verification and timestamp fields
ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Create the trigger function to automatically create profile on sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name, is_verified, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), user_profiles.display_name),
      is_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, user_profiles.is_verified),
      updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 3. Bind trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Verify Row Level Security policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" 
  ON public.user_profiles FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" 
  ON public.user_profiles FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" 
  ON public.user_profiles FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);
